'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, DownloadIcon } from 'lucide-react';
import { ReportExportPanel } from '@/packages/admin/components/Report/ReportExportPanel';
import type { ExportableReport } from '@/packages/admin/enum/Report/ExportableReportEnum';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { Button, buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/helpers/utils';

type ReportDetailShellProps = {
  title: string;
  description: string;
  exportReport?: ExportableReport;
  filters?: ReactNode;
  children: ReactNode;
};

export function ReportDetailShell({
  title,
  description,
  exportReport,
  filters,
  children,
}: ReportDetailShellProps) {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="grid min-w-0 gap-4">
      <div>
        <Link
          href="/app/relatorios"
          className={cn(
            buttonVariants({ variant: 'link' }),
            'inline-flex h-auto cursor-pointer items-center gap-1.5 px-0',
          )}
        >
          <ArrowLeftIcon className="size-3.5" strokeWidth={1.8} />
          Voltar aos relatórios
        </Link>
      </div>

      <ClivraPageHeader
        title={title}
        description={description}
        action={
          exportReport ? (
            <Button
              type="button"
              variant={exportOpen ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setExportOpen((open) => !open)}
            >
              <DownloadIcon className="size-4" strokeWidth={1.7} />
              {exportOpen ? 'Fechar exportação' : 'Exportar CSV'}
            </Button>
          ) : null
        }
      />

      {exportOpen && exportReport ? (
        <ReportExportPanel defaultReport={exportReport} lockedReport />
      ) : null}

      <ClivraSurface
        toolbar={filters}
        contentClassName={filters ? 'px-4 py-2' : 'px-4 py-4'}
      >
        {children}
      </ClivraSurface>
    </div>
  );
}
