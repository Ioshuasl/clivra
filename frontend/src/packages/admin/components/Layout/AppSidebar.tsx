'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftIcon, XIcon, type LucideIcon } from 'lucide-react';
import { useOnboardingGetHook } from '@/packages/admin/hooks/Onboarding/useOnboardingGetHook';
import {
  ADMIN_NAV_ITEMS,
  isAdminNavActive,
  type AdminNavGroup,
} from '@/packages/admin/helpers/AdminNav';
import { useClivraShell } from '@/packages/admin/components/Layout/ClivraShellContext';
import { CLIVRA } from '@/shared/brand/ClivraBrand';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { cn } from '@/shared/helpers/utils';
import { Button } from '@/shared/ui/button';

const GROUPS: Array<{ id: AdminNavGroup; label: string }> = [
  { id: 'main', label: 'Principal' },
  { id: 'settings', label: 'Configurações' },
];

const SIDEBAR_TAGLINE = 'Gestão completa para clínicas odontológicas.';

type AppSidebarProps = {
  clinicName?: string;
  inboxBadgeCount?: number;
};

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0 stroke-[1.5]',
          active ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/70',
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge && badge > 0 ? (
        <span className="rounded-full bg-sidebar-primary/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-sidebar-foreground">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarBrand({ clinicName }: { clinicName?: string }) {
  return (
    <Link
      href="/app"
      prefetch={false}
      title={clinicName ? `${CLIVRA.name} · ${clinicName}` : CLIVRA.name}
      className="flex items-center gap-2.5 rounded-md px-1 transition-opacity hover:opacity-90"
    >
      <Image
        src={CLIVRA.logoIcon}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0"
        priority
      />
      <span className="truncate text-[1.15rem] font-semibold tracking-tight text-sidebar-foreground">
        {CLIVRA.name}
      </span>
    </Link>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-sidebar-border px-3.5 py-3.5">
      <div className="flex items-start gap-2.5">
        <Image
          src={CLIVRA.logoIcon}
          alt=""
          width={32}
          height={32}
          className="mt-0.5 size-8 shrink-0 opacity-90"
        />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-tight text-sidebar-foreground">{CLIVRA.name}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-sidebar-foreground/55">{SIDEBAR_TAGLINE}</p>
        </div>
      </div>
    </div>
  );
}

function SidebarBody({
  clinicName,
  inboxBadgeCount,
  onNavigate,
  showClose,
}: {
  clinicName?: string;
  inboxBadgeCount: number;
  onNavigate?: () => void;
  showClose?: boolean;
}) {
  const pathname = usePathname();
  const { me } = useAuth();
  const { setMobileOpen } = useClivraShell();
  const onboardingQuery = useOnboardingGetHook();
  const onboardingCompleted = Boolean(onboardingQuery.data?.completed);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3.5 pb-3 pt-4">
        <SidebarBrand clinicName={clinicName} />
        {showClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          >
            <XIcon className="size-4" />
          </Button>
        ) : null}
      </div>

      <nav
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 pb-3"
        aria-label="Navegação principal"
      >
        {GROUPS.map((group, groupIndex) => {
          const items = ADMIN_NAV_ITEMS.filter(
            (item) =>
              item.group === group.id &&
              (!item.permission || hasPermission(me, item.permission)) &&
              !(item.hideWhenOnboardingComplete && onboardingCompleted),
          );
          if (items.length === 0) return null;

          return (
            <div key={group.id} className={cn(groupIndex > 0 && 'mt-1')}>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const showInboxBadge = item.href === '/app/inbox' && inboxBadgeCount > 0;
                  return (
                    <li key={item.href}>
                      <NavLink
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        active={isAdminNavActive(pathname, item.href)}
                        badge={showInboxBadge ? inboxBadgeCount : undefined}
                        onNavigate={onNavigate}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <SidebarFooter />
    </div>
  );
}

/** Sidebar Clivra — sempre expandida no desktop; drawer só no mobile. */
export function AppSidebar({ clinicName, inboxBadgeCount = 0 }: AppSidebarProps) {
  const { mobileOpen, isMobile, setMobileOpen } = useClivraShell();

  if (isMobile) {
    return (
      <>
        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[16.5rem] flex-col bg-sidebar text-sidebar-foreground shadow-[var(--shadow-clivra-lg)] transition-transform duration-200 md:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-hidden={!mobileOpen}
        >
          <SidebarBody
            clinicName={clinicName}
            inboxBadgeCount={inboxBadgeCount}
            showClose
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>
      </>
    );
  }

  return (
    <aside className="sticky top-0 z-20 hidden h-svh w-[15.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <SidebarBody
        clinicName={clinicName}
        inboxBadgeCount={inboxBadgeCount}
      />
    </aside>
  );
}

/** Só no mobile — abre o drawer. No desktop a sidebar fica sempre visível. */
export function AppSidebarTrigger({ className }: { className?: string }) {
  const { toggleMobile } = useClivraShell();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn('cursor-pointer text-foreground md:hidden', className)}
      aria-label="Abrir menu"
      onClick={toggleMobile}
    >
      <PanelLeftIcon className="size-4" />
    </Button>
  );
}
