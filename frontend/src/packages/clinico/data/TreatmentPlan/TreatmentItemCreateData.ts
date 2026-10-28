import { apiClient } from '@/shared/api/api-client';
import type {
  TreatmentItemCreateInput,
  TreatmentItemCreateResult,
} from '@/packages/clinico/types/TreatmentPlan/TreatmentItemCreateTypes';

export async function TreatmentItemCreateData(
  treatmentItemSchema: TreatmentItemCreateInput,
): Promise<TreatmentItemCreateResult> {
  return apiClient.request<TreatmentItemCreateResult>('/treatment-items', {
    method: 'POST',
    body: JSON.stringify(treatmentItemSchema),
  });
}
