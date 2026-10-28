import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import { IssueAction, type IssueSupersede } from '../../actions/document/document_issue.action.js';
import {
  canAccessKind,
} from '../../models/document/document_access.model.js';
import {
  findUnknownVariables,
  hashDocumentContent,
  renderDocumentContent,
} from '../../models/document/document_render.model.js';
import {
  DocumentForbiddenKindError,
  DocumentReasonRequiredError,
  DocumentSupersedeInvalidError,
  DocumentTemplateInactiveError,
  DocumentTemplateNotFoundError,
  DocumentUnknownVariableError,
} from '../../models/errors/documents.errors.js';
import { GetRepository as GetDocumentRepository } from '../../repositories/document/document_get.repository.js';
import { GetRepository as GetTemplateRepository } from '../../repositories/document_template/document_template_get.repository.js';
import type { QuoteContractData } from '../../types/quote_contract/quote_contract.types.js';
import type { DocumentCreateSchema } from '../../schemas/document.schema.js';
import type { DocumentDetail, DocumentIssueRow } from '../../types/document/document.types.js';
import { buildDocumentPdfInput } from '../../helpers/document_pdf_input.helper.js';
import { BuildVariablesService } from './document_variables_build.service.js';

const MIN_AMEND_REASON = 10;
// Aprovação pelo link do paciente não tem usuário logado.
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export class CreateService {
  constructor(
    private readonly getTemplate = new GetTemplateRepository(),
    private readonly getDocument = new GetDocumentRepository(),
    private readonly buildVariables = new BuildVariablesService(),
    private readonly issueAction = new IssueAction(),
  ) {}

  async execute(
    ctx: RequestContext,
    patientId: string,
    documentSchema: DocumentCreateSchema,
    extra?: { ip?: string },
    /** `quote`: o documento nasce de um orçamento aprovado. `system`: emissão automática, sem checar permissão de tela. */
    options?: { quote?: QuoteContractData; system?: boolean },
  ): Promise<DocumentDetail> {
    const template = await this.getTemplate.execute(ctx, documentSchema.templateId);
    if (!template) throw new DocumentTemplateNotFoundError();
    if (!template.active) throw new DocumentTemplateInactiveError();
    if (!options?.system && !canAccessKind(ctx.permissions, template.kind, 'write')) {
      throw new DocumentForbiddenKindError();
    }

    const source = documentSchema.content ?? template.content;
    const unknown = findUnknownVariables(source);
    if (unknown.length > 0) throw new DocumentUnknownVariableError(unknown);

    const supersede = await this.resolveSupersede(ctx, patientId, documentSchema);

    const built = await this.buildVariables.execute(
      ctx,
      patientId,
      documentSchema.professionalId,
      options?.quote,
    );
    const content = renderDocumentContent(source, built.variables);
    const contentHash = hashDocumentContent(content);
    const title = documentSchema.title ?? template.name;

    const needsSignature =
      template.professionalSignature === 'REQUIRED' || template.patientSignature === 'REQUIRED';

    const issue: DocumentIssueRow = {
      id: idGenerator.next(),
      patientId,
      professionalId: built.professional.id,
      templateId: template.id,
      kind: template.kind,
      title,
      content,
      contentHash,
      status: needsSignature ? 'AWAITING_SIGNATURE' : 'ISSUED',
      professionalSignature: template.professionalSignature,
      patientSignature: template.patientSignature,
      version: supersede.version,
      supersedesId: supersede.link?.documentId ?? null,
      amendReason: supersede.link?.reason ?? null,
      quoteId: options?.quote?.quoteId ?? null,
      issuedBy: ctx.userId || SYSTEM_USER_ID,
    };

    await this.issueAction.execute(
      ctx,
      issue,
      buildDocumentPdfInput({
        built,
        title,
        content,
        contentHash,
        professionalSignature: template.professionalSignature,
        patientSignature: template.patientSignature,
      }),
      supersede.link,
      extra,
    );

    const created = await this.getDocument.execute(ctx, issue.id);
    if (!created) throw new DocumentSupersedeInvalidError();
    const { pdfKey: _pdfKey, ...detail } = created;
    return detail;
  }

  private async resolveSupersede(
    ctx: RequestContext,
    patientId: string,
    documentSchema: DocumentCreateSchema,
  ): Promise<{ version: number; link: IssueSupersede | null }> {
    if (!documentSchema.supersedesId) return { version: 1, link: null };

    const reason = documentSchema.amendReason ?? '';
    if (reason.length < MIN_AMEND_REASON) throw new DocumentReasonRequiredError();

    const previous = await this.getDocument.execute(ctx, documentSchema.supersedesId);
    if (!previous || previous.patientId !== patientId || previous.status === 'CANCELLED') {
      throw new DocumentSupersedeInvalidError();
    }
    if (!canAccessKind(ctx.permissions, previous.kind, 'write')) throw new DocumentForbiddenKindError();

    return { version: previous.version + 1, link: { documentId: previous.id, reason } };
  }
}
