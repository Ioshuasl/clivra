import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import { getObjectStorage, ObjectStorageError } from '../../../../shared/storage/index.js';
import {
  buildMessagingMediaStorageKey,
  MEDIA_MAX_BYTES,
  MEDIA_PRESIGN_TTL_SECONDS,
} from '../../helpers/media_storage.helper.js';
import {
  MediaTooLargeError,
  StorageUnavailableError,
  UnsupportedMediaTypeError,
} from '../../models/errors/messaging.errors.js';
import type { MediaPresignSchema } from '../../schemas/messaging.schema.js';
import type { MediaPresignResult } from '../../types/media_presign.types.js';

export class PresignService {
  async execute(ctx: RequestContext, mediaSchema: MediaPresignSchema): Promise<MediaPresignResult> {
    if (mediaSchema.sizeBytes > MEDIA_MAX_BYTES) throw new MediaTooLargeError();
    if (!mediaSchema.mimeType) throw new UnsupportedMediaTypeError();

    const storageKey = buildMessagingMediaStorageKey({
      tenantId: ctx.tenantId,
      objectId: idGenerator.next(),
      fileName: mediaSchema.fileName,
    });

    try {
      const signed = await getObjectStorage().presignPut(
        storageKey,
        mediaSchema.mimeType,
        MEDIA_PRESIGN_TTL_SECONDS,
      );
      return {
        uploadUrl: signed.url,
        method: 'PUT',
        headers: signed.headers,
        storageKey,
        expiresIn: MEDIA_PRESIGN_TTL_SECONDS,
      };
    } catch (err) {
      if (err instanceof ObjectStorageError) throw new StorageUnavailableError();
      throw err;
    }
  }
}
