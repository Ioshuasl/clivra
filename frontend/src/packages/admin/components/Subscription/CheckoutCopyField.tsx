'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

type CheckoutCopyFieldProps = {
  label: string;
  value: string;
  buttonLabel: string;
  testId?: string;
};

/** Campo somente leitura + botão de copiar (código Pix / linha digitável). */
export function CheckoutCopyField({ label, value, buttonLabel, testId }: CheckoutCopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium text-muted-foreground" htmlFor={testId}>
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          id={testId}
          readOnly
          value={value}
          className="min-w-0 flex-1 font-mono text-xs"
          onFocus={(event) => event.currentTarget.select()}
          data-testid={testId}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 cursor-pointer"
          onClick={() => {
            void onCopy();
          }}
        >
          {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copied ? 'Copiado' : buttonLabel}
        </Button>
      </div>
    </div>
  );
}
