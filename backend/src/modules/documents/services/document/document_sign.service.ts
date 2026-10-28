import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { SignAction } from '../../actions/document/document_sign.action.js';
import { canAccessKind } from '../../models/document/document_access.model.js';
import {
  DocumentAlreadySignedError,
  DocumentForbiddenKindError,
  DocumentSignForbiddenError,
  DocumentSignNotAllowedError,
} from '../../models/errors/documents.errors.js';
import type { DocumentSignSchema } from '../../schemas/certificate.schema.js';
import type { DocumentDetail } from '../../types/document/document.types.js';
import { ResolveProfessionalService } from '../certificate/certificate_resolve_professional.service.js';
import { GetService } from './document_get.service.js';

export class SignService {
  constructor(
    private readonly getDocument = new GetService(),
    private readonly resolveProfessional = new ResolveProfessionalService(),
    private readonly signAction = new SignAction(),
  ) {}

  async execute(
    ctx: RequestContext,
    documentId: string,
    signSchema: DocumentSignSchema,
    extra?: { ip?: string },
  ): Promise<DocumentDetail> {
    const document = await this.getDocument.executeRecord(ctx, documentId);
    if (!canAccessKind(ctx.permissions, document.kind, 'write')) throw new DocumentForbiddenKindError();

    const professional = await this.resolveProfessional.execute(ctx);
    if (professional.id !== document.professionalId) throw new DocumentSignForbiddenError();

    if (document.status === 'CANCELLED') {
      throw new DocumentSignNotAllowedError('Documento cancelado não pode ser assinado.');
    }
    if (document.professionalSignature === 'NONE') throw new DocumentSignNotAllowedError();
    if (document.signatures.some((signature) => signature.signerType === 'PROFESSIONAL')) {
      throw new DocumentAlreadySignedError();
    }

    await this.signAction.execute(ctx, document, signSchema.password, extra);
    return this.getDocument.execute(ctx, documentId);
  }
}
