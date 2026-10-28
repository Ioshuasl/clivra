'use client';

import { PencilIcon } from 'lucide-react';
import { SettingsActiveBadge } from '@/packages/admin/components/Settings/SettingsActiveBadge';
import { SettingsIconButton } from '@/packages/admin/components/Settings/SettingsIconButton';
import type { ChairSummary } from '@/packages/admin/types/Chair/ChairTypes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

type ChairTableProps = {
  chairs: ChairSummary[];
  onEdit: (chair: ChairSummary) => void;
};

export function ChairTable({ chairs, onEdit }: ChairTableProps) {
  if (chairs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma cadeira cadastrada.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Cor</TableHead>
          <TableHead>Situação</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {chairs.map((chair) => (
          <TableRow key={chair.id}>
            <TableCell>{chair.name}</TableCell>
            <TableCell>
              {chair.color ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block size-3 rounded-full border"
                    style={{ backgroundColor: chair.color }}
                  />
                  {chair.color}
                </span>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell>
              <SettingsActiveBadge active={chair.active} female />
            </TableCell>
            <TableCell className="text-right">
              <SettingsIconButton label="Editar cadeira" onClick={() => onEdit(chair)}>
                <PencilIcon strokeWidth={1.7} />
              </SettingsIconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
