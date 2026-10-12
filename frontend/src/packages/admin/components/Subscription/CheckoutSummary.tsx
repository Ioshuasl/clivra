import type { ReactNode } from 'react';
import { LockIcon } from 'lucide-react';
import {
  BILLING_METHOD_LABELS,
  type BillingMethod,
} from '@/packages/admin/enum/Subscription/BillingMethodEnum';
import { formatCents } from '@/packages/admin/helpers/FormatCents';
import type { PlanSummary } from '@/packages/admin/types/Subscription/SubscriptionTypes';
import { ClivraSurface } from '@/shared/layout/ClivraPage';

type CheckoutSummaryProps = {
  plan: PlanSummary | null;
  method: BillingMethod;
  firstDueLabel: string;
  /** CTA do resumo (um só por viewport). */
  children?: ReactNode;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

/** Resumo do pedido fixo à direita (padrão Stripe Checkout): o que será cobrado, quando e como. */
export function CheckoutSummary({ plan, method, firstDueLabel, children }: CheckoutSummaryProps) {
  return (
    <ClivraSurface
      className="lg:sticky lg:top-0"
      toolbar={<h2 className="text-sm font-semibold text-foreground">Resumo</h2>}
      contentClassName="grid gap-4 px-4 py-4"
    >
      {plan ? (
        <>
          <div>
            <p className="text-xs text-muted-foreground">Plano</p>
            <p className="text-base font-semibold text-foreground">Clivra {plan.name}</p>
          </div>
          <dl className="grid gap-2">
            <Row label="Valor mensal" value={formatCents(plan.priceCents)} />
            <Row label="Primeira cobrança" value={firstDueLabel} />
            <Row label="Forma de pagamento" value={BILLING_METHOD_LABELS[method]} />
          </dl>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-foreground">Total por mês</span>
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCents(plan.priceCents)}
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Escolha um plano para ver o resumo.</p>
      )}
      {children}
      <div className="grid gap-1.5 text-xs text-muted-foreground">
        <p className="flex items-start gap-1.5">
          <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Pagamento processado pelo Asaas. O Clivra nunca vê nem guarda os dados do seu cartão.
          </span>
        </p>
        <p>Sem fidelidade: cancele quando quiser em Assinatura.</p>
      </div>
    </ClivraSurface>
  );
}
