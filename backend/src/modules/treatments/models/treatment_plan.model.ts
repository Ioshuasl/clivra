import type { TreatmentItemStatus } from '../enum/treatment_item/treatment_item_status.enum.js';
import type { TreatmentPlanStatus } from '../enum/treatment_plan/treatment_plan_status.enum.js';

export function nextPlanStatus(
  items: ReadonlyArray<{ status: TreatmentItemStatus | (string & {}) }>,
): TreatmentPlanStatus {
  const open = items.some((item) => item.status === 'PLANNED' || item.status === 'SCHEDULED');
  if (open) return 'ACTIVE';
  if (items.some((item) => item.status === 'EXECUTED')) return 'COMPLETED';
  return 'CANCELLED';
}

export function planProgress(items: ReadonlyArray<{ status: string; priceCents: number }>): {
  progressPercent: number;
  executedCents: number;
  pendingCents: number;
} {
  const executed = items.filter((item) => item.status === 'EXECUTED');
  const pending = items.filter((item) => item.status === 'PLANNED' || item.status === 'SCHEDULED');
  const countable = items.filter((item) => item.status !== 'CANCELLED');
  const executedCents = executed.reduce((acc, item) => acc + item.priceCents, 0);
  const pendingCents = pending.reduce((acc, item) => acc + item.priceCents, 0);
  const progressPercent =
    countable.length === 0 ? (items.length === 0 ? 0 : 100) : Math.round((100 * executed.length) / countable.length);
  return { progressPercent, executedCents, pendingCents };
}
