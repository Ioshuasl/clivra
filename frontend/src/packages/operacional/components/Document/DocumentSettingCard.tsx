'use client';

import { UserCheckIcon } from 'lucide-react';
import {
  PATIENT_SIGNATURE_METHODS,
  PATIENT_SIGNATURE_METHOD_HINTS,
  PATIENT_SIGNATURE_METHOD_LABELS,
  type PatientSignatureMethod,
} from '@/packages/operacional/enum/Document/PatientSignatureMethodEnum';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useDocumentSettingGetHook } from '@/packages/operacional/hooks/Document/useDocumentSettingGetHook';
import { useDocumentSettingUpdateHook } from '@/packages/operacional/hooks/Document/useDocumentSettingUpdateHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { cn } from '@/shared/helpers/utils';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';

/** Como a clínica colhe a assinatura do paciente quando um modelo pede. Só quem gerencia configurações altera. */
export function DocumentSettingCard() {
  const { me } = useAuth();
  const setting = useDocumentSettingGetHook();
  const update = useDocumentSettingUpdateHook();
  const canEdit = hasPermission(me, 'settings.write');

  if (setting.isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (setting.isError || !setting.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{operacionalErrorMessage(setting.error)}</AlertDescription>
      </Alert>
    );
  }

  const current = setting.data.patientSignatureMethod;
  const choose = (method: PatientSignatureMethod) => {
    if (!canEdit || method === current || update.isPending) return;
    update.mutate({ patientSignatureMethod: method });
  };

  return (
    <section
      aria-labelledby="document-setting-title"
      className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(74_15_22/0.04)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <UserCheckIcon className="size-4" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <h2 id="document-setting-title" className="text-sm font-semibold text-foreground">
            Assinatura do paciente
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Como o paciente confirma os documentos que pedem a assinatura dele. Ele recebe um link e assina
            pelo celular.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby="document-setting-title">
        {PATIENT_SIGNATURE_METHODS.map((method) => {
          const selected = method === current;
          return (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!canEdit || update.isPending}
              className={cn(
                'flex flex-col gap-1 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                canEdit ? 'cursor-pointer' : 'cursor-default',
                selected
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              onClick={() => choose(method)}
            >
              <span className="font-medium text-foreground">{PATIENT_SIGNATURE_METHOD_LABELS[method]}</span>
              <span className="text-xs">{PATIENT_SIGNATURE_METHOD_HINTS[method]}</span>
            </button>
          );
        })}
      </div>

      {update.isPending ? (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          Salvando…
        </p>
      ) : update.isSuccess ? (
        <p className="mt-2 text-xs font-medium text-success" role="status">
          Salvo. Vale para os próximos links enviados.
        </p>
      ) : null}
      {update.isError ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{operacionalErrorMessage(update.error)}</AlertDescription>
        </Alert>
      ) : null}
      {!canEdit ? (
        <p className="mt-2 text-xs text-muted-foreground">Só quem gerencia as configurações da clínica pode alterar.</p>
      ) : null}
    </section>
  );
}
