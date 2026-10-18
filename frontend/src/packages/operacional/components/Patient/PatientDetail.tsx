'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PatientConsentsPanel } from '@/packages/operacional/components/Patient/PatientConsentsPanel';
import { PatientDadosFields } from '@/packages/operacional/components/Patient/PatientDadosFields';
import {
  PatientDetailAside,
  type PatientDetailTab,
} from '@/packages/operacional/components/Patient/PatientDetailAside';
import { PatientFinancePanel } from '@/packages/operacional/components/Patient/PatientFinancePanel';
import { PatientGuardiansPanel } from '@/packages/operacional/components/Patient/PatientGuardiansPanel';
import { PatientRecordPanel } from '@/packages/operacional/components/Patient/PatientRecordPanel';
import { PatientTimeline } from '@/packages/operacional/components/Patient/PatientTimeline';
import { PatientQuotesPanel } from '@/packages/operacional/components/Quote/PatientQuotesPanel';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import {
  formatCpfInputMask,
  formatPhoneInputMask,
  formatPhoneMask,
  patientAgeYears,
  patientInitials,
} from '@/packages/operacional/helpers/FormatPatientContact';
import {
  usePatientAutosaveHook,
  type PatientAutosaveStatus,
} from '@/packages/operacional/hooks/Patient/usePatientAutosaveHook';
import { usePatientDeleteHook } from '@/packages/operacional/hooks/Patient/usePatientDeleteHook';
import { usePatientUpdateFormHook } from '@/packages/operacional/hooks/Patient/usePatientFormHook';
import { usePatientGetHook } from '@/packages/operacional/hooks/Patient/usePatientGetHook';
import { usePatientUpdateHook } from '@/packages/operacional/hooks/Patient/usePatientUpdateHook';
import type { PatientUpdateFormValues } from '@/packages/operacional/schemas/Patient/PatientSchema';
import { Can } from '@/shared/auth/Can';
import { ApiClientError } from '@/shared/api/api-client';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { cn } from '@/shared/helpers/utils';

type PatientDetailProps = {
  patientId: string;
};

function AutosaveHint({
  status,
  savedAt,
  errorMessage,
  onRetry,
}: {
  status: PatientAutosaveStatus;
  savedAt: Date | null;
  errorMessage: string | null;
  onRetry: () => void;
}) {
  if (status === 'idle') {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Autosave ativo
      </p>
    );
  }

  const time =
    savedAt != null
      ? savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : null;

  if (status === 'error') {
    return (
      <p className="text-sm text-destructive" role="status">
        Não salvou{errorMessage ? `: ${errorMessage}` : '.'}{' '}
        <button type="button" className="cursor-pointer underline" onClick={onRetry}>
          Tentar de novo
        </button>
      </p>
    );
  }

  if (status === 'saving') {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Salvando…
      </p>
    );
  }

  if (status === 'pending') {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Alterações pendentes…
      </p>
    );
  }

  return (
    <p className="text-sm font-medium text-success" role="status">
      Salvo{time ? ` às ${time}` : ''}
    </p>
  );
}

export function PatientDetail({ patientId }: PatientDetailProps) {
  const patientQuery = usePatientGetHook(patientId);
  const form = usePatientUpdateFormHook();
  const update = usePatientUpdateHook(patientId);
  const deactivate = usePatientDeleteHook(patientId);
  const [confirmFuture, setConfirmFuture] = useState(false);
  const [tab, setTab] = useState<PatientDetailTab>('dados');
  const [quoteCreateOpen, setQuoteCreateOpen] = useState(false);
  const [anamnesisSendOpen, setAnamnesisSendOpen] = useState(false);

  useEffect(() => {
    const patient = patientQuery.data;
    if (!patient) return;
    if (form.formState.isDirty) return;
    form.reset({
      name: patient.name,
      socialName: patient.socialName ?? '',
      cpf: patient.cpf ? formatCpfInputMask(patient.cpf) : '',
      birthDate: patient.birthDate ?? '',
      sex: patient.sex === 'M' || patient.sex === 'F' ? patient.sex : '',
      phonePrimary: formatPhoneInputMask(patient.phonePrimary),
      phoneSecondary: patient.phoneSecondary
        ? formatPhoneInputMask(patient.phoneSecondary)
        : '',
      email: patient.email ?? '',
      notes: patient.notes ?? '',
      active: patient.active,
    });
  }, [patientQuery.data, form]);

  const savePatient = useCallback(
    async (values: PatientUpdateFormValues) => {
      await update.mutateAsync(values);
    },
    [update],
  );

  const autosave = usePatientAutosaveHook({
    form,
    enabled: Boolean(patientQuery.data),
    save: savePatient,
  });

  const onTabChange = (next: string | number | null) => {
    if (typeof next !== 'string') return;
    if (tab === 'dados' && next !== 'dados') {
      void autosave.flush();
    }
    setTab(next as PatientDetailTab);
  };

  const onDeactivate = async () => {
    try {
      await deactivate.mutateAsync(confirmFuture);
      setConfirmFuture(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'CONFIRMATION_REQUIRED') {
        setConfirmFuture(true);
      }
    }
  };

  const openNewQuote = () => {
    setTab('orcamentos');
    setQuoteCreateOpen(true);
  };

  if (patientQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando ficha…</p>;
  }

  if (patientQuery.isError || !patientQuery.data) {
    return (
      <div className="grid max-w-xl gap-3">
        <Alert variant="destructive">
          <AlertDescription>{operacionalErrorMessage(patientQuery.error)}</AlertDescription>
        </Alert>
        <div>
          <Link href="/app/pacientes" className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}>
            Voltar para pacientes
          </Link>
        </div>
      </div>
    );
  }

  const patient = patientQuery.data;
  const displayName = patient.socialName || patient.name;
  const age = patientAgeYears(patient.birthDate);
  const initials = patientInitials(displayName);
  const primaryGuardian = patient.guardians[0];
  const hasMinorWarning = patient.warnings.includes('MINOR_WITHOUT_GUARDIAN');
  const showMinorBanner = hasMinorWarning || (age != null && age < 18);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                {displayName}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  patient.active
                    ? 'border-transparent bg-success/15 text-success'
                    : 'text-muted-foreground',
                )}
              >
                {patient.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ficha #{patient.code}
              {' · '}
              {formatPhoneMask(patient.phonePrimary)}
              {age != null ? ` · ${age} anos` : null}
            </p>
          </div>
        </div>
        {tab === 'dados' ? (
          <AutosaveHint
            status={autosave.status}
            savedAt={autosave.savedAt}
            errorMessage={autosave.errorMessage}
            onRetry={() => {
              void autosave.retry();
            }}
          />
        ) : null}
      </div>

      {confirmFuture ? (
        <Alert variant="destructive">
          <AlertTitle>Agendamentos futuros</AlertTitle>
          <AlertDescription>
            Este paciente possui agendamentos futuros. Clique novamente em “Confirmar inativação”
            para prosseguir.
          </AlertDescription>
        </Alert>
      ) : null}

      {showMinorBanner ? (
        <Alert className="border-warning/40 bg-warning/10 text-foreground">
          <AlertDescription>
            {hasMinorWarning
              ? 'Paciente menor sem responsável legal cadastrado.'
              : `Paciente menor — responsável legal cadastrado${
                  primaryGuardian ? ` (${primaryGuardian.name})` : ''
                }.`}
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={onTabChange} className="gap-4">
        <div className="overflow-x-auto border-b border-border">
          <TabsList variant="line" className="h-auto min-h-9 w-max justify-start rounded-none p-0">
            <TabsTrigger value="dados" className="cursor-pointer">
              Dados
            </TabsTrigger>
            <TabsTrigger value="responsaveis" className="cursor-pointer">
              Responsáveis
            </TabsTrigger>
            <TabsTrigger value="consentimentos" className="cursor-pointer">
              Consentimentos
            </TabsTrigger>
            <TabsTrigger value="timeline" className="cursor-pointer">
              Timeline
            </TabsTrigger>
            <Can permission="quotes.read">
              <TabsTrigger value="orcamentos" className="cursor-pointer">
                Orçamentos
              </TabsTrigger>
            </Can>
            <Can permission="finance.read">
              <TabsTrigger value="financeiro" className="cursor-pointer">
                Financeiro
              </TabsTrigger>
            </Can>
            <Can permission="clinical_records.read">
              <TabsTrigger value="prontuario" className="cursor-pointer">
                Prontuário
              </TabsTrigger>
            </Can>
          </TabsList>
        </div>

        <div className="flex gap-4">
          <main className="flex min-w-0 flex-1 flex-col gap-4">
            <TabsContent value="dados" className="mt-0">
              <Card>
                <CardHeader className="border-b border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle>Dados cadastrais</CardTitle>
                      <CardDescription>
                        Alterações são salvas automaticamente.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PatientDadosFields form={form} idPrefix="patient-edit" showActive />
                  {autosave.status === 'error' ? (
                    <Alert variant="destructive" className="mt-4">
                      <AlertDescription>
                        {autosave.errorMessage ?? operacionalErrorMessage(update.error)}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="responsaveis" className="mt-0">
              <PatientGuardiansPanel patientId={patientId} guardians={patient.guardians} />
            </TabsContent>

            <TabsContent value="consentimentos" className="mt-0">
              <PatientConsentsPanel patientId={patientId} consents={patient.consents} />
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              <PatientTimeline patientId={patientId} />
            </TabsContent>

            <Can permission="quotes.read">
              <TabsContent value="orcamentos" className="mt-0">
                <PatientQuotesPanel
                  patientId={patientId}
                  createOpen={quoteCreateOpen}
                  onCreateOpenChange={setQuoteCreateOpen}
                  hideHeaderCreate
                />
              </TabsContent>
            </Can>

            <Can permission="finance.read">
              <TabsContent value="financeiro" className="mt-0">
                <PatientFinancePanel patientId={patientId} />
              </TabsContent>
            </Can>

            <Can permission="clinical_records.read">
              <TabsContent value="prontuario" className="mt-0">
                <PatientRecordPanel
                  patientId={patientId}
                  sendOpen={anamnesisSendOpen}
                  onSendOpenChange={setAnamnesisSendOpen}
                  hideHeaderSend
                />
              </TabsContent>
            </Can>
          </main>

          <PatientDetailAside
            tab={tab}
            patientId={patientId}
            patientActive={patient.active}
            guardians={patient.guardians}
            confirmFuture={confirmFuture}
            deactivatePending={deactivate.isPending}
            onDeactivate={() => {
              void onDeactivate();
            }}
            onNewQuote={openNewQuote}
            onSendAnamnesis={() => {
              setTab('prontuario');
              setAnamnesisSendOpen(true);
            }}
          />
        </div>
      </Tabs>
    </div>
  );
}
