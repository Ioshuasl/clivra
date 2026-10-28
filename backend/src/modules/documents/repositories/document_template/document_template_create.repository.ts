import type { Prisma } from '@prisma/client';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import type { DocumentTemplateCreateSchema } from '../../schemas/document_template.schema.js';
import type { DocumentTemplateSummary } from '../../types/document_template/document_template.types.js';
import { mapDocumentTemplate } from './mappers/document_template.mapper.js';

export class CreateRepository {
  async execute(
    ctx: RequestContext,
    templateSchema: DocumentTemplateCreateSchema,
  ): Promise<DocumentTemplateSummary> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.documentTemplate.create({
        data: {
          id: idGenerator.next(),
          tenantId: ctx.tenantId,
          kind: templateSchema.kind,
          name: templateSchema.name,
          content: templateSchema.content as unknown as Prisma.InputJsonValue,
          professionalSignature: templateSchema.professionalSignature,
          patientSignature: templateSchema.patientSignature,
        },
      });
      return mapDocumentTemplate(row);
    });
  }
}
