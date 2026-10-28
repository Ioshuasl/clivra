'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import {
  PATIENT_SIGNATURE_METHOD_LABELS,
  type PatientSignatureMethod,
} from '@/packages/operacional/enum/Document/PatientSignatureMethodEnum';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useSignatureRequestCreateHook } from '@/packages/operacional/hooks/Document/useSignatureRequestCreateHook';
import type { DocumentSignatureRequestFormDialogProps } from '@/packages/operacional/types/Document/DocumentFormDialogTypes';
import type {
  SignatureDeliveryChannel,
  SignatureRequestCreateResult,
} from '@/packages/operacional/types/Document/DocumentSignatureRequestTypes';
import { cn } from '@/shared/helpers/utils';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

const CHANNELS: ReadonlyArray<{ value: SignatureDeliveryChannel; label: string; hint: string }> = [
  { value: 'COPY', label: 'Copiar o link', hint: 'Você cola o link na conversa do paciente.' },
  { value: 'WHATSAPP', label: 'Enviar por WhatsApp', hint: 'Usa o WhatsApp conectado da clínica.' },
  { value: 'EMAIL', label: 'Enviar por e-mail', hint: 'O paciente precisa ter e-mail cadastrado.' },
];

const SENT_LABELS: Record<SignatureDeliveryChannel, string> = {
  WHATSAPP: 'pelo WhatsApp',
  EMAIL: 'por e-mail',
  COPY: 'como link para copiar',
};

export function DocumentSignatureRequestFormDialog({
  documentId,
  documentTitle,
  onClose,
}: DocumentSignatureRequestFormDialogProps) {
  const create = useSignatureRequestCreateHook();
  const [channel, setChannel] = useState<SignatureDeliveryChannel>('COPY');
  const [result, setResult] = useState<SignatureRequestCreateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    true,
    onClose,
  );

  const onSend = async () => {
    setServerError(null);
    try {
      setResult(await create.mutateAsync({ documentId, channel }));
    } catch (error) {
      setServerError(operacionalErrorMessage(error));
    }
  };

  const onCopy = async () => {
    if (!result?.publicUrl) return;
    await navigator.clipboard.writeText(result.publicUrl);
    setCopied(true);
  };

  const methodLabel = (method: PatientSignatureMethod) => PATIENT_SIGNATURE_METHOD_LABELS[method].toLowerCase();

  return (
    <Sheet open={sheetOpen} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>Pedir assinatura do paciente</SheetTitle>
          <SheetDescription>
            {result
              ? 'Pedido criado. O link vale por 7 dias e só pode ser usado uma vez.'
              : `O paciente vai ler “${documentTitle}” e assinar pelo celular.`}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {result ? (
            <div className="grid gap-4">
              <Alert role="status">
                <AlertDescription>
                  Enviado {SENT_LABELS[result.sentVia]}. A confirmação será por {methodLabel(result.method)}.
                </AlertDescription>
              </Alert>
              {result.sentVia !== channel ? (
                <p className="text-sm text-muted-foreground">
                  Você escolheu outro canal, mas ele não estava disponível (WhatsApp desconectado ou paciente sem
                  e-mail), então usamos este.
                </p>
              ) : null}
              {result.publicUrl ? (
                <Field>
                  <FieldLabel htmlFor="signature-public-url">Link para o paciente</FieldLabel>
                  <Input id="signature-public-url" readOnly value={result.publicUrl} />
                  <Button type="button" variant="outline" className="mt-2 w-full cursor-pointer sm:w-auto" onClick={() => void onCopy()}>
                    {copied ? <CheckIcon className="size-4" strokeWidth={1.7} /> : <CopyIcon className="size-4" strokeWidth={1.7} />}
                    {copied ? 'Copiado' : 'Copiar link'}
                  </Button>
                  <FieldDescription>Cole na conversa com o paciente. Um novo pedido desativa este link.</FieldDescription>
                </Field>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4">
              <Field>
                <FieldLabel id="signature-channel-label">Como enviar?</FieldLabel>
                <div className="grid gap-2" role="radiogroup" aria-labelledby="signature-channel-label">
                  {CHANNELS.map((item) => {
                    const selected = item.value === channel;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={cn(
                          'flex cursor-pointer flex-col rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                          selected
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                        )}
                        onClick={() => setChannel(item.value)}
                      >
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-xs">{item.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>
              {serverError ? (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
          {result ? (
            <Button type="button" className="cursor-pointer" onClick={requestClose}>
              Fechar
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" className="cursor-pointer" onClick={requestClose}>
                Cancelar
              </Button>
              <Button type="button" className="cursor-pointer" disabled={create.isPending} onClick={() => void onSend()}>
                {create.isPending ? 'Criando…' : 'Criar pedido'}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
