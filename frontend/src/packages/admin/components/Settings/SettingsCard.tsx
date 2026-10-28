import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/helpers/utils';

type SettingsCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Cartão de um grupo de ajustes: cabeçalho suave (título + explicação) e corpo com os campos. */
export function SettingsCard({
  title,
  description,
  action,
  children,
  className,
}: SettingsCardProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(74_15_22/0.04)]',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 bg-muted/40 px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex items-center gap-2">{action}</div> : null}
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

type SettingsSaveBarProps = {
  visible: boolean;
  saving: boolean;
  onDiscard: () => void;
};

/** Barra fixa no rodapé: só aparece quando há alterações e deixa claro o que fazer. */
export function SettingsSaveBar({ visible, saving, onDiscard }: SettingsSaveBarProps) {
  if (!visible) return null;
  return (
    <div
      role="region"
      aria-label="Alterações pendentes"
      className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-[var(--shadow-clivra-lg)] backdrop-blur"
    >
      <p className="text-sm text-foreground">Você alterou dados e ainda não salvou.</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          disabled={saving}
          onClick={onDiscard}
        >
          Descartar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  );
}
