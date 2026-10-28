import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getProfessionalByMembershipId } from '../../../clinic/clinic_public.js';
import { GetRepository } from '../../repositories/certificate/certificate_get.repository.js';
import type { CertificateMe } from '../../types/certificate/certificate.types.js';

export class GetService {
  constructor(private readonly getCertificate = new GetRepository()) {}

  /** Usuário sem cadastro de profissional recebe `professionalId: null` (a tela esconde o cartão). */
  async execute(ctx: RequestContext): Promise<CertificateMe> {
    const professional = ctx.membershipId
      ? await getProfessionalByMembershipId(ctx, ctx.membershipId)
      : null;
    if (!professional) return { professionalId: null, certificate: null };
    return {
      professionalId: professional.id,
      certificate: await this.getCertificate.execute(ctx, professional.id),
    };
  }
}
