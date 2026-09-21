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
import {
  SETTINGS_NAV_ITEMS,
  SETTINGS_PATH,
  settingsHref,
  type SettingsNavItem,
} from '@/packages/admin/helpers/SettingsTabs';
import { PRIMEIROS_PASSOS_PATH, ONBOARDING_LEGACY_PATH } from '@/packages/admin/enum/OnboardingStepEnum';

export type AdminNavGroup = 'main' | 'settings';

export type AdminNavChild = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
};

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: AdminNavGroup;
  permission?: string;
  children?: AdminNavChild[];
  /** Hide from sidebar when onboarding/primeiros passos is completed. */
  hideWhenOnboardingComplete?: boolean;
};

function toNavChild(item: SettingsNavItem): AdminNavChild {
  return {
    href: settingsHref(item.id),
    label: item.label,
    icon: item.icon,
    permission: item.permission,
  };
}

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
    children: SETTINGS_NAV_ITEMS.map(toNavChild),
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

  for (const item of ADMIN_NAV_ITEMS) {
    if (item.children?.length) {
      const child = item.children.find(
        (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
      );
      if (child) {
        return [
          { label: 'Início', href: '/app' },
          { label: item.label, href: item.href },
          { label: child.label },
        ];
      }
      if (pathname === item.href) {
        return [{ label: 'Início', href: '/app' }, { label: item.label }];
      }
      continue;
    }

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

export function isAdminNavChildActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
