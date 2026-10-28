import { apiClient } from '@/shared/api/api-client';
import type { AnamnesisCreateInput } from '@/packages/clinico/types/Anamnesis/AnamnesisTypes';

export async function AnamnesisCreateData(
  patientId: string,
  anamnesisSchema: AnamnesisCreateInput,
): Promise<unknown> {
  return apiClient.request<unknown>(`/patients/${encodeURIComponent(patientId)}/record/anamnesis`, {
    method: 'POST',
    body: JSON.stringify(anamnesisSchema),
  });
}
