import type { RequestContext } from '../../shared/domain/request_context.js';
import type { DbTransaction } from '../../shared/database/db_transaction.js';
import { getTenantPrisma } from '../../shared/database/tenant_prisma.js';
import { AppError } from '../../shared/middlewares/error_handler.middleware.js';
import { assertPatientName, toE164Br } from './helpers/patient.helper.js';
import { InvalidPatientNameError } from './models/errors/patients.errors.js';
import { CreateAction } from './actions/patient/patient_create.action.js';
import {
  CreateConsentRepository,
  FindByPhoneRepository,
  GetDefaultUnitRepository,
  GetPatientRepository,
  ListConsentsRepository,
} from './repositories/patient/patient.repository.js';
import { SetOverdueRepository } from './repositories/patient/patient_set_overdue.repository.js';
import { RevokeMarketingConsentRepository } from './repositories/patient/patient_revoke_marketing_consent.repository.js';
import { AnonymizeRepository, type AnonymizePatientResult } from './repositories/patient/patient_anonymize.repository.js';
import { GetService } from './services/patient/patient_get.service.js';
import type { PatientDetail } from './types/patients.types.js';

const getPatient = new GetService();
const listConsents = new ListConsentsRepository();
const findByPhone = new FindByPhoneRepository();
const getDefaultUnit = new GetDefaultUnitRepository();
const createPatient = new CreateAction();
const getPatientRepo = new GetPatientRepository();
const createConsent = new CreateConsentRepository();
const setOverdue = new SetOverdueRepository();
const revokeMarketing = new RevokeMarketingConsentRepository();
const anonymizePatientRepo = new AnonymizeRepository();

const PUBLIC_CONSENT_VERSION = 'v1';

/** Leitura de paciente para outros BCs (scheduling, messaging, …). */
export async function getPatientById(ctx: RequestContext, patientId: string) {
  return getPatient.execute(ctx, patientId);
}

/** Resolve paciente por telefone E.164 (webhook WhatsApp). */
export async function findPatientIdByPhone(
  ctx: RequestContext,
  phone: string,
): Promise<string | null> {
  const e164 = toE164Br(phone);
  const exact = await findByPhone.execute(ctx, e164);
  if (exact[0]?.id) return exact[0].id;
  const national = e164.startsWith('55') && e164.length >= 12 ? e164.slice(2) : e164;
  if (national === e164) return null;
  const local = await findByPhone.execute(ctx, national);
  return local[0]?.id ?? null;
}

/** Consentimento de marketing ativo? (messaging — RF-E3-08). */
export async function hasMarketingConsent(
  ctx: RequestContext,
  patientId: string,
): Promise<boolean> {
  const consents = await listConsents.execute(ctx, patientId);
  return consents.some(
    (c) => c.type === 'WHATSAPP_MARKETING' && c.granted && !c.revokedAt,
  );
}

export type PublicBookingPatientInput = {
  name: string;
  phone: string;
  email?: string | null;
};

export type PublicBookingPatientResult = {
  patient: PatientDetail;
  needsDataReview: boolean;
};

/** Dedupe por telefone E.164; cria com origin PUBLIC_BOOKING se não existir. */
export async function findOrCreateFromPublicBooking(
  ctx: RequestContext,
  input: PublicBookingPatientInput,
): Promise<PublicBookingPatientResult> {
  try {
    assertPatientName(input.name);
  } catch {
    throw new InvalidPatientNameError();
  }

  const name = input.name.trim().replace(/\s+/g, ' ');
  const phone = toE164Br(input.phone);
  if (phone.length < 12) {
    throw new AppError('VALIDATION_ERROR', 'Telefone inválido.', 400);
  }

  const matches = await findByPhone.execute(ctx, phone);
  const existingId = matches[0]?.id;
  if (existingId) {
    const patient = await getPatientRepo.execute(ctx, existingId);
    if (!patient) throw new AppError('NOT_FOUND', 'Paciente não encontrado.', 404);
    const needsDataReview = normalizeName(patient.name) !== normalizeName(name);
    return { patient, needsDataReview };
  }

  const unitId = await getDefaultUnit.execute(ctx);
  if (!unitId) {
    throw new AppError('VALIDATION_ERROR', 'Unidade padrão não encontrada.', 400);
  }

  const patient = await createPatient.execute(
    ctx,
    {
      unitId,
      name,
      phonePrimary: phone,
      email: input.email ?? null,
      origin: 'PUBLIC_BOOKING',
    },
    [],
  );
  return { patient, needsDataReview: false };
}

export type PublicBookingConsentsInput = {
  consentDataProcessing: boolean;
  consentTerms: boolean;
  consentWhatsappMarketing: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function grantPublicBookingConsents(
  ctx: RequestContext,
  patientId: string,
  consents: PublicBookingConsentsInput,
): Promise<void> {
  const channel = 'PUBLIC_BOOKING';
  const meta = { ipAddress: consents.ipAddress, userAgent: consents.userAgent };
  await createConsent.execute(
    ctx,
    patientId,
    {
      type: 'DATA_PROCESSING',
      granted: consents.consentDataProcessing,
      documentVersion: PUBLIC_CONSENT_VERSION,
      channel,
      ...meta,
    },
  );
  await createConsent.execute(
    ctx,
    patientId,
    {
      type: 'TERMS',
      granted: consents.consentTerms,
      documentVersion: PUBLIC_CONSENT_VERSION,
      channel,
      ...meta,
    },
  );
  await createConsent.execute(
    ctx,
    patientId,
    {
      type: 'WHATSAPP_MARKETING',
      granted: consents.consentWhatsappMarketing,
      documentVersion: PUBLIC_CONSENT_VERSION,
      channel,
      ...meta,
    },
  );
}

export { toE164Br, isMinor, digitsOnly } from './helpers/patient.helper.js';
export type { PatientDetail, PatientSummary } from './types/patients.types.js';

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export async function setPatientHasOverdue(
  ctx: RequestContext,
  patientId: string,
  hasOverdue: boolean,
  tx?: DbTransaction,
): Promise<void> {
  if (tx) {
    await setOverdue.executeInTx(tx, patientId, hasOverdue);
    return;
  }
  await getTenantPrisma().runInTenantContext(ctx, (inner) =>
    setOverdue.executeInTx(inner, patientId, hasOverdue),
  );
}

/** Revoga marketing (WhatsApp). Comunicação transacional permanece. Idempotente. */
export async function revokeMarketingConsent(
  ctx: RequestContext,
  patientId: string,
  tx?: DbTransaction,
): Promise<void> {
  if (tx) {
    await revokeMarketing.executeInTx(tx, ctx, patientId);
    return;
  }
  await revokeMarketing.execute(ctx, patientId);
}

export type { AnonymizePatientResult };

/** Substitui identificadores diretos; prontuário permanece. Idempotente. */
export async function anonymizePatient(
  ctx: RequestContext,
  patientId: string,
  tx?: DbTransaction,
): Promise<AnonymizePatientResult> {
  if (tx) return anonymizePatientRepo.executeInTx(tx, ctx, patientId);
  return anonymizePatientRepo.execute(ctx, patientId);
}
