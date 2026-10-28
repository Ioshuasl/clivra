import { timingSafeEqual } from 'node:crypto';
import { getPatientById } from '../../../patients/patients_public.js';
import { PatientSignAction } from '../../actions/signature_request/signature_request_patient_sign.action.js';
import { CODE_MAX_ATTEMPTS, hashSignatureCode } from '../../helpers/signature_code.helper.js';
import {
  SignatureCodeExpiredError,
  SignatureCodeInvalidError,
  SignatureCodeRequiredError,
  SignatureLinkNotFoundError,
  SignatureTooManyAttemptsError,
} from '../../models/errors/documents.errors.js';
import { RegisterAttemptRepository } from '../../repositories/signature_request/signature_request_register_attempt.repository.js';
import type { PublicSignatureSignSchema } from '../../schemas/signature_request.schema.js';
import type { PublicSignResult } from '../../types/signature_request/signature_request.types.js';
import { LoadService, type LoadedSignatureRequest } from './signature_request_public_load.service.js';

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export class PublicSignService {
  constructor(
    private readonly load = new LoadService(),
    private readonly registerAttempt = new RegisterAttemptRepository(),
    private readonly signAction = new PatientSignAction(),
  ) {}

  async execute(
    traceId: string,
    rawToken: string,
    signSchema: PublicSignatureSignSchema,
    meta: { ip?: string; userAgent?: string },
  ): Promise<PublicSignResult> {
    const loaded = await this.load.execute(traceId, rawToken);
    const { ctx, request, document } = loaded;

    const codeVerified = request.method === 'WHATSAPP_CODE';
    if (codeVerified) await this.checkCode(loaded, signSchema.code);

    const patient = await getPatientById(ctx, document.patientId);
    if (!patient) throw new SignatureLinkNotFoundError();

    const { signedAt } = await this.signAction.execute(ctx, {
      request,
      document,
      patientName: patient.name,
      codeVerified,
      meta,
    });
    return { signedAt: signedAt.toISOString() };
  }

  private async checkCode({ ctx, request }: LoadedSignatureRequest, code: string | undefined): Promise<void> {
    if (!request.codeHash || !request.codeExpiresAt || !code) throw new SignatureCodeRequiredError();
    if (request.codeAttempts >= CODE_MAX_ATTEMPTS) throw new SignatureTooManyAttemptsError();
    if (request.codeExpiresAt.getTime() < Date.now()) throw new SignatureCodeExpiredError();

    if (sameHash(request.codeHash, hashSignatureCode(request.id, code))) return;

    const attempts = await this.registerAttempt.execute(ctx, request.id);
    if (attempts >= CODE_MAX_ATTEMPTS) throw new SignatureTooManyAttemptsError();
    throw new SignatureCodeInvalidError(CODE_MAX_ATTEMPTS - attempts);
  }
}
