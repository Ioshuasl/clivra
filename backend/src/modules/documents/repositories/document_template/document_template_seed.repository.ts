import type { Prisma } from '@prisma/client';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import type { DefaultDocumentTemplate } from '../../helpers/document_default_templates.helper.js';

/** Modelos iniciais só entram em clínica que ainda não tem nenhum modelo (idempotente). */
export class SeedRepository {
  async execute(ctx: RequestContext, defaults: readonly DefaultDocumentTemplate[]): Promise<void> {
    await getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const existing = await tx.documentTemplate.count({ where: { tenantId: ctx.tenantId } });
      if (existing > 0) return;
      await tx.documentTemplate.createMany({
        skipDuplicates: true,
        data: defaults.map((template) => ({
          id: idGenerator.next(),
          tenantId: ctx.tenantId,
          kind: template.kind,
          name: template.name,
          content: template.content as unknown as Prisma.InputJsonValue,
          professionalSignature: template.professionalSignature,
          patientSignature: template.patientSignature,
          systemKey: template.systemKey,
        })),
      });
    });
  }
}
