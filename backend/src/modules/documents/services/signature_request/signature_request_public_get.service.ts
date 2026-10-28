import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { getPatientById } from '../../../patients/patients_public.js';
import { SignatureLinkNotFoundError } from '../../models/errors/documents.errors.js';
import type { PublicSignatureView } from '../../types/signature_request/signature_request.types.js';
import { LoadService } from './signature_request_public_load.service.js';

export class PublicGetService {
  constructor(private readonly load = new LoadService()) {}

  async execute(traceId: string, rawToken: string): Promise<PublicSignatureView> {
    const { ctx, request, document } = await this.load.execute(traceId, rawToken);
    const [catalog, patient] = await Promise.all([
      getPublicClinicCatalog(ctx),
      getPatientById(ctx, document.patientId),
    ]);
    if (!patient) throw new SignatureLinkNotFoundError();
    return {
      clinicName: catalog?.name ?? 'Clínica',
      patientFirstName: patient.name.split(/\s+/)[0] ?? patient.name,
      method: request.method,
      document: { title: document.title, content: document.content },
      expiresAt: request.expiresAt.toISOString(),
    };
  }
}
