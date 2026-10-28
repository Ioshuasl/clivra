'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  WAITLIST_STATUS_LABELS,
  type WaitlistStatus,
} from '@/packages/operacional/enum/Waitlist/WaitlistStatusEnum';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useWaitlistDeleteHook } from '@/packages/operacional/hooks/Waitlist/useWaitlistDeleteHook';
import { useWaitlistListHook } from '@/packages/operacional/hooks/Waitlist/useWaitlistListHook';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

const WaitlistFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Waitlist/WaitlistFormDialog').then(
      (mod) => mod.WaitlistFormDialog,
    ),
  { ssr: false },
);
const WaitlistOfferFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Waitlist/WaitlistOfferFormDialog').then(
      (mod) => mod.WaitlistOfferFormDialog,
    ),
  { ssr: false },
);

type WaitlistPanelProps = {
  professionalId?: string;
};

function statusLabel(status: string): string {
  if (status in WAITLIST_STATUS_LABELS) {
    return WAITLIST_STATUS_LABELS[status as WaitlistStatus];
  }
  return status;
}

export function WaitlistPanel({ professionalId }: WaitlistPanelProps) {
  const listQuery = useWaitlistListHook();
  const remove = useWaitlistDeleteHook();
  const [createOpen, setCreateOpen] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);

  const active = (listQuery.data ?? []).filter(
    (entry) => entry.status === 'WAITING' || entry.status === 'OFFERED',
  );

  return (
    <>
      <Card className="h-full min-h-0 gap-0 py-0">
        <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-3 space-y-0 border-b border-border py-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">Fila de espera</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {active.length === 0
                ? 'Ninguém aguardando vaga no momento.'
                : `${active.length} paciente${active.length === 1 ? '' : 's'} na fila`}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="cursor-pointer shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto py-3">
          {listQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{operacionalErrorMessage(listQuery.error)}</AlertDescription>
            </Alert>
          ) : null}

          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando fila…</p>
          ) : active.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-border px-4 py-6 text-center">
              <p className="text-sm font-medium text-foreground">Fila vazia</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Adicione pacientes que querem ser encaixados quando abrir uma vaga.
              </p>
            </div>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {active.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-[12px] border border-border bg-card px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {entry.patient?.name ?? 'Paciente'}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                        {entry.procedure?.name ?? 'Procedimento'}
                        {entry.professional?.name
                          ? ` · ${entry.professional.name}`
                          : ' · qualquer profissional'}
                        {entry.priority === 1 ? ' · urgente' : ''}
                      </p>
                    </div>
                    <Badge variant={entry.status === 'OFFERED' ? 'default' : 'secondary'}>
                      {statusLabel(entry.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.status === 'WAITING' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setOfferId(entry.id)}
                      >
                        Oferecer horário
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer"
                      disabled={remove.isPending}
                      onClick={() => {
                        void remove.mutateAsync(entry.id);
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

        </CardContent>
      </Card>

      {createOpen ? (
        <WaitlistFormDialog
          open
          professionalId={professionalId}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}

      {offerId ? (
        <WaitlistOfferFormDialog
          open
          waitlistId={offerId}
          professionalId={professionalId}
          onClose={() => setOfferId(null)}
        />
      ) : null}
    </>
  );
}
