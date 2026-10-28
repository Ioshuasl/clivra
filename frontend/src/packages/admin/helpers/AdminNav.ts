import type { LucideIcon } from 'lucide-react';
import {
  CalendarDaysIcon,
  CircleDollarSignIcon,
  ContactIcon,
  FileBarChartIcon,
  FileTextIcon,
  HomeIcon,
  ListChecksIcon,
  MessageCircleIcon,
  SettingsIcon,
} from 'lucide-react';
import { SETTINGS_NAV_ITEMS, SETTINGS_PATH } from '@/packages/admin/helpers/SettingsTabs';
import { PRIMEIROS_PASSOS_PATH, ONBOARDING_LEGACY_PATH } from '@/packages/admin/enum/OnboardingStepEnum';

export type AdminNavGroup = 'main' | 'settings';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: AdminNavGroup;
  permission?: string;
  /** Hide from sidebar when onboarding/primeiros passos is completed. */
  hideWhenOnboardingComplete?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/app', label: 'Início', icon: HomeIcon, group: 'main' },
  {
    href: PRIMEIROS_PASSOS_PATH,
    label: 'Primeiros passos',
    icon: ListChecksIcon,
    group: 'main',
    hideWhenOnboardingComplete: true,
  },
  { href: '/app/pacientes', label: 'Pacientes', icon: ContactIcon, group: 'main' },
  { href: '/app/agenda', label: 'Agenda', icon: CalendarDaysIcon, group: 'main' },
  {
    href: '/app/inbox',
    label: 'WhatsApp',
    icon: MessageCircleIcon,
    group: 'main',
    permission: 'messaging.read',
  },
  {
    href: '/app/orcamentos',
    label: 'Orçamentos',
    icon: FileTextIcon,
    group: 'main',
    permission: 'quotes.read',
  },
  {
    href: '/app/financeiro',
    label: 'Financeiro',
    icon: CircleDollarSignIcon,
    group: 'main',
    permission: 'finance.read',
  },
  {
    href: '/app/relatorios',
    label: 'Relatórios',
    icon: FileBarChartIcon,
    group: 'main',
    permission: 'reports.read',
  },
  {
    href: SETTINGS_PATH,
    label: 'Configurações',
    icon: SettingsIcon,
    group: 'settings',
  },
];

export type AdminBreadcrumb = {
  href?: string;
  label: string;
};

export function buildAdminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  if (pathname === '/app' || pathname === '/app/') {
    return [{ label: 'Início' }];
  }

  if (
    pathname === '/app/financeiro/relatorios' ||
    pathname.startsWith('/app/financeiro/relatorios/')
  ) {
    return [
      { label: 'Início', href: '/app' },
      { label: 'Financeiro', href: '/app/financeiro' },
      { label: 'Relatórios' },
    ];
  }

  if (pathname.startsWith(`${SETTINGS_PATH}/`)) {
    const section = SETTINGS_NAV_ITEMS.find((entry) =>
      pathname.startsWith(`${SETTINGS_PATH}/${entry.id}`),
    );
    if (section) {
      return [
        { label: 'Início', href: '/app' },
        { label: 'Configurações', href: `${SETTINGS_PATH}/${section.id}` },
        { label: section.label },
      ];
    }
  }

  for (const item of ADMIN_NAV_ITEMS) {
    if (item.href === '/app') continue;
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      if (pathname.startsWith('/app/relatorios/') && pathname !== '/app/relatorios') {
        const reportLabels: Record<string, string> = {
          faltas: 'Faltas',
          receita: 'Receita',
          producao: 'Procedimentos',
          overdue: 'Inadimplência',
          'no-shows': 'Faltas',
          revenue: 'Receita',
          procedures: 'Procedimentos',
          production: 'Produção',
          'cash-flow': 'Fluxo de caixa',
        };
        const slug = pathname.replace('/app/relatorios/', '').split('/')[0] ?? '';
        return [
          { label: 'Início', href: '/app' },
          { label: item.label, href: item.href },
          { label: reportLabels[slug] ?? 'Detalhe' },
        ];
      }
      return [{ label: 'Início', href: '/app' }, { label: item.label }];
    }
  }

  return [{ label: 'Início', href: '/app' }];
}

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === '/app') {
    return pathname === '/app';
  }
  if (href === SETTINGS_PATH) {
    return pathname === SETTINGS_PATH || pathname.startsWith(`${SETTINGS_PATH}/`);
  }
  if (href === PRIMEIROS_PASSOS_PATH) {
    return (
      pathname === PRIMEIROS_PASSOS_PATH ||
      pathname.startsWith(`${PRIMEIROS_PASSOS_PATH}/`) ||
      pathname === ONBOARDING_LEGACY_PATH ||
      pathname.startsWith(`${ONBOARDING_LEGACY_PATH}/`)
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
