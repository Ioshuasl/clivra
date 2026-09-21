'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { FilePlusIcon } from 'lucide-react';
import type { QuoteStatus } from '@/packages/operacional/enum/Quote/QuoteStatusEnum';
import { QuoteFilter } from '@/packages/operacional/components/Quote/QuoteFilter';
import { QuoteTable } from '@/packages/operacional/components/Quote/QuoteTable';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { usePatientListHook } from '@/packages/operacional/hooks/Patient/usePatientListHook';
import { useQuoteDuplicateHook } from '@/packages/operacional/hooks/Quote/useQuoteDuplicateHook';
import { useQuoteListHook } from '@/packages/operacional/hooks/Quote/useQuoteListHook';
import { useQuotePdfHook } from '@/packages/operacional/hooks/Quote/useQuotePdfHook';
import type { QuoteSummary } from '@/packages/operacional/types/Quote/QuoteTypes';
import { Can } from '@/shared/auth/Can';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { Button } from '@/shared/ui/button';

const QuoteFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Quote/QuoteFormDialog').then(
      (m) => m.QuoteFormDialog,
    ),
  { ssr: false },
);

const QuoteSendFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Quote/QuoteSendFormDialog').then(
      (m) => m.QuoteSendFormDialog,
    ),
  { ssr: false },
);

const QuoteDecisionFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Quote/QuoteDecisionFormDialog').then(
      (m) => m.QuoteDecisionFormDialog,
    ),
  { ssr: false },
);

export function QuoteIndex() {
  const [patientSearch, setPatientSearch] = useState('');
  const deferredSearch = useDeferredValue(patientSearch);
  const [status, setStatus] = useState<QuoteStatus | ''>('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientLabel, setSelectedPatientLabel] = useState('');
  const [formQuoteId, setFormQuoteId] = useState<string | undefined>();
  const [formPatientId, setFormPatientId] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [sendQuoteId, setSendQuoteId] = useState<string | null>(null);
  const [decideQuoteId, setDecideQuoteId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const patientsQuery = usePatientListHook(deferredSearch, { active: 'true', limit: 30 });
  const namesQuery = usePatientListHook('');
  const listQuery = useQuoteListHook({
    patientId: selectedPatientId || undefined,
    status: status || undefined,
  });
  const duplicate = useQuoteDuplicateHook();
  const pdf = useQuotePdfHook();

  const patientNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const patient of [
      ...(namesQuery.data?.items ?? []),
      ...(patientsQuery.data?.items ?? []),
    ]) {
      map[patient.id] = patient.socialName || patient.name;
    }
    if (selectedPatientId && selectedPatientLabel) {
      map[selectedPatientId] = selectedPatientLabel.replace(/\s*\(#\d+\)$/, '');
    }
    return map;
  }, [
    namesQuery.data?.items,
    patientsQuery.data?.items,
    selectedPatientId,
    selectedPatientLabel,
  ]);

  const openQuote = (quote: QuoteSummary) => {
    setFormQuoteId(quote.id);
    setFormPatientId(quote.patientId);
    setFormOpen(true);
  };

  return (
    <div className="grid min-w-0 gap-4">
      <ClivraPageHeader
        title="Orçamentos"
        description="Crie, envie e acompanhe propostas por paciente."
        action={
          <Can permission="quotes.write">
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => {
                setFormQuoteId(undefined);
                setFormPatientId(selectedPatientId || undefined);
                setFormOpen(true);
              }}
            >
              <FilePlusIcon className="size-4" strokeWidth={1.7} />
              Novo orçamento
            </Button>
          </Can>
        }
      />

      <ClivraSurface
        toolbar={
          <QuoteFilter
            patientId={selectedPatientId}
            onPatientIdChange={(id) => {
              setSelectedPatientId(id);
              if (!id) {
                setSelectedPatientLabel('');
                return;
              }
              const match = patientsQuery.data?.items.find((item) => item.id === id);
              setSelectedPatientLabel(
                match
                  ? `${match.socialName || match.name} (#${match.code})`
                  : patientNames[id] || '',
              );
            }}
            onPatientSearchChange={setPatientSearch}
            patients={patientsQuery.data?.items ?? []}
            patientsLoading={patientsQuery.isFetching}
            patientLabelById={(id) => {
              if (id === selectedPatientId && selectedPatientLabel) return selectedPatientLabel;
              const match = patientsQuery.data?.items.find((item) => item.id === id);
              if (match) return `${match.socialName || match.name} (#${match.code})`;
              return patientNames[id] ?? id;
            }}
            status={status}
            onStatusChange={setStatus}
          />
        }
      >
        {listQuery.isError ? (
          <div className="px-4 py-6">
            <p className="text-sm text-destructive" role="alert">
              {operacionalErrorMessage(listQuery.error)}
            </p>
            <Button
              type="button"
              variant="link"
              className="mt-2 h-auto cursor-pointer px-0"
              onClick={() => void listQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {duplicate.isError || pdf.isError ? (
              <div className="border-b border-border/80 px-4 py-3">
                <p className="text-sm text-destructive" role="alert">
                  {operacionalErrorMessage(duplicate.error ?? pdf.error)}
                </p>
              </div>
            ) : null}
            <QuoteTable
              quotes={listQuery.data?.items ?? []}
              patientNames={patientNames}
              loading={listQuery.isLoading}
              onRowClick={openQuote}
              onEdit={openQuote}
              onSend={(quote) => setSendQuoteId(quote.id)}
              onDecide={(quote) => setDecideQuoteId(quote.id)}
              onDuplicate={(quote) => {
                void duplicate.mutateAsync(quote.id);
              }}
              onPdf={(quote) => {
                setPdfLoadingId(quote.id);
                void pdf
                  .mutateAsync(quote.id)
                  .then((result) => {
                    window.open(result.url, '_blank', 'noopener,noreferrer');
                  })
                  .finally(() => setPdfLoadingId(null));
              }}
              duplicatingId={duplicate.isPending ? duplicate.variables ?? null : null}
              pdfLoadingId={pdfLoadingId}
            />
          </>
        )}
      </ClivraSurface>

      {formOpen ? (
        <QuoteFormDialog
          open={formOpen}
          quoteId={formQuoteId}
          patientId={formPatientId}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
      {sendQuoteId ? (
        <QuoteSendFormDialog quoteId={sendQuoteId} onClose={() => setSendQuoteId(null)} />
      ) : null}
      {decideQuoteId ? (
        <QuoteDecisionFormDialog quoteId={decideQuoteId} onClose={() => setDecideQuoteId(null)} />
      ) : null}
    </div>
  );
}
