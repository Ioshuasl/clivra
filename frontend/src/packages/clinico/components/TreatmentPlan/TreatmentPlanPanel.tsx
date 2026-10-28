'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  TREATMENT_ITEM_STATUS_LABELS,
} from '@/packages/clinico/enum/TreatmentPlan/TreatmentItemStatusEnum';
import { clinicoErrorMessage } from '@/packages/clinico/helpers/ClinicoErrorMessage';
import { formatCents } from '@/packages/clinico/helpers/FormatCents';
import { useTreatmentPlanGetHook } from '@/packages/clinico/hooks/TreatmentPlan/useTreatmentPlanGetHook';
import { useTreatmentPlanListHook } from '@/packages/clinico/hooks/TreatmentPlan/useTreatmentPlanListHook';
import type { TreatmentPlanPanelProps } from '@/packages/clinico/types/TreatmentPlan/TreatmentPlanPanelTypes';
import { Can } from '@/shared/auth/Can';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { FieldLabel } from '@/shared/ui/field';
import { cn } from '@/shared/helpers/utils';

const TreatmentItemCreateFormDialog = dynamic(
  () =>
    import('@/packages/clinico/components/TreatmentPlan/TreatmentItemCreateFormDialog').then(
      (m) => m.TreatmentItemCreateFormDialog,
    ),
  { ssr: false },
);

const TreatmentExecuteFormDialog = dynamic(
  () =>
    import('@/packages/clinico/components/TreatmentPlan/TreatmentExecuteFormDialog').then(
      (m) => m.TreatmentExecuteFormDialog,
    ),
  { ssr: false },
);

export function TreatmentPlanPanel({ patientId, appointmentId }: TreatmentPlanPanelProps) {
  const listQuery = useTreatmentPlanListHook(patientId, 'ACTIVE');
  const activeId = listQuery.data?.items[0]?.id;
  const planQuery = useTreatmentPlanGetHook(activeId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [signed, setSigned] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const plan = planQuery.data;
  const pendingItems = useMemo(
    () => (plan?.items ?? []).filter((item) => item.status === 'PLANNED' || item.status === 'SCHEDULED'),
    [plan?.items],
  );
  const selectedItems = pendingItems.filter((item) => selectedIds.includes(item.id));

  if (listQuery.isLoading || (activeId && planQuery.isLoading)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plano de tratamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando plano…</p>
        </CardContent>
      </Card>
    );
  }

  if (listQuery.isError || planQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plano de tratamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {clinicoErrorMessage(listQuery.error ?? planQuery.error)}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plano de tratamento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {signed ? (
            <Alert>
              <AlertTitle>Evolução assinada</AlertTitle>
              <AlertDescription>
                Esta evolução não pode ser editada; correções geram uma nova versão.
              </AlertDescription>
            </Alert>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Este paciente ainda não tem plano de tratamento.
          </p>
          <Can permission="clinical_records.write">
            <Button type="button" onClick={() => setAddOpen(true)}>
              Adicionar procedimento ao plano
            </Button>
          </Can>
        </CardContent>
        {addOpen ? (
          <TreatmentItemCreateFormDialog patientId={patientId} onClose={() => setAddOpen(false)} />
        ) : null}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plano de tratamento</CardTitle>
        <p className="text-xs text-muted-foreground">
          {plan.progressPercent}% · pendente {formatCents(plan.pendingCents)}
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {signed ? (
          <Alert>
            <AlertTitle>Evolução assinada</AlertTitle>
            <AlertDescription>
              Esta evolução não pode ser editada; correções geram uma nova versão.
            </AlertDescription>
          </Alert>
        ) : null}

        <ul className="grid gap-2">
          {plan.items.map((item) => {
            const pending = item.status === 'PLANNED' || item.status === 'SCHEDULED';
            const executed = item.status === 'EXECUTED';
            const label = [
              item.procedureName,
              item.toothCode ? item.toothCode : null,
              item.face,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                {pending ? (
                  <Checkbox
                    id={`plan-item-${item.id}`}
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds((current) => {
                        if (checked === true) return [...current, item.id];
                        return current.filter((id) => id !== item.id);
                      });
                    }}
                  />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
                <FieldLabel
                  htmlFor={pending ? `plan-item-${item.id}` : undefined}
                  className={cn('font-normal', executed && 'text-muted-foreground line-through')}
                >
                  {label} · {formatCents(item.priceCents)}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {TREATMENT_ITEM_STATUS_LABELS[item.status]}
                  </span>
                </FieldLabel>
              </li>
            );
          })}
        </ul>

        <Can permission="clinical_records.write">
          <Button type="button" variant="outline" onClick={() => setAddOpen(true)}>
            Adicionar procedimento
          </Button>
          <Button
            type="button"
            disabled={selectedItems.length === 0}
            onClick={() => setExecuteOpen(true)}
          >
            {selectedItems.length > 0
              ? `Registrar ${selectedItems.length} como realizado${selectedItems.length > 1 ? 's' : ''}`
              : 'Registrar como realizado'}
          </Button>
          {pendingItems.length > 0 && selectedItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Marque os procedimentos feitos hoje para registrá-los.
            </p>
          ) : null}
        </Can>
      </CardContent>

      {addOpen ? (
        <TreatmentItemCreateFormDialog patientId={patientId} onClose={() => setAddOpen(false)} />
      ) : null}

      {executeOpen && selectedItems.length > 0 ? (
        <TreatmentExecuteFormDialog
          patientId={patientId}
          appointmentId={appointmentId}
          items={selectedItems}
          onClose={() => setExecuteOpen(false)}
          onExecuted={() => {
            setSelectedIds([]);
            setSigned(true);
          }}
        />
      ) : null}
    </Card>
  );
}
