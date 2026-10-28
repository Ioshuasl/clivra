import type { RequestContext } from '../../../../shared/domain/request_context.js';
import {
  getClinicLetterhead,
  getProfessionalById,
  getProfessionalByMembershipId,
} from '../../../clinic/clinic_public.js';
import { getPatientById } from '../../../patients/patients_public.js';
import { buildDocumentVariables } from '../../helpers/document_variables.helper.js';
import {
  DocumentPatientNotFoundError,
  DocumentProfessionalRequiredError,
} from '../../models/errors/documents.errors.js';
import type { QuoteContractData } from '../../types/quote_contract/quote_contract.types.js';
import type { DocumentVariablesBuilt } from '../../types/document/document_variables.types.js';

/** Reúne paciente, profissional e timbrado da clínica e monta os campos automáticos. */
export class BuildVariablesService {
  async execute(
    ctx: RequestContext,
    patientId: string,
    professionalId?: string,
    quote?: QuoteContractData,
  ): Promise<DocumentVariablesBuilt> {
    const patient = await getPatientById(ctx, patientId);
    if (!patient) throw new DocumentPatientNotFoundError();

    const professional = professionalId
      ? await getProfessionalById(ctx, professionalId)
      : ctx.membershipId
        ? await getProfessionalByMembershipId(ctx, ctx.membershipId)
        : null;
    if (!professional) throw new DocumentProfessionalRequiredError();

    const letterhead = await getClinicLetterhead(ctx, patient.unitId);

    const variables = buildDocumentVariables({
      patientName: patient.name,
      patientCpf: patient.cpf,
      patientBirthDate: patient.birthDate,
      clinicName: letterhead?.name ?? '',
      clinicTaxId: letterhead?.taxId ?? null,
      professionalName: professional.name,
      professionalCro: professional.croNumber,
      professionalCroState: professional.croState,
      timezone: letterhead?.timezone ?? 'America/Sao_Paulo',
      now: new Date(),
      quote,
    });

    return {
      variables,
      timezone: letterhead?.timezone ?? 'America/Sao_Paulo',
      patient: { id: patient.id, name: patient.name },
      professional: {
        id: professional.id,
        name: professional.name,
        cro: professional.croNumber
          ? [professional.croNumber, professional.croState].filter(Boolean).join('/')
          : null,
      },
      letterhead: {
        clinicName: letterhead?.name ?? '',
        legalName: letterhead?.legalName ?? null,
        taxId: letterhead?.taxId ?? null,
        phone: letterhead?.phone ?? null,
        addressLine: letterhead?.addressLine ?? null,
      },
    };
  }
}
