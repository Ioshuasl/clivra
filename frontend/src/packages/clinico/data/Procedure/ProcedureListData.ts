import { apiClient } from '@/shared/api/api-client';
import type { ProcedureOption } from '@/packages/clinico/types/Procedure/ProcedureTypes';

export async function ProcedureListData(): Promise<ProcedureOption[]> {
  return apiClient.request<ProcedureOption[]>('/procedures');
}
