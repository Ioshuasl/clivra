import { TreatmentItemCreateData } from '@/packages/clinico/data/TreatmentPlan/TreatmentItemCreateData';
import type { TreatmentItemCreateInput } from '@/packages/clinico/types/TreatmentPlan/TreatmentItemCreateTypes';

export async function TreatmentItemCreateService(treatmentItemSchema: TreatmentItemCreateInput) {
  return TreatmentItemCreateData(treatmentItemSchema);
}
