import Link from 'next/link';
import { CheckIcon } from 'lucide-react';
import { ClivraSurface } from '@/shared/layout/ClivraPage';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/helpers/utils';

type CheckoutSuccessProps = {
  planName: string | null;
  /** Cartão cadastrado durante o teste: a primeira cobrança só ocorre nessa data. */
  firstChargeDate?: string;
};

/** Tela final: pagamento confirmado pelo webhook (nunca pelo redirecionamento do navegador). */
export function CheckoutSuccess({ planName, firstChargeDate }: CheckoutSuccessProps) {
  return (
    <ClivraSurface contentClassName="grid justify-items-center gap-4 px-6 py-12 text-center">
      <div
        className="grid size-14 place-items-center rounded-full bg-success/10 text-success"
        aria-hidden
      >
        <CheckIcon className="size-7" />
      </div>
      <div className="grid gap-1" data-testid="checkout-success">
        <h2 className="text-xl font-semibold text-foreground">
          {firstChargeDate ? 'Cartão cadastrado' : 'Pagamento confirmado'}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {firstChargeDate
            ? `Tudo certo! Você continua no período de teste e a primeira cobrança será em ${firstChargeDate}. Pode cancelar antes disso, sem custo.`
            : planName
              ? `Sua assinatura do plano ${planName} está ativa. Obrigado por confiar no Clivra!`
              : 'Sua assinatura está ativa. Obrigado por confiar no Clivra!'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/app" className={cn(buttonVariants(), 'cursor-pointer')}>
          Ir para o painel
        </Link>
        <Link
          href="/app/assinatura"
          className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}
        >
          Ver minha assinatura
        </Link>
      </div>
    </ClivraSurface>
  );
}
