import type { Prisma } from '@prisma/client';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { DocumentTemplateUpdateSchema } from '../../schemas/document_template.schema.js';
import type { DocumentTemplateSummary } from '../../types/document_template/document_template.types.js';
import { mapDocumentTemplate } from './mappers/document_template.mapper.js';

export class UpdateRepository {
  async execute(
    ctx: RequestContext,
    templateId: string,
    templateSchema: DocumentTemplateUpdateSchema,
  ): Promise<DocumentTemplateSummary | null> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const found = await tx.documentTemplate.findFirst({
        where: { id: templateId, tenantId: ctx.tenantId },
        select: { id: true },
      });
      if (!found) return null;
      const row = await tx.documentTemplate.update({
        where: { id: templateId },
        data: {
          ...(templateSchema.kind ? { kind: templateSchema.kind } : {}),
          ...(templateSchema.name ? { name: templateSchema.name } : {}),
          ...(templateSchema.content
            ? { content: templateSchema.content as unknown as Prisma.InputJsonValue }
            : {}),
          ...(templateSchema.professionalSignature
            ? { professionalSignature: templateSchema.professionalSignature }
            : {}),
          ...(templateSchema.patientSignature ? { patientSignature: templateSchema.patientSignature } : {}),
          ...(templateSchema.active === undefined ? {} : { active: templateSchema.active }),
        },
      });
      return mapDocumentTemplate(row);
    });
  }
}
