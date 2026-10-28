import { AnamnesisFormAssignmentUpdateData } from '@/packages/admin/data/AnamnesisForm/AnamnesisFormAssignmentUpdateData';
import type { AnamnesisFormAssignmentSetInput } from '@/packages/admin/types/AnamnesisForm/AnamnesisFormAssignmentTypes';

export async function AnamnesisFormAssignmentUpdateService(
  assignmentSchema: AnamnesisFormAssignmentSetInput,
) {
  return AnamnesisFormAssignmentUpdateData(assignmentSchema);
}
