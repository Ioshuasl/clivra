import { AnamnesisListData } from '@/packages/clinico/data/Anamnesis/AnamnesisListData';

export async function AnamnesisListService(patientId: string) {
  return AnamnesisListData(patientId);
}
