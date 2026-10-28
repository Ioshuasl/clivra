import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { getObjectStorage, ObjectStorageError } from '../../../../shared/storage/index.js';
import { DocumentPdfPendingError } from '../../models/errors/documents.errors.js';
import type { DocumentPdfResult } from '../../types/document/document.types.js';
import { GetService } from './document_get.service.js';

const EXPIRES_IN = 900;

export class PdfService {
  constructor(private readonly getDocument = new GetService()) {}

  async execute(ctx: RequestContext, documentId: string): Promise<DocumentPdfResult> {
    const document = await this.getDocument.executeRecord(ctx, documentId);
    if (!document.pdfKey) throw new DocumentPdfPendingError();
    try {
      const signed = await getObjectStorage().presignGet(document.pdfKey, EXPIRES_IN);
      return { url: signed.url, expiresIn: EXPIRES_IN };
    } catch (err) {
      if (err instanceof ObjectStorageError) {
        throw new AppError('STORAGE_UNAVAILABLE', 'Armazenamento indisponível.', 503);
      }
      throw err;
    }
  }
}
