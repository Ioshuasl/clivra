import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getObjectStorage, ObjectStorageError } from '../../../../shared/storage/index.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';
import { ExportNotFoundError } from '../../models/errors/reporting.errors.js';
import { GetRepository } from '../../repositories/export/report_export_get.repository.js';
import type { ReportExportGetResult } from '../../types/export/report_export.types.js';

/** URL assinada válida por 15 minutos (corte S7 #9). */
export const EXPORT_DOWNLOAD_EXPIRES_SECONDS = 15 * 60;

export class GetService {
  constructor(private readonly get = new GetRepository()) {}

  async execute(ctx: RequestContext, exportId: string): Promise<ReportExportGetResult> {
    const row = await this.get.execute(ctx, exportId);
    if (!row) throw new ExportNotFoundError();

    let downloadUrl: string | null = null;
    let downloadExpiresInSeconds: number | null = null;

    if (row.status === 'READY' && row.storageKey) {
      try {
        const signed = await getObjectStorage().presignGet(
          row.storageKey,
          EXPORT_DOWNLOAD_EXPIRES_SECONDS,
        );
        downloadUrl = signed.url;
        downloadExpiresInSeconds = EXPORT_DOWNLOAD_EXPIRES_SECONDS;
      } catch (err) {
        if (err instanceof ObjectStorageError) {
          throw new AppError('STORAGE_UNAVAILABLE', 'Armazenamento indisponível.', 503);
        }
        throw err;
      }
    }

    return {
      id: row.id,
      report: row.report,
      format: row.format,
      status: row.status,
      error: row.error,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      downloadUrl,
      downloadExpiresInSeconds,
    };
  }
}
