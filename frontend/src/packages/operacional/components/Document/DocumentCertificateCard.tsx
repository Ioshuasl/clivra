'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ShieldCheckIcon } from 'lucide-react';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useCertificateDeleteHook } from '@/packages/operacional/hooks/Document/useCertificateDeleteHook';
import { useCertificateGetHook } from '@/packages/operacional/hooks/Document/useCertificateGetHook';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const DocumentCertificateFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Document/DocumentCertificateFormDialog').then(
      (m) => m.DocumentCertificateFormDialog,
    ),
  { ssr: false },
);

/** Cartão pessoal: só aparece para quem é profissional (dentista) cadastrado na clínica. */
export function DocumentCertificateCard() {
  const certificate = useCertificateGetHook();
  const remove = useCertificateDeleteHook();
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (certificate.isLoading) return <Skeleton className="h-28 rounded-2xl" />;
  if (certificate.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{operacionalErrorMessage(certificate.error)}</AlertDescription>
      </Alert>
    );
  }
  if (!certificate.data || certificate.data.professionalId === null) return null;

  const info = certificate.data.certificate;

  return (
    <section
      aria-labelledby="certificate-card-title"
      className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(74_15_22/0.04)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <ShieldCheckIcon className="size-4" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="certificate-card-title" className="text-sm font-semibold text-foreground">
            Meu certificado digital (A1)
          </h2>
          {info ? (
            <div className="mt-1 grid gap-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              <p className="font-medium text-foreground">{info.subjectName}</p>
              <p>Emitido por {info.issuerName}</p>
              <p>Válido até {new Date(info.notAfter).toLocaleDateString('pt-BR')}</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Com ele você assina receitas, atestados e contratos direto no sistema. O arquivo fica guardado
              com criptografia e a senha nunca é salva: você digita a cada assinatura.
            </p>
          )}
        </div>
        {info ? (
          <Badge variant={info.expired ? 'destructive' : 'secondary'}>{info.expired ? 'Vencido' : 'Válido'}</Badge>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {info && confirming ? (
          <>
            <span className="mr-auto text-xs text-muted-foreground">
              Remover? Documentos já assinados continuam válidos.
            </span>
            <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => setConfirming(false)}>
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="cursor-pointer"
              disabled={remove.isPending}
              onClick={() => remove.mutate(undefined, { onSuccess: () => setConfirming(false) })}
            >
              Sim, remover
            </Button>
          </>
        ) : (
          <>
            {info ? (
              <Button type="button" variant="ghost" size="sm" className="cursor-pointer text-muted-foreground" onClick={() => setConfirming(true)}>
                Remover
              </Button>
            ) : null}
            <Button type="button" variant={info ? 'outline' : 'default'} size="sm" className="cursor-pointer" onClick={() => setUploading(true)}>
              {info ? 'Trocar certificado' : 'Enviar certificado'}
            </Button>
          </>
        )}
      </div>

      {uploading ? (
        <DocumentCertificateFormDialog replacing={Boolean(info)} onClose={() => setUploading(false)} />
      ) : null}
    </section>
  );
}
