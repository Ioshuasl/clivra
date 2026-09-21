'use client';

import Link from 'next/link';
import {
  CalendarPlusIcon,
  CirclePlusIcon,
  CreditCardIcon,
  ListChecksIcon,
  UserPlusIcon,
  ZapIcon,
} from 'lucide-react';
import { PRIMEIROS_PASSOS_PATH } from '@/packages/admin/enum/OnboardingStepEnum';
import { cn } from '@/shared/helpers/utils';

const BASE_ACTIONS = [
  {
    href: '/app/pacientes',
    label: 'Novo paciente',
    icon: UserPlusIcon,
  },
  {
    href: '/app/agenda',
    label: 'Agendar consulta',
    icon: CalendarPlusIcon,
  },
  {
    href: '/app/agenda',
    label: 'Novo atendimento',
    icon: CirclePlusIcon,
  },
  {
    href: '/app/financeiro',
    label: 'Lançar despesa',
    icon: CreditCardIcon,
  },
] as const;

type DashboardQuickActionsProps = {
  showPrimeirosPassos?: boolean;
};

export function DashboardQuickActions({ showPrimeirosPassos = false }: DashboardQuickActionsProps) {
  const actions = showPrimeirosPassos
    ? [
        {
          href: PRIMEIROS_PASSOS_PATH,
          label: 'Primeiros passos',
          icon: ListChecksIcon,
        },
        ...BASE_ACTIONS,
      ]
    : [...BASE_ACTIONS];

  return (
    <section
      className="shrink-0 rounded-[14px] border border-border bg-card p-4 shadow-clivra-sm"
      data-testid="dashboard-quick-actions"
    >
      <header className="mb-3.5 flex items-center gap-2">
        <ZapIcon className="size-4 text-primary" strokeWidth={1.6} />
        <h2 className="text-[15px] font-semibold text-primary">Ações rápidas</h2>
      </header>

      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              prefetch={false}
              className={cn(
                'flex min-h-[3.25rem] cursor-pointer items-center gap-2.5 rounded-[10px] border border-border bg-card px-3 py-2.5',
                'text-left transition-colors hover:border-primary/20 hover:bg-muted/40',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <Icon className="size-4" strokeWidth={1.55} />
              </span>
              <span className="min-w-0 text-[12px] font-medium leading-snug text-foreground">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
