'use client';

import { PencilIcon, SendIcon, XIcon } from 'lucide-react';
import { SettingsActiveBadge } from '@/packages/admin/components/Settings/SettingsActiveBadge';
import { SettingsIconButton } from '@/packages/admin/components/Settings/SettingsIconButton';
import { ROLE_LABELS, type Role } from '@/packages/admin/enum/RoleEnum';
import type {
  InvitationSummary,
  MemberSummary,
} from '@/packages/admin/types/Member/MemberTypes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

type MemberTableProps = {
  members: MemberSummary[];
  invitations: InvitationSummary[];
  onEditMember: (member: MemberSummary) => void;
  onResendInvitation: (invitationId: string) => void;
  onRevokeInvitation: (invitationId: string) => void;
  resendingId?: string | null;
  revokingId?: string | null;
};

export function MemberTable({
  members,
  invitations,
  onEditMember,
  onResendInvitation,
  onRevokeInvitation,
  resendingId,
  revokingId,
}: MemberTableProps) {
  const pendingInvitations = invitations.filter(
    (invitation) => !invitation.acceptedAt && !invitation.revokedAt,
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-base font-medium">Membros</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum membro.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{ROLE_LABELS[member.role as Role] ?? member.role}</TableCell>
                  <TableCell>
                    <SettingsActiveBadge active={member.active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <SettingsIconButton label="Editar membro" onClick={() => onEditMember(member)}>
                      <PencilIcon strokeWidth={1.7} />
                    </SettingsIconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="grid gap-2">
        <h2 className="text-base font-medium">Convites pendentes</h2>
        {pendingInvitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell>
                    {ROLE_LABELS[invitation.role as Role] ?? invitation.role}
                  </TableCell>
                  <TableCell>
                    {new Date(invitation.expiresAt).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <SettingsIconButton
                        label="Reenviar convite"
                        disabled={resendingId === invitation.id}
                        onClick={() => onResendInvitation(invitation.id)}
                      >
                        <SendIcon strokeWidth={1.7} />
                      </SettingsIconButton>
                      <SettingsIconButton
                        label="Revogar convite"
                        destructive
                        disabled={revokingId === invitation.id}
                        onClick={() => onRevokeInvitation(invitation.id)}
                      >
                        <XIcon strokeWidth={1.7} />
                      </SettingsIconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
