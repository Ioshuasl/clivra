import { apiClient } from '@/shared/api/api-client';
import type {
  AnamnesisFormAssignment,
  AnamnesisFormAssignmentSetInput,
} from '@/packages/admin/types/AnamnesisForm/AnamnesisFormAssignmentTypes';

export async function AnamnesisFormAssignmentUpdateData(
  assignmentSchema: AnamnesisFormAssignmentSetInput,
): Promise<AnamnesisFormAssignment> {
  return apiClient.request<AnamnesisFormAssignment>(
    `/anamnesis-forms/assignments/${encodeURIComponent(assignmentSchema.professionalId)}`,
    { method: 'PUT', body: JSON.stringify({ formName: assignmentSchema.formName }) },
  );
}
