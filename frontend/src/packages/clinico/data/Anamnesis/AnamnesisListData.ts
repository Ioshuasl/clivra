import { apiClient } from '@/shared/api/api-client';
import type { AnamnesisResponseSummary } from '@/packages/clinico/types/Anamnesis/AnamnesisTypes';

export async function AnamnesisListData(patientId: string): Promise<AnamnesisResponseSummary[]> {
  const result = await apiClient.request<{ items: AnamnesisResponseSummary[] }>(
    `/patients/${encodeURIComponent(patientId)}/record/anamnesis`,
  );
  return result.items;
}
