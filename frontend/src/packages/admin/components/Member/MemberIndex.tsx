'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { UserPlusIcon } from 'lucide-react';
import { MemberTable } from '@/packages/admin/components/Member/MemberTable';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { useInvitationDeleteHook } from '@/packages/admin/hooks/Invitation/useInvitationDeleteHook';
import { useInvitationListHook } from '@/packages/admin/hooks/Invitation/useInvitationListHook';
import { useInvitationResendHook } from '@/packages/admin/hooks/Invitation/useInvitationResendHook';
import { useMemberListHook } from '@/packages/admin/hooks/Member/useMemberListHook';
import type { MemberSummary } from '@/packages/admin/types/Member/MemberTypes';
import { ClivraPageHeader, ClivraSurface } from '@/shared/layout/ClivraPage';
import { Button } from '@/shared/ui/button';

const InvitationFormDialog = dynamic(
  () =>
    import('@/packages/admin/components/Member/InvitationFormDialog').then(
      (m) => m.InvitationFormDialog,
    ),
  { ssr: false },
);
const MemberFormDialog = dynamic(
  () =>
    import('@/packages/admin/components/Member/MemberFormDialog').then((m) => m.MemberFormDialog),
  { ssr: false },
);

export function MemberIndex() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editing, setEditing] = useState<MemberSummary | null>(null);
  const membersQuery = useMemberListHook();
  const invitationsQuery = useInvitationListHook();
  const resend = useInvitationResendHook();
  const revoke = useInvitationDeleteHook();

  const loading = membersQuery.isLoading || invitationsQuery.isLoading;
  const error = membersQuery.isError || invitationsQuery.isError;

  return (
    <div className="grid min-w-0 gap-4">
      <ClivraPageHeader
        title="Membros"
        description="Equipe da clínica, convites pendentes e permissões de acesso."
        action={
          <Button type="button" onClick={() => setIsInviteOpen(true)} className="cursor-pointer">
            <UserPlusIcon className="size-4" strokeWidth={1.7} />
            Convidar
          </Button>
        }
      />


      {loading ? (
        <ClivraSurface contentClassName="px-4 py-6">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </ClivraSurface>
      ) : error ? (
        <ClivraSurface contentClassName="px-4 py-6">
          <p className="text-sm text-destructive" role="alert">
            {adminErrorMessage(membersQuery.error ?? invitationsQuery.error)}
          </p>
        </ClivraSurface>
      ) : (
        <ClivraSurface contentClassName="px-4 py-2">
          <MemberTable
            members={membersQuery.data ?? []}
            invitations={invitationsQuery.data ?? []}
            onEditMember={setEditing}
            onResendInvitation={(id) => resend.mutate(id)}
            onRevokeInvitation={(id) => revoke.mutate(id)}
            resendingId={resend.isPending ? resend.variables : null}
            revokingId={revoke.isPending ? revoke.variables : null}
          />
        </ClivraSurface>
      )}

      {isInviteOpen ? (
        <InvitationFormDialog onClose={() => setIsInviteOpen(false)} />
      ) : null}
      {editing ? (
        <MemberFormDialog member={editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}
