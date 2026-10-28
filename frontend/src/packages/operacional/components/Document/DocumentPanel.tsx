'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FileTextIcon, PlusIcon } from 'lucide-react';
import { DOCUMENT_KIND_LABELS } from '@/packages/operacional/enum/Document/DocumentKindEnum';
import {
  DOCUMENT_STATUS_LABELS,
  type DocumentStatus,
} from '@/packages/operacional/enum/Document/DocumentStatusEnum';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import {
  canRequestPatientSignature,
  canSignAsProfessional,
  patientSignature,
  pendingSignatures,
  professionalSignature,
} from '@/packages/operacional/helpers/DocumentSignatureState';
import { useCertificateGetHook } from '@/packages/operacional/hooks/Document/useCertificateGetHook';
import { useDocumentListHook } from '@/packages/operacional/hooks/Document/useDocumentListHook';
import { useDocumentPdfHook } from '@/packages/operacional/hooks/Document/useDocumentPdfHook';
import type { DocumentPanelProps } from '@/packages/operacional/types/Document/DocumentFormDialogTypes';
import type { DocumentSummary } from '@/packages/operacional/types/Document/DocumentTypes';
import { Can } from '@/shared/auth/Can';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { cn } from '@/shared/helpers/utils';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const DocumentIssueFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Document/DocumentIssueFormDialog').then(
      (m) => m.DocumentIssueFormDialog,
    ),
  { ssr: false },
);

const DocumentCancelFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Document/DocumentCancelFormDialog').then(
      (m) => m.DocumentCancelFormDialog,
    ),
  { ssr: false },
);

const DocumentSignFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Document/DocumentSignFormDialog').then(
      (m) => m.DocumentSignFormDialog,
    ),
  { ssr: false },
);

const DocumentSignatureRequestFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Document/DocumentSignatureRequestFormDialog').then(
      (m) => m.DocumentSignatureRequestFormDialog,
    ),
  { ssr: false },
);

const STATUS_BADGE: Record<DocumentStatus, 'secondary' | 'default' | 'outline' | 'destructive'> = {
  ISSUED: 'secondary',
  AWAITING_SIGNATURE: 'outline',
  SIGNED: 'default',
  CANCELLED: 'destructive',
};

type IssueTarget = { amendDocumentId?: string } | null;

export function DocumentPanel({ patientId }: DocumentPanelProps) {
  const { me } = useAuth();
  const documents = useDocumentListHook(patientId);
  // Quem não é dentista/dono nem chama a API do certificado.
  const myCertificate = useCertificateGetHook(hasPermission(me, 'clinical_records.write'));
  const myProfessionalId = myCertificate.data?.professionalId;
  const pdf = useDocumentPdfHook();
  const [issuing, setIssuing] = useState<IssueTarget>(null);
  const [cancelling, setCancelling] = useState<DocumentSummary | null>(null);
  const [signing, setSigning] = useState<DocumentSummary | null>(null);
  const [requesting, setRequesting] = useState<DocumentSummary | null>(null);
  const [signedNotice, setSignedNotice] = useState<string | null>(null);
  const [notice, setNotice] = useState<DocumentSummary | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const openPdf = (documentId: string) => {
    setPdfError(null);
    // Abre a aba já no clique para o navegador não bloquear; depois aponta para o PDF.
    const popup = window.open('', '_blank');
    pdf.mutate(documentId, {
      onSuccess: (result) => {
        if (popup) popup.location.href = result.url;
        else window.location.assign(result.url);
      },
      onError: (error) => {
        popup?.close();
        setPdfError(operacionalErrorMessage(error));
      },
    });
  };

  const items = documents.data ?? [];

  return (
    <section className="grid gap-4" aria-labelledby="patient-documents-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="patient-documents-title" className="text-base font-semibold text-foreground">
            Documentos
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Receitas, atestados, termos e contratos deste paciente.
          </p>
        </div>
        <Can permission="patients.write">
          <Button type="button" className="cursor-pointer" onClick={() => setIssuing({})}>
            <PlusIcon className="size-4" strokeWidth={1.7} />
            Novo documento
          </Button>
        </Can>
      </div>

      {notice ? (
        <Alert role="status">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>“{notice.title}” foi emitido e já está na lista.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => openPdf(notice.id)}
            >
              Abrir PDF
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {signedNotice ? (
        <Alert role="status">
          <AlertDescription>{signedNotice}</AlertDescription>
        </Alert>
      ) : null}

      {pdfError ? (
        <Alert variant="destructive">
          <AlertDescription>{pdfError}</AlertDescription>
        </Alert>
      ) : null}

      {documents.isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : documents.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{operacionalErrorMessage(documents.error)}</AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">Nenhum documento ainda</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Emita uma receita, um atestado, um termo ou um contrato a partir de um modelo da clínica.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {items.map((document) => {
            const cancelled = document.status === 'CANCELLED';
            return (
              <li
                key={document.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <FileTextIcon className="size-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-48 flex-1">
                  <p
                    className={cn(
                      'text-sm font-semibold break-words text-foreground',
                      cancelled && 'text-muted-foreground line-through',
                    )}
                  >
                    {document.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_KIND_LABELS[document.kind]} ·{' '}
                    {new Date(document.issuedAt).toLocaleDateString('pt-BR')}
                    {document.version > 1 ? ` · versão ${document.version}` : ''}
                  </p>
                  {professionalSignature(document) ? (
                    <p className="text-xs text-muted-foreground">
                      Assinado digitalmente por {professionalSignature(document)?.signerName} em{' '}
                      {new Date(professionalSignature(document)?.signedAt ?? '').toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  ) : null}
                  {patientSignature(document) ? (
                    <p className="text-xs text-muted-foreground">
                      Assinado pelo paciente em{' '}
                      {new Date(patientSignature(document)?.signedAt ?? '').toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      {patientSignature(document)?.method === 'PATIENT_WHATSAPP_CODE' ? ' (com código de confirmação)' : ''}
                    </p>
                  ) : null}
                  {pendingSignatures(document).length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Falta: {pendingSignatures(document).join(' e ')}.
                    </p>
                  ) : null}
                </div>
                <Badge variant={STATUS_BADGE[document.status]}>{DOCUMENT_STATUS_LABELS[document.status]}</Badge>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={!document.hasPdf || pdf.isPending}
                    onClick={() => openPdf(document.id)}
                  >
                    Abrir PDF
                  </Button>
                  {canSignAsProfessional(document, myProfessionalId) ? (
                    <Button
                      type="button"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => {
                        setSignedNotice(null);
                        setSigning(document);
                      }}
                    >
                      Assinar
                    </Button>
                  ) : null}
                  {canRequestPatientSignature(document) ? (
                    <Can permission="patients.write">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setRequesting(document)}
                      >
                        Pedir assinatura do paciente
                      </Button>
                    </Can>
                  ) : null}
                  {!cancelled ? (
                    <Can permission="patients.write">
                      {document.templateId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => setIssuing({ amendDocumentId: document.id })}
                        >
                          Corrigir
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer text-muted-foreground"
                        onClick={() => setCancelling(document)}
                      >
                        Cancelar
                      </Button>
                    </Can>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {issuing ? (
        <DocumentIssueFormDialog
          patientId={patientId}
          amendDocumentId={issuing.amendDocumentId}
          onClose={() => setIssuing(null)}
          onIssued={setNotice}
        />
      ) : null}
      {signing ? (
        <DocumentSignFormDialog
          patientId={patientId}
          documentId={signing.id}
          documentTitle={signing.title}
          onClose={() => setSigning(null)}
          onSigned={(signed) => {
            setNotice(null);
            setSignedNotice(`“${signed.title}” foi assinado digitalmente.`);
          }}
        />
      ) : null}
      {requesting ? (
        <DocumentSignatureRequestFormDialog
          documentId={requesting.id}
          documentTitle={requesting.title}
          onClose={() => setRequesting(null)}
        />
      ) : null}
      {cancelling ? (
        <DocumentCancelFormDialog
          patientId={patientId}
          documentId={cancelling.id}
          documentTitle={cancelling.title}
          onClose={() => setCancelling(null)}
        />
      ) : null}
    </section>
  );
}
