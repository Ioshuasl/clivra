import { CheckoutCopyField } from '@/packages/admin/components/Subscription/CheckoutCopyField';
import { CheckoutWaitingStatus } from '@/packages/admin/components/Subscription/CheckoutWaitingStatus';
import { formatCents } from '@/packages/admin/helpers/FormatCents';
import { formatDateBr } from '@/packages/admin/helpers/SubscriptionFormat';
import type { PixPayView } from '@/packages/admin/types/Subscription/SubscriptionCheckoutTypes';

type PaymentPixPanelProps = {
  pix: PixPayView;
  valueCents: number;
  dueDate: string;
  waiting?: boolean;
};

const STEPS = [
  'Abra o app do seu banco e escolha pagar com Pix.',
  'Escaneie o QR Code ou cole o código copia e cola.',
  'Confira o valor e confirme. Pronto: a assinatura ativa na hora.',
];

/** Pagamento por Pix na própria página (QR Code + copia e cola), sem sair do app. */
export function PaymentPixPanel({ pix, valueCents, dueDate, waiting = false }: PaymentPixPanelProps) {
  return (
    <div className="grid gap-4" data-testid="payment-pix-panel">
      <div className="grid gap-5 sm:grid-cols-[208px_minmax(0,1fr)]">
        {/* Fundo branco fixo: QR Code precisa de contraste máximo para ser lido pela câmera, inclusive no tema escuro. */}
        <div className="grid size-52 place-items-center rounded-xl border border-border bg-white p-2">
          <img
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR Code Pix para pagamento da assinatura"
            className="size-full"
            data-testid="payment-pix-qr"
          />
        </div>
        <div className="grid content-start gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCents(valueCents)}
            </p>
            <p className="text-xs text-muted-foreground">Vencimento em {formatDateBr(dueDate)}</p>
          </div>
          <ol className="grid gap-1.5 text-sm text-muted-foreground">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <CheckoutCopyField
        label="Pix copia e cola"
        value={pix.payload}
        buttonLabel="Copiar código"
        testId="payment-pix-payload"
      />
      {waiting ? <CheckoutWaitingStatus /> : null}
    </div>
  );
}
