'use client';

import { formatIsoDateBr } from '@/shared/helpers/FormatDateBr';
import { useState } from 'react';
import { INSTALLMENT_PAYABLE_STATUSES } from '@/packages/financeiro/enum/Installment/InstallmentStatusEnum';
import { remainingCents } from '@/packages/financeiro/helpers/FinanceiroDate';
import { formatCents } from '@/packages/financeiro/helpers/FormatCents';
import type { MovementFormDrawerProps } from '@/packages/financeiro/types/FinancePanel/FinancePanelTypes';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Button } from '@/shared/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { cn } from '@/shared/helpers/utils';

export function MovementFormDrawer({
  installments,
  payables,
  patientNames,
  onClose,
  onPickEntrada,
  onPickSaida,
  onCreateSaida,
}: MovementFormDrawerProps) {
  const [kind, setKind] = useState<'entrada' | 'saida'>('entrada');
  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    true,
    onClose,
  );
  const openInstallments = installments.filter((item) =>
    INSTALLMENT_PAYABLE_STATUSES.includes(item.status),
  );

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>Registrar movimentação</SheetTitle>
          <SheetDescription>Uma tela para dinheiro que entra ou sai.</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <Button
              type="button"
              size="sm"
              variant={kind === 'entrada' ? 'default' : 'ghost'}
              className="cursor-pointer"
              onClick={() => setKind('entrada')}
            >
              Entrada (receber)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={kind === 'saida' ? 'default' : 'ghost'}
              className={cn('cursor-pointer', kind !== 'saida' && 'text-muted-foreground')}
              onClick={() => setKind('saida')}
            >
              Saída (pagar)
            </Button>
          </div>

          {kind === 'entrada' ? (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {openInstallments.length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted-foreground">
                  Nenhuma parcela em aberto para receber.
                </li>
              ) : (
                openInstallments.map((installment) => (
                  <li key={installment.id}>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/60"
                      onClick={() => onPickEntrada(installment)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {patientNames[installment.patientId] ?? 'Paciente'}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Parcela {installment.number} · {formatIsoDateBr(installment.dueDate)}
                        </span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCents(remainingCents(installment.amountCents, installment.paidCents))}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <div className="grid gap-3">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={onCreateSaida}
              >
                Nova conta a pagar
              </Button>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {payables.length === 0 ? (
                  <li className="px-4 py-6 text-sm text-muted-foreground">
                    Nenhuma conta aberta. Crie uma nova acima.
                  </li>
                ) : (
                  payables.map((payable) => (
                    <li key={payable.id}>
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/60"
                        onClick={() => onPickSaida(payable)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {payable.supplier || payable.description}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {payable.description} · {formatIsoDateBr(payable.dueDate)}
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCents(payable.amountCents)}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border px-4 py-3">
          <Button type="button" variant="ghost" className="cursor-pointer" onClick={requestClose}>
            Cancelar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
