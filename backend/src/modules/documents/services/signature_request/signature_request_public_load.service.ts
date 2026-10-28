import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { hashToken } from '../../../../shared/helpers/token_hash.js';
import { SignatureLinkNotFoundError } from '../../models/errors/documents.errors.js';
import { GetRepository as GetDocumentRepository } from '../../repositories/document/document_get.repository.js';
import { GetRepository as GetRequestRepository } from '../../repositories/signature_request/signature_request_get.repository.js';
import { ResolveRepository } from '../../repositories/signature_request/signature_request_resolve.repository.js';
import type { DocumentRecord } from '../../types/document/document.types.js';
import type { SignatureRequestState } from '../../types/signature_request/signature_request.types.js';

export type LoadedSignatureRequest = {
  ctx: RequestContext;
  request: SignatureRequestState;
  document: DocumentRecord;
};

/** Valida o link público: existe, não venceu, não foi usado/invalidado e o documento ainda aceita a assinatura. */
export class LoadService {
  constructor(
    private readonly resolve = new ResolveRepository(),
    private readonly getRequest = new GetRequestRepository(),
    private readonly getDocument = new GetDocumentRepository(),
  ) {}

  async execute(traceId: string, rawToken: string): Promise<LoadedSignatureRequest> {
    const lookup = await this.resolve.execute(hashToken(rawToken));
    if (!lookup || lookup.usedAt || lookup.revokedAt || lookup.expiresAt.getTime() < Date.now()) {
      throw new SignatureLinkNotFoundError();
    }
    const ctx: RequestContext = { tenantId: lookup.tenantId, userId: '', requestId: traceId };
    const request = await this.getRequest.execute(ctx, lookup.id);
    const document = await this.getDocument.execute(ctx, lookup.documentId);
    if (
      !request ||
      !document ||
      document.status === 'CANCELLED' ||
      document.signatures.some((signature) => signature.signerType !== 'PROFESSIONAL')
    ) {
      throw new SignatureLinkNotFoundError();
    }
    return { ctx, request, document };
  }
}
