import { formatBytes } from '@/packages/admin/helpers/FormatCents';
import type { PlanSummary } from '@/packages/admin/types/Subscription/SubscriptionTypes';

/** `YYYY-MM-DD` (data civil, sem fuso) ou ISO completo → `dd/mm/aaaa`. */
export function formatDateBr(value: string | null | undefined): string {
  if (!value) return '—';
  const civil = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (civil) return `${civil[3]}/${civil[2]}/${civil[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
}

export function trialDaysLeft(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

/** `R$ 99` quando não há centavos; `R$ 99,90` caso contrário. */
export function formatPlanPrice(cents: number): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function pluralDays(days: number): string {
  return `${days} dia${days === 1 ? '' : 's'}`;
}

function limitLabel(value: number | null, singular: string, plural: string): string {
  if (value === null) return `${plural} ilimitados`;
  return `${value} ${value === 1 ? singular : plural}`;
}

/** Linhas de benefício do cartão de plano, derivadas dos limites reais do plano. */
export function planFeatureLines(plan: PlanSummary): string[] {
  const { limits } = plan;
  const lines = [
    limits.professionals === null
      ? 'Profissionais ilimitados'
      : `Até ${limitLabel(limits.professionals, 'profissional', 'profissionais')}`,
    limits.adminUsers === null
      ? 'Usuários ilimitados'
      : `Até ${limitLabel(limits.adminUsers, 'usuário', 'usuários')}`,
    `${limitLabel(limits.units, 'unidade', 'unidades')}`,
  ];
  if (limits.storageGb !== null) {
    lines.push(`${formatBytes(limits.storageGb * 1024 ** 3).replace('.00', '')} de armazenamento`);
  }
  lines.push('Prontuário, agenda e financeiro completos');
  return lines;
}

export const PLAN_HIGHLIGHT_CODE = 'CLINICA';
