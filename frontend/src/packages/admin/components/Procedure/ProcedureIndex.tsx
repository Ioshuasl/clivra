'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { PlusIcon } from 'lucide-react';
import { ProcedureTable } from '@/packages/admin/components/Procedure/ProcedureTable';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { useProcedureImportCatalogHook } from '@/packages/admin/hooks/Procedure/useProcedureImportCatalogHook';
import { useProcedureListHook } from '@/packages/admin/hooks/Procedure/useProcedureListHook';
import type { ProcedureSummary } from '@/packages/admin/types/Procedure/ProcedureTypes';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

const ProcedureFormDialog = dynamic(
  () =>
    import('@/packages/admin/components/Procedure/ProcedureFormDialog').then(
      (m) => m.ProcedureFormDialog,
    ),
  { ssr: false },
);

export function ProcedureIndex() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ProcedureSummary | null>(null);
  const proceduresQuery = useProcedureListHook();
  const importCatalog = useProcedureImportCatalogHook();

  return (
    <div className="grid min-w-0 gap-4">
      <ClivraPageHeader
        title="Procedimentos"
        description="Catálogo de procedimentos, valores e uso em orçamentos."
        action={
          <>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={importCatalog.isPending}
              onClick={() => importCatalog.mutate()}
            >
              {importCatalog.isPending ? 'Importando…' : 'Importar catálogo'}
            </Button>
            <Button type="button" onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
              <PlusIcon className="size-4" strokeWidth={1.7} />
              Novo procedimento
            </Button>
          </>
        }
      />

      {importCatalog.isSuccess ? (
        <Alert>
          <AlertDescription>
            Importados: {importCatalog.data.imported}. Ignorados: {importCatalog.data.skipped}.
          </AlertDescription>
        </Alert>
      ) : null}

      {proceduresQuery.isLoading ? (
        <ClivraSurface contentClassName="px-4 py-6">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </ClivraSurface>
      ) : proceduresQuery.isError ? (
        <ClivraSurface contentClassName="px-4 py-6">
          <Alert variant="destructive">
            <AlertDescription>{adminErrorMessage(proceduresQuery.error)}</AlertDescription>
          </Alert>
        </ClivraSurface>
      ) : (
        <ClivraSurface contentClassName="px-4 py-2">
          <ProcedureTable procedures={proceduresQuery.data ?? []} onEdit={setEditing} />
        </ClivraSurface>
      )}

      {isCreateOpen ? (
        <ProcedureFormDialog mode="create" onClose={() => setIsCreateOpen(false)} />
      ) : null}
      {editing ? (
        <ProcedureFormDialog
          mode="edit"
          procedure={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
