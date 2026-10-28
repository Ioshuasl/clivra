import { DocumentSettingUpdateData } from '@/packages/operacional/data/Document/DocumentSettingUpdateData';
import type { DocumentSettingUpdateInput } from '@/packages/operacional/types/Document/DocumentSignatureRequestTypes';

export async function DocumentSettingUpdateService(settingSchema: DocumentSettingUpdateInput) {
  return DocumentSettingUpdateData(settingSchema);
}
