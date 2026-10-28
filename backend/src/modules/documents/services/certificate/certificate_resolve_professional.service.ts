import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getProfessionalByMembershipId } from '../../../clinic/clinic_public.js';
import { CertificateNotProfessionalError } from '../../models/errors/documents.errors.js';

/** O certificado é pessoal: pertence ao profissional do usuário logado. */
export class ResolveProfessionalService {
  async execute(ctx: RequestContext): Promise<{ id: string; name: string }> {
    const professional = ctx.membershipId
      ? await getProfessionalByMembershipId(ctx, ctx.membershipId)
      : null;
    if (!professional) throw new CertificateNotProfessionalError();
    return { id: professional.id, name: professional.name };
  }
}
