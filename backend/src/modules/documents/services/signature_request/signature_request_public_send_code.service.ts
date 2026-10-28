import { getPatientById } from '../../../patients/patients_public.js';
import { SendCodeAction } from '../../actions/signature_request/signature_request_send_code.action.js';
import {
  SignatureLinkNotFoundError,
  SignatureNotRequestedError,
} from '../../models/errors/documents.errors.js';
import type { PublicSendCodeResult } from '../../types/signature_request/signature_request.types.js';
import { LoadService } from './signature_request_public_load.service.js';

export class PublicSendCodeService {
  constructor(
    private readonly load = new LoadService(),
    private readonly sendCode = new SendCodeAction(),
  ) {}

  async execute(traceId: string, rawToken: string): Promise<PublicSendCodeResult> {
    const { ctx, request, document } = await this.load.execute(traceId, rawToken);
    if (request.method !== 'WHATSAPP_CODE') {
      throw new SignatureNotRequestedError('Esta assinatura não usa código.');
    }
    const patient = await getPatientById(ctx, document.patientId);
    if (!patient) throw new SignatureLinkNotFoundError();
    return this.sendCode.execute(ctx, {
      requestId: request.id,
      patient: { id: patient.id, email: patient.email, phonePrimary: patient.phonePrimary },
    });
  }
}
