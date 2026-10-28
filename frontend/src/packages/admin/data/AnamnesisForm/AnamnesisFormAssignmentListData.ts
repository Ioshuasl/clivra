import { apiClient } from '@/shared/api/api-client';
import type { AnamnesisFormAssignment } from '@/packages/admin/types/AnamnesisForm/AnamnesisFormAssignmentTypes';

export async function AnamnesisFormAssignmentListData(): Promise<AnamnesisFormAssignment[]> {
  return apiClient.request<AnamnesisFormAssignment[]>('/anamnesis-forms/assignments');
}
