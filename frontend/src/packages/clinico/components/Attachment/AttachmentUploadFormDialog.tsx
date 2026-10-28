'use client';

import { useState, type DragEvent } from 'react';
import {
  ATTACHMENT_CATEGORIES,
  ATTACHMENT_CATEGORY_LABELS,
  type AttachmentCategory,
} from '@/packages/clinico/enum/Attachment/AttachmentCategoryEnum';
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_ALLOWLIST,
} from '@/packages/clinico/helpers/AttachmentChecksum';
import { clinicoErrorMessage } from '@/packages/clinico/helpers/ClinicoErrorMessage';
import { useAttachmentUploadHook } from '@/packages/clinico/hooks/Attachment/useAttachmentUploadHook';
import type { AttachmentUploadFormDialogProps } from '@/packages/clinico/types/Attachment/AttachmentUploadFormDialogTypes';
import { cn } from '@/shared/helpers/utils';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function AttachmentUploadFormDialog({
  patientId,
  onClose,
  onUploaded,
}: AttachmentUploadFormDialogProps) {
  const upload = useAttachmentUploadHook(patientId);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<AttachmentCategory>('XRAY');
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const pickFile = (picked: File | undefined) => {
    if (!picked) return;
    upload.reset();
    if (!ATTACHMENT_MIME_ALLOWLIST.includes(picked.type as (typeof ATTACHMENT_MIME_ALLOWLIST)[number])) {
      setFile(null);
      setFileError('Este tipo de arquivo não é aceito. Envie uma foto (JPG, PNG, WEBP) ou um PDF.');
      return;
    }
    if (picked.size > ATTACHMENT_MAX_BYTES) {
      setFile(null);
      setFileError('O arquivo é maior que 20 MB. Reduza o tamanho e tente de novo.');
      return;
    }
    setFileError(null);
    setFile(picked);
    if (picked.type === 'application/pdf' && category === 'XRAY') setCategory('DOCUMENT');
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files[0]);
  };

  const onSend = async () => {
    if (!file) return;
    await upload.mutateAsync({ file, category });
    onUploaded();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !upload.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Enviar anexo</DialogTitle>
            <DialogDescription>
              Radiografias, fotos, exames e documentos do paciente. Aceitamos JPG, PNG, WEBP e PDF de até 20 MB.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-5">
            <div className="grid gap-2">
              <p className="text-sm font-medium">1. Escolha o arquivo</p>
              <label
                htmlFor="attachment-upload-file"
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors hover:bg-muted/50',
                  dragging && 'border-primary bg-muted/50',
                  file && 'border-primary/40 bg-muted/30',
                )}
              >
                {file ? (
                  <>
                    <span className="text-sm font-medium break-all">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatSize(file.size)} · clique ou arraste para trocar
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium">Arraste o arquivo para cá</span>
                    <span className="text-xs text-muted-foreground">ou clique para escolher no computador</span>
                  </>
                )}
                <input
                  id="attachment-upload-file"
                  type="file"
                  className="sr-only"
                  accept={ATTACHMENT_MIME_ALLOWLIST.join(',')}
                  disabled={upload.isPending}
                  onChange={(event) => {
                    pickFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">2. Que tipo de arquivo é este?</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo do arquivo">
                {ATTACHMENT_CATEGORIES.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    role="radio"
                    aria-checked={category === item}
                    variant={category === item ? 'default' : 'outline'}
                    disabled={upload.isPending}
                    onClick={() => setCategory(item)}
                  >
                    {ATTACHMENT_CATEGORY_LABELS[item]}
                  </Button>
                ))}
              </div>
            </div>

            {upload.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{clinicoErrorMessage(upload.error)}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={upload.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!file || upload.isPending}
              onClick={() => {
                void onSend();
              }}
            >
              {upload.isPending ? 'Enviando…' : 'Enviar anexo'}
            </Button>
          </DialogFooter>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
