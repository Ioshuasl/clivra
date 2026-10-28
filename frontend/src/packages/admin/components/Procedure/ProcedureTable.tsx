'use client';

import { PencilIcon } from 'lucide-react';
import { SettingsActiveBadge } from '@/packages/admin/components/Settings/SettingsActiveBadge';
import { SettingsIconButton } from '@/packages/admin/components/Settings/SettingsIconButton';
import type { ProcedureSummary } from '@/packages/admin/types/Procedure/ProcedureTypes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

type ProcedureTableProps = {
  procedures: ProcedureSummary[];
  onEdit: (procedure: ProcedureSummary) => void;
};

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProcedureTable({ procedures, onEdit }: ProcedureTableProps) {
  if (procedures.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum procedimento cadastrado.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead className="hidden 2xl:table-cell">Especialidade</TableHead>
          <TableHead>Duração</TableHead>
          <TableHead>Preço</TableHead>
          <TableHead>Situação</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {procedures.map((procedure) => (
          <TableRow key={procedure.id}>
            <TableCell>{procedure.code}</TableCell>
            <TableCell>{procedure.name}</TableCell>
            <TableCell className="hidden 2xl:table-cell">{procedure.specialty ?? '—'}</TableCell>
            <TableCell>{procedure.defaultMinutes} min</TableCell>
            <TableCell>{formatPrice(procedure.priceCents)}</TableCell>
            <TableCell>
              <SettingsActiveBadge active={procedure.active} />
            </TableCell>
            <TableCell className="text-right">
              <SettingsIconButton label="Editar procedimento" onClick={() => onEdit(procedure)}>
                <PencilIcon strokeWidth={1.7} />
              </SettingsIconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
