'use client';

import { ScrollTextIcon } from 'lucide-react';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useDocumentSettingGetHook } from '@/packages/operacional/hooks/Document/useDocumentSettingGetHook';
import { useDocumentSettingUpdateHook } from '@/packages/operacional/hooks/Document/useDocumentSettingUpdateHook';
import { useDocumentTemplateListHook } from '@/packages/operacional/hooks/Document/useDocumentTemplateListHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';

/** Qual contrato acompanha o orçamento aprovado e se ele nasce sozinho na aprovação. */
export function DocumentQuoteContractCard() {
  const { me } = useAuth();
  const setting = useDocumentSettingGetHook();
  const templates = useDocumentTemplateListHook();
  const update = useDocumentSettingUpdateHook();
  const canEdit = hasPermission(me, 'settings.write');

  if (setting.isLoading || templates.isLoading) return <Skeleton className="h-32 rounded-2xl" />;
  if (setting.isError || !setting.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{operacionalErrorMessage(setting.error)}</AlertDescription>
      </Alert>
    );
  }

  const contracts = (templates.data ?? []).filter((template) => template.kind === 'CONTRACT' && template.active);
  const { quoteContractTemplateId, quoteContractAuto } = setting.data;
  const busy = !canEdit || update.isPending;

  return (
    <section
      aria-labelledby="document-quote-contract-title"
      className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(74_15_22/0.04)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <ScrollTextIcon className="size-4" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <h2 id="document-quote-contract-title" className="text-sm font-semibold text-foreground">
            Contrato do orçamento
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando um orçamento é aprovado, o sistema monta o contrato com os valores, as parcelas e os
            procedimentos aprovados.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium text-foreground">
          Modelo de contrato
          <NativeSelect
            className="w-full"
            disabled={busy}
            value={quoteContractTemplateId ?? ''}
            onChange={(event) => update.mutate({ quoteContractTemplateId: event.target.value || null })}
          >
            <NativeSelectOption value="">Nenhum (não gerar contrato)</NativeSelectOption>
            {contracts.map((template) => (
              <NativeSelectOption key={template.id} value={template.id}>
                {template.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        {contracts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Não há modelo de contrato ativo. Crie um na lista de modelos abaixo.
          </p>
        ) : null}

        <label className="flex items-start gap-3 text-sm">
          <Switch
            checked={quoteContractAuto}
            disabled={busy || !quoteContractTemplateId}
            onCheckedChange={(checked) => update.mutate({ quoteContractAuto: checked })}
            aria-label="Gerar o contrato sozinho ao aprovar o orçamento"
          />
          <span className="grid gap-0.5">
            <span className="font-medium text-foreground">Gerar o contrato sozinho ao aprovar</span>
            <span className="text-xs text-muted-foreground">
              Se preferir desligado, a recepção gera o contrato pelo botão “Gerar contrato” no orçamento.
            </span>
          </span>
        </label>
      </div>

      {update.isError ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{operacionalErrorMessage(update.error)}</AlertDescription>
        </Alert>
      ) : update.isSuccess ? (
        <p className="mt-2 text-xs font-medium text-success" role="status">
          Salvo.
        </p>
      ) : null}
      {!canEdit ? (
        <p className="mt-2 text-xs text-muted-foreground">Só quem gerencia as configurações da clínica pode alterar.</p>
      ) : null}
    </section>
  );
}
