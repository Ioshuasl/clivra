'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SearchIcon } from 'lucide-react';
import {
  SETTINGS_GROUPS,
  SETTINGS_NAV_ITEMS,
  SETTINGS_SECTION,
  settingsHref,
  type SettingsNavItem,
} from '@/packages/admin/helpers/SettingsTabs';
import { useClinicGetHook } from '@/packages/admin/hooks/Clinic/useClinicGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { hasPermission } from '@/shared/auth/permissions';
import { cn } from '@/shared/helpers/utils';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/shared/ui/native-select';

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function matches(item: SettingsNavItem, query: string): boolean {
  const needle = normalize(query.trim());
  if (!needle) return true;
  return normalize(`${item.label} ${item.description} ${item.keywords ?? ''}`).includes(needle);
}

function SectionLink({ item, active }: { item: SettingsNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={settingsHref(item.id)}
      prefetch={false}
      title={item.description}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors',
          active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-muted-foreground group-hover:text-foreground',
        )}
      >
        <Icon className="size-3.5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

/** Tela única de configurações: lateral com seções agrupadas + conteúdo da seção ativa. */
export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me } = useAuth();
  const clinicQuery = useClinicGetHook();
  const chairsEnabled = clinicQuery.data?.chairsEnabled === true;
  const [query, setQuery] = useState('');

  const available = SETTINGS_NAV_ITEMS.filter(
    (item) =>
      (!item.permission || hasPermission(me, item.permission)) &&
      (item.id !== SETTINGS_SECTION.CADEIRAS || chairsEnabled),
  );
  const visible = available.filter((item) => matches(item, query));
  const current = available.find((item) => pathname.startsWith(settingsHref(item.id)));

  return (
    <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
      <aside className="flex shrink-0 flex-col gap-4 lg:sticky lg:top-0 lg:w-52">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">Configurações</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste a clínica do seu jeito. Escolha uma seção.
          </p>
        </div>

        <NativeSelect
          aria-label="Seção de configurações"
          value={current?.id ?? ''}
          onChange={(e) => router.push(settingsHref(e.target.value as SettingsNavItem['id']))}
          className="h-10 w-full lg:hidden"
        >
          {SETTINGS_GROUPS.map((group) => {
            const items = available.filter((item) => item.group === group.id);
            if (items.length === 0) return null;
            return (
              <NativeSelectOptGroup key={group.id} label={group.label}>
                {items.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {item.label}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            );
          })}
        </NativeSelect>

        <div className="hidden flex-col gap-4 lg:flex">
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Buscar configuração"
              placeholder="Buscar configuração…"
              value={query}
              className="h-9 pl-9"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && visible[0]) {
                  e.preventDefault();
                  router.push(settingsHref(visible[0].id));
                  setQuery('');
                }
              }}
            />
          </div>

          <nav aria-label="Seções de configurações" className="flex flex-col gap-4">
            {SETTINGS_GROUPS.map((group) => {
              const items = visible.filter((item) => item.group === group.id);
              if (items.length === 0) return null;
              return (
                <div key={group.id}>
                  <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {items.map((item) => (
                      <li key={item.id}>
                        <SectionLink item={item} active={current?.id === item.id} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {visible.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">
                Nada encontrado para “{query}”. Tente outra palavra.
              </p>
            ) : null}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
