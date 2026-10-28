'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { clinicoErrorMessage } from '@/packages/clinico/helpers/ClinicoErrorMessage';
import { useClinicalNoteListHook } from '@/packages/clinico/hooks/ClinicalNote/useClinicalNoteListHook';
import type { ClinicalNoteSummary } from '@/packages/clinico/types/ClinicalNote/ClinicalNoteTypes';
import { Can } from '@/shared/auth/Can';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

const ClinicalNoteAmendFormDialog = dynamic(
  () =>
    import('@/packages/clinico/components/ClinicalNote/ClinicalNoteAmendFormDialog').then(
      (m) => m.ClinicalNoteAmendFormDialog,
    ),
  { ssr: false },
);

type ClinicalNoteHistoryProps = {
  patientId: string;
};

export function ClinicalNoteHistory({ patientId }: ClinicalNoteHistoryProps) {
  const notesQuery = useClinicalNoteListHook(patientId);
  const [amending, setAmending] = useState<ClinicalNoteSummary | null>(null);

  if (notesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando evoluções…</p>;
  }
  if (notesQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{clinicoErrorMessage(notesQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  const items = notesQuery.data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="grid gap-1 rounded-lg border bg-card p-4">
        <h2 className="text-base font-semibold">Histórico de evoluções</h2>
        <p className="text-sm text-muted-foreground">Nenhuma evolução assinada ainda.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">Histórico de evoluções</h2>
      <ul className="grid gap-3">
        {items.map((note) => (
          <li key={note.id} className="grid gap-2 rounded-md border p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                v{note.version}
                {note.amendReason ? ` · correção: ${note.amendReason}` : ''}
                {' · '}
                {new Date(note.signedAt).toLocaleString('pt-BR')}
                {note.signature.croNumber ? ` · CRO ${note.signature.croNumber}` : ''}
              </p>
              <Can permission="clinical_records.write">
                <Button type="button" size="sm" variant="ghost" onClick={() => setAmending(note)}>
                  Corrigir
                </Button>
              </Can>
            </div>
            <p className="whitespace-pre-wrap">{note.content}</p>
          </li>
        ))}
      </ul>
      {amending ? (
        <ClinicalNoteAmendFormDialog
          patientId={patientId}
          note={amending}
          onClose={() => setAmending(null)}
        />
      ) : null}
    </div>
  );
}
