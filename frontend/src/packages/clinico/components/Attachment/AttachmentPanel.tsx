'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { AttachmentCompare } from '@/packages/clinico/components/Attachment/AttachmentCompare';
import {
  ATTACHMENT_CATEGORY_LABELS,
  type AttachmentCategory,
} from '@/packages/clinico/enum/Attachment/AttachmentCategoryEnum';
import { clinicoErrorMessage } from '@/packages/clinico/helpers/ClinicoErrorMessage';
import { useAttachmentDownloadHook } from '@/packages/clinico/hooks/Attachment/useAttachmentDownloadHook';
import { useAttachmentListHook } from '@/packages/clinico/hooks/Attachment/useAttachmentListHook';
import type { AttachmentSummary } from '@/packages/clinico/types/Attachment/AttachmentTypes';
import { Can } from '@/shared/auth/Can';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

const AttachmentUploadFormDialog = dynamic(
  () =>
    import('@/packages/clinico/components/Attachment/AttachmentUploadFormDialog').then(
      (m) => m.AttachmentUploadFormDialog,
    ),
  { ssr: false },
);

const AttachmentDeleteFormDialog = dynamic(
  () =>
    import('@/packages/clinico/components/Attachment/AttachmentDeleteFormDialog').then(
      (m) => m.AttachmentDeleteFormDialog,
    ),
  { ssr: false },
);

type AttachmentPanelProps = {
  patientId: string;
};

export function AttachmentPanel({ patientId }: AttachmentPanelProps) {
  const listQuery = useAttachmentListHook(patientId);
  const download = useAttachmentDownloadHook();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [deleting, setDeleting] = useState<AttachmentSummary | null>(null);

  const onDownload = async (attachmentId: string) => {
    const result = await download.mutateAsync(attachmentId);
    window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  const items = listQuery.data ?? [];

  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-base font-semibold">Anexos (radiografias, fotos e documentos)</h2>
        <Can permission="clinical_records.write">
          <Button type="button" onClick={() => setUploadOpen(true)}>
            Enviar anexo
          </Button>
        </Can>
      </div>

      {uploaded ? (
        <Alert>
          <AlertDescription>Anexo enviado com sucesso.</AlertDescription>
        </Alert>
      ) : null}

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando anexos…</p>
      ) : listQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{clinicoErrorMessage(listQuery.error)}</AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{item.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {ATTACHMENT_CATEGORY_LABELS[item.category as AttachmentCategory] ?? item.category}
                  {' · '}
                  {new Date(item.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void onDownload(item.id);
                  }}
                >
                  Baixar
                </Button>
                <Can permission="clinical_records.write">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setDeleting(item)}>
                    Excluir
                  </Button>
                </Can>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AttachmentCompare attachments={items} />

      {uploadOpen ? (
        <AttachmentUploadFormDialog
          patientId={patientId}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => setUploaded(true)}
        />
      ) : null}

      {deleting ? (
        <AttachmentDeleteFormDialog attachment={deleting} onClose={() => setDeleting(null)} />
      ) : null}
    </div>
  );
}
