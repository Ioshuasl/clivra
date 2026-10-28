import { apiClient } from '@/shared/api/api-client';
import type { AnamnesisFormModel } from '@/packages/clinico/types/Anamnesis/AnamnesisTypes';

export async function AnamnesisFormResolveData(professionalId?: string): Promise<AnamnesisFormModel> {
  const query = professionalId ? `?professionalId=${encodeURIComponent(professionalId)}` : '';
  return apiClient.request<AnamnesisFormModel>(`/anamnesis-forms/resolve${query}`);
}
