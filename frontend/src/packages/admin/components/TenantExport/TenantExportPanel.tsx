'use client';

import { useState } from 'react';
import { useTenantExportCreateHook } from '@/packages/admin/hooks/TenantExport/useTenantExportCreateHook';
import { useTenantExportGetHook } from '@/packages/admin/hooks/TenantExport/useTenantExportGetHook';
import { ClivraSurface } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';

export function TenantExportPanel() {
  const create = useTenantExportCreateHook();
  const [exportId, setExportId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const exportQuery = useTenantExportGetHook(exportId);

  const onExport = async () => {
    setCopied(false);
    const result = await create.mutateAsync();
    setExportId(result.exportId);
  };

  const onCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <ClivraSurface
      toolbar={
        <div>
          <h2 className="text-sm font-semibold text-foreground">Exportar dados da clínica</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            O arquivo contém dados de pacientes. Trate-o como confidencial.
          </p>
        </div>
      }
      contentClassName="grid gap-3 px-4 py-4"
    >
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={create.isPending}
        onClick={() => {
          void onExport();
        }}
      >
        {create.isPending ? 'Solicitando…' : 'Exportar dados da clínica'}
      </Button>


      {exportQuery.data ? (
        <div className="grid gap-2 text-sm">
          {exportQuery.data.status === 'PENDING' || exportQuery.data.status === 'RUNNING' ? (
            <p className="text-muted-foreground">Gerando arquivo…</p>
          ) : null}
          {exportQuery.data.status === 'FAILED' ? (
            <Alert variant="destructive">
              <AlertDescription>
                {exportQuery.data.error || 'Falha ao gerar o arquivo.'}
              </AlertDescription>
            </Alert>
          ) : null}
          {exportQuery.data.status === 'READY' && exportQuery.data.url ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="cursor-pointer"
                nativeButton={false}
                render={<a href={exportQuery.data.url} target="_blank" rel="noreferrer" />}
              >
                Baixar ZIP
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  void onCopy(exportQuery.data.url!);
                }}
              >
                {copied ? 'URL copiada' : 'Copiar URL'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </ClivraSurface>
  );
}
