'use client';

import { useDeferredValue, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserPlusIcon } from 'lucide-react';
import { PatientFilter } from '@/packages/operacional/components/Patient/PatientFilter';
import { PatientPagination } from '@/packages/operacional/components/Patient/PatientPagination';
import { PatientTable } from '@/packages/operacional/components/Patient/PatientTable';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { usePatientListHook } from '@/packages/operacional/hooks/Patient/usePatientListHook';
import type { PatientActiveFilter } from '@/packages/operacional/types/Patient/PatientTypes';
import { cn } from '@/shared/helpers/utils';

const PatientFormDrawer = dynamic(
  () =>
    import('@/packages/operacional/components/Patient/PatientFormDrawer').then(
      (m) => m.PatientFormDrawer,
    ),
  { ssr: false },
);

function parseActive(value: string | null): PatientActiveFilter {
  if (value === 'true' || value === 'false') return value;
  return 'all';
}

export function PatientIndex() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get('page') ?? '1');
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  });
  const [active, setActive] = useState<PatientActiveFilter>(() =>
    parseActive(searchParams.get('active')),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const skipFilterReset = useRef(true);
  // Buscas que esta tela já gravou na URL: ecos atrasados do router não devem sobrescrever o campo.
  const writtenSearches = useRef(new Set<string>([searchParams.get('search') ?? '']));

  const listQuery = usePatientListHook(deferredSearch, { page, active });

  // Busca do header (e outros deep links) atualizam a URL sem remontar a página.
  useEffect(() => {
    const urlSearch = searchParams.get('search') ?? '';
    const urlActive = parseActive(searchParams.get('active'));
    const rawPage = Number(searchParams.get('page') ?? '1');
    const urlPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    const writingSearch =
      writtenSearches.current.has(urlSearch) ||
      urlSearch === deferredSearch.trim() ||
      urlSearch === search.trim();
    if (!writingSearch) {
      writtenSearches.current = new Set([urlSearch]);
      setSearch(urlSearch);
      setPage(1);
    } else if (urlPage !== page) {
      setPage(urlPage);
    }

    if (urlActive !== active) {
      setActive(urlActive);
    }
  }, [searchParams, deferredSearch, search, page, active]);

  useEffect(() => {
    if (skipFilterReset.current) {
      skipFilterReset.current = false;
      return;
    }
    setPage(1);
  }, [deferredSearch, active]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (deferredSearch.trim()) params.set('search', deferredSearch.trim());
    if (page > 1) params.set('page', String(page));
    if (active !== 'all') params.set('active', active);
    const qs = params.toString();
    writtenSearches.current.add(deferredSearch.trim());
    const next = qs ? `/app/pacientes?${qs}` : '/app/pacientes';
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === next) return;
    router.replace(next, { scroll: false });
  }, [deferredSearch, page, active, router]);

  const totalPages = listQuery.data?.totalPages ?? 1;
  const total = listQuery.data?.total ?? 0;
  const pageSize = listQuery.data?.pageSize ?? 20;

  return (
    <div className="grid min-w-0 gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[#1A1A1A]">Pacientes</h1>
          <p className="mt-1 text-sm text-[#7A716C]">
            Busque, filtre e abra a ficha do paciente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-lg bg-[#4A0F16] px-4',
            'text-sm font-medium text-white transition-colors hover:bg-[#3A0C12]',
          )}
        >
          <UserPlusIcon className="size-4" strokeWidth={1.7} />
          Novo paciente
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[#EBE4DE] bg-white shadow-[0_1px_2px_rgb(74_15_22/0.04)]">
        <div className="border-b border-[#F0EAE5] px-4 py-3">
          <PatientFilter
            search={search}
            onSearchChange={setSearch}
            active={active}
            onActiveChange={setActive}
          />
        </div>

        {listQuery.isError ? (
          <div className="px-4 py-6">
            <p className="text-sm text-rose-700" role="alert">
              {operacionalErrorMessage(listQuery.error)}
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-[#4A0F16] underline-offset-4 hover:underline"
              onClick={() => void listQuery.refetch()}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <PatientTable
            patients={listQuery.data?.items ?? []}
            loading={listQuery.isLoading}
            onOpen={(patient) => {
              router.push(`/app/pacientes/${patient.id}`);
            }}
          />
        )}

        <PatientPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </section>

      {createOpen ? (
        <PatientFormDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(patientId) => {
            setCreateOpen(false);
            router.push(`/app/pacientes/${patientId}`);
          }}
        />
      ) : null}
    </div>
  );
}
