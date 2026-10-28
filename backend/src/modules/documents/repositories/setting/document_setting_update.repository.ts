import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import type { PatientSignatureMethod } from '../../enum/signature/patient_signature_method.enum.js';
import type {
  DocumentSettingPatch,
  DocumentSettingSummary,
} from '../../types/setting/document_setting.types.js';

export class UpdateRepository {
  async execute(
    ctx: RequestContext,
    settingPatch: DocumentSettingPatch,
  ): Promise<DocumentSettingSummary> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const values = {
        ...(settingPatch.patientSignatureMethod
          ? { patientSignatureMethod: settingPatch.patientSignatureMethod }
          : {}),
        ...(settingPatch.quoteContractTemplateId !== undefined
          ? { quoteContractTemplateId: settingPatch.quoteContractTemplateId }
          : {}),
        ...(settingPatch.quoteContractAuto !== undefined
          ? { quoteContractAuto: settingPatch.quoteContractAuto }
          : {}),
        updatedBy: ctx.userId,
      };
      const row = await tx.documentSetting.upsert({
        where: { tenantId: ctx.tenantId },
        create: { tenantId: ctx.tenantId, ...values },
        update: values,
      });
      return {
        patientSignatureMethod: row.patientSignatureMethod as PatientSignatureMethod,
        quoteContractTemplateId: row.quoteContractTemplateId,
        quoteContractAuto: row.quoteContractAuto,
      };
    });
  }
}
