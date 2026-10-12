import { Spinner } from '@/shared/ui/spinner';

/** Linha de estado "aguardando pagamento" — a página se atualiza sozinha (polling da assinatura). */
export function CheckoutWaitingStatus() {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm"
      role="status"
      data-testid="checkout-waiting"
    >
      <Spinner className="text-muted-foreground" />
      <span className="font-medium text-foreground">Aguardando pagamento…</span>
      <span className="text-muted-foreground">Esta tela confirma sozinha, sem recarregar.</span>
    </div>
  );
}
