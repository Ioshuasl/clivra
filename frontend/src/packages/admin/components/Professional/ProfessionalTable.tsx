'use client';

import { PencilIcon } from 'lucide-react';
import { SettingsActiveBadge } from '@/packages/admin/components/Settings/SettingsActiveBadge';
import { SettingsIconButton } from '@/packages/admin/components/Settings/SettingsIconButton';
import { ROLE_LABELS, type Role } from '@/packages/admin/enum/RoleEnum';
import type { ProfessionalSummary } from '@/packages/admin/types/Professional/ProfessionalTypes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

type ProfessionalTableProps = {
  professionals: ProfessionalSummary[];
  onEdit: (professional: ProfessionalSummary) => void;
};

export function ProfessionalTable({ professionals, onEdit }: ProfessionalTableProps) {
  if (professionals.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead>Papel</TableHead>
          <TableHead>CRO</TableHead>
          <TableHead className="hidden 2xl:table-cell">Especialidades</TableHead>
          <TableHead>Situação</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {professionals.map((professional) => (
          <TableRow key={professional.id}>
            <TableCell>{professional.name}</TableCell>
            <TableCell>{professional.email}</TableCell>
            <TableCell>{ROLE_LABELS[professional.role as Role] ?? professional.role}</TableCell>
            <TableCell>
              {professional.croNumber
                ? `${professional.croNumber}${professional.croState ? `/${professional.croState}` : ''}`
                : '—'}
            </TableCell>
            <TableCell className="hidden 2xl:table-cell">
              {professional.specialties.join(', ') || '—'}
            </TableCell>
            <TableCell>
              <SettingsActiveBadge active={professional.active} />
            </TableCell>
            <TableCell className="text-right">
              <SettingsIconButton label="Editar profissional" onClick={() => onEdit(professional)}>
                <PencilIcon strokeWidth={1.7} />
              </SettingsIconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
