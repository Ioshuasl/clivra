import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import {
  DEFAULT_PATIENT_SIGNATURE_METHOD,
  type PatientSignatureMethod,
} from '../../enum/signature/patient_signature_method.enum.js';
import type { DocumentSettingSummary } from '../../types/setting/document_setting.types.js';

/** Sem linha gravada, valem os padrões (aceite simples, sem contrato automático). */
export class GetRepository {
  async execute(ctx: RequestContext): Promise<DocumentSettingSummary> {
    return getTenantPrisma().runInTenantContext(ctx, async (tx) => {
      const row = await tx.documentSetting.findFirst({ where: { tenantId: ctx.tenantId } });
      return {
        patientSignatureMethod: (row?.patientSignatureMethod ??
          DEFAULT_PATIENT_SIGNATURE_METHOD) as PatientSignatureMethod,
        quoteContractTemplateId: row?.quoteContractTemplateId ?? null,
        quoteContractAuto: row?.quoteContractAuto ?? false,
      };
    });
  }
}
