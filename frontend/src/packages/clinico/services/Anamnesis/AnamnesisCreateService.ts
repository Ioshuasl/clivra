import { AnamnesisCreateData } from '@/packages/clinico/data/Anamnesis/AnamnesisCreateData';
import type { AnamnesisCreateInput } from '@/packages/clinico/types/Anamnesis/AnamnesisTypes';

export async function AnamnesisCreateService(patientId: string, anamnesisSchema: AnamnesisCreateInput) {
  return AnamnesisCreateData(patientId, anamnesisSchema);
}
