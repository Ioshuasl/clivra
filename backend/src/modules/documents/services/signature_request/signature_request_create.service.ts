import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getPatientById } from '../../../patients/patients_public.js';
import { CreateAction } from '../../actions/signature_request/signature_request_create.action.js';
import { canAccessKind } from '../../models/document/document_access.model.js';
import {
  DocumentForbiddenKindError,
  DocumentPatientNotFoundError,
  SignatureNotRequestedError,
} from '../../models/errors/documents.errors.js';
import type { SignatureRequestCreateSchema } from '../../schemas/signature_request.schema.js';
import type { SignatureRequestCreateResult } from '../../types/signature_request/signature_request.types.js';
import { GetService as GetDocumentService } from '../document/document_get.service.js';
import { GetService as GetSettingService } from '../setting/document_setting_get.service.js';

export class CreateService {
  constructor(
    private readonly getDocument = new GetDocumentService(),
    private readonly getSetting = new GetSettingService(),
    private readonly createAction = new CreateAction(),
  ) {}

  async execute(
    ctx: RequestContext,
    documentId: string,
    requestSchema: SignatureRequestCreateSchema,
    extra?: { ip?: string },
  ): Promise<SignatureRequestCreateResult> {
    const document = await this.getDocument.execute(ctx, documentId);
    if (!canAccessKind(ctx.permissions, document.kind, 'write')) throw new DocumentForbiddenKindError();

    if (document.status === 'CANCELLED') {
      throw new SignatureNotRequestedError('Documento cancelado não pode ser enviado para assinatura.');
    }
    if (document.patientSignature === 'NONE') throw new SignatureNotRequestedError();
    if (document.signatures.some((signature) => signature.signerType !== 'PROFESSIONAL')) {
      throw new SignatureNotRequestedError('O paciente já assinou este documento.');
    }

    const patient = await getPatientById(ctx, document.patientId);
    if (!patient) throw new DocumentPatientNotFoundError();
    const setting = await this.getSetting.execute(ctx);

    return this.createAction.execute(
      ctx,
      {
        documentId: document.id,
        documentTitle: document.title,
        patient: { id: patient.id, name: patient.name, email: patient.email },
      },
      setting.patientSignatureMethod,
      requestSchema.channel,
      extra,
    );
  }
}
