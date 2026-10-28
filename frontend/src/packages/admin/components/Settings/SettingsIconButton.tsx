'use client';

import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

type SettingsIconButtonProps = {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  /** Abre em nova aba (ex.: fatura, pacote LGPD). */
  href?: string;
  disabled?: boolean;
  destructive?: boolean;
};

/** Ação de linha de tabela: só o ícone, com o nome na dica e para leitor de tela. */
export function SettingsIconButton({
  label,
  children,
  onClick,
  href,
  disabled,
  destructive,
}: SettingsIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={
              destructive
                ? 'cursor-pointer text-muted-foreground hover:text-destructive'
                : 'cursor-pointer text-muted-foreground hover:text-foreground'
            }
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            {...(href
              ? {
                  nativeButton: false,
                  render: <a href={href} target="_blank" rel="noreferrer" />,
                }
              : {})}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
