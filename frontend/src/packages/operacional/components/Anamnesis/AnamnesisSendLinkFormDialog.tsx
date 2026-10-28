'use client';

import { useState } from 'react';
import {
  SEND_LINK_CHANNELS,
  SEND_LINK_CHANNEL_LABELS,
} from '@/packages/operacional/enum/Anamnesis/SendLinkChannelEnum';
import { useAnamnesisSendLinkFormHook } from '@/packages/operacional/hooks/Anamnesis/useAnamnesisSendLinkFormHook';
import { useAnamnesisSendLinkHook } from '@/packages/operacional/hooks/Anamnesis/useAnamnesisSendLinkHook';
import type { AnamnesisSendLinkFormValues } from '@/packages/operacional/schemas/Anamnesis/AnamnesisSendLinkSchema';
import type { AnamnesisSendLinkFormDialogProps } from '@/packages/operacional/types/Anamnesis/AnamnesisSendLinkFormDialogTypes';
import type { AnamnesisSendLinkResult } from '@/packages/operacional/types/Anamnesis/AnamnesisTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

export function AnamnesisSendLinkFormDialog({
  patientId,
  onClose,
}: AnamnesisSendLinkFormDialogProps) {
  const form = useAnamnesisSendLinkFormHook();
  const sendLink = useAnamnesisSendLinkHook(patientId);
  const [result, setResult] = useState<AnamnesisSendLinkResult | null>(null);
  const [copied, setCopied] = useState(false);

  const onSave = async (values: AnamnesisSendLinkFormValues) => {
    setCopied(false);
    const data = await sendLink.mutateAsync({ patientId, sendLinkSchema: values });
    setResult(data);
  };

  const onCopy = async () => {
    if (!result?.publicUrl) return;
    await navigator.clipboard.writeText(result.publicUrl);
    setCopied(true);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Enviar anamnese</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="grid gap-3">
              <Alert>
                <AlertDescription>
                  Enviado via {SEND_LINK_CHANNEL_LABELS[result.sentVia as keyof typeof SEND_LINK_CHANNEL_LABELS] ?? result.sentVia}.
                  Expira em 7 dias.
                </AlertDescription>
              </Alert>
              {result.publicUrl ? (
                <Field>
                  <FieldLabel htmlFor="anamnesis-public-url">Link público</FieldLabel>
                  <Input id="anamnesis-public-url" readOnly value={result.publicUrl} />
                  <Button type="button" variant="outline" onClick={() => void onCopy()}>
                    {copied ? 'Copiado' : 'Copiar link'}
                  </Button>
                </Field>
              ) : null}
              <DialogFooter>
                <Button type="button" onClick={onClose}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                void form.handleSubmit(onSave)(event);
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="anamnesis-channel">Canal</FieldLabel>
                  <NativeSelect
                    id="anamnesis-channel"
                    value={form.watch('channel')}
                    onChange={(event) => {
                      form.setValue(
                        'channel',
                        event.target.value as AnamnesisSendLinkFormValues['channel'],
                      );
                    }}
                  >
                    {SEND_LINK_CHANNELS.map((channel) => (
                      <NativeSelectOption key={channel} value={channel}>
                        {SEND_LINK_CHANNEL_LABELS[channel]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={sendLink.isPending}>
                  {sendLink.isPending ? 'Enviando…' : 'Enviar'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
