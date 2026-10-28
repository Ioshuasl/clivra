'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import {
  QUOTE_SEND_CHANNELS,
  QUOTE_SEND_CHANNEL_LABELS,
} from '@/packages/operacional/enum/Quote/QuoteSendChannelEnum';
import { useQuoteSendFormHook } from '@/packages/operacional/hooks/Quote/useQuoteSendFormHook';
import { useQuoteSendHook } from '@/packages/operacional/hooks/Quote/useQuoteSendHook';
import type { QuoteSendFormValues } from '@/packages/operacional/schemas/Quote/QuoteSendSchema';
import type { QuoteSendFormDialogProps } from '@/packages/operacional/types/Quote/QuoteSendFormDialogTypes';
import type { QuoteSendResult } from '@/packages/operacional/types/Quote/QuoteTypes';
import { cn } from '@/shared/helpers/utils';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

export function QuoteSendFormDialog({ quoteId, onClose }: QuoteSendFormDialogProps) {
  const form = useQuoteSendFormHook();
  const send = useQuoteSendHook(quoteId);
  const [result, setResult] = useState<QuoteSendResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    true,
    onClose,
  );

  const onSave = async (values: QuoteSendFormValues) => {
    setCopied(false);
    const data = await send.mutateAsync(values);
    setResult(data);
  };

  const onCopy = async () => {
    if (!result?.publicUrl) return;
    await navigator.clipboard.writeText(result.publicUrl);
    setCopied(true);
  };

  const channel = form.watch('channel');

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>Enviar orçamento</SheetTitle>
          <SheetDescription>
            {result
              ? 'Link gerado. O PDF continua em segundo plano.'
              : 'Escolha como o paciente vai receber a proposta.'}
          </SheetDescription>
        </SheetHeader>

        {result ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <Alert role="status">
                <AlertDescription>
                  Enviado via {QUOTE_SEND_CHANNEL_LABELS[result.sentVia]}.
                </AlertDescription>
              </Alert>
              {result.publicUrl ? (
                <Field className="mt-4">
                  <FieldLabel htmlFor="quote-public-url">Link público</FieldLabel>
                  <Input id="quote-public-url" readOnly value={result.publicUrl} />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 w-full cursor-pointer sm:w-auto"
                    onClick={() => void onCopy()}
                  >
                    {copied ? (
                      <CheckIcon className="size-4" strokeWidth={1.7} />
                    ) : (
                      <CopyIcon className="size-4" strokeWidth={1.7} />
                    )}
                    {copied ? 'Copiado' : 'Copiar link'}
                  </Button>
                </Field>
              ) : null}
            </div>
            <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
              <Button type="button" className="cursor-pointer" onClick={requestClose}>
                Fechar
              </Button>
            </SheetFooter>
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <FieldGroup>
                <Field>
                  <FieldLabel id="quote-channel-label">Canal</FieldLabel>
                  <div
                    className="grid gap-2"
                    role="radiogroup"
                    aria-labelledby="quote-channel-label"
                  >
                    {QUOTE_SEND_CHANNELS.map((item) => {
                      const selected = channel === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={cn(
                            'flex cursor-pointer items-center rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                            selected
                              ? 'border-primary bg-primary/5 font-medium text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                          )}
                          onClick={() => form.setValue('channel', item)}
                        >
                          {QUOTE_SEND_CHANNEL_LABELS[item]}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </FieldGroup>

            </div>

            <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={requestClose}
              >
                Cancelar
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={send.isPending}>
                {send.isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
