import { AnamnesisFormResolveData } from '@/packages/clinico/data/Anamnesis/AnamnesisFormResolveData';

export async function AnamnesisFormResolveService(professionalId?: string) {
  return AnamnesisFormResolveData(professionalId);
}
