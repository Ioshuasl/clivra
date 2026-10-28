'use client';

import Link from 'next/link';
import { CheckIcon, DownloadIcon, XIcon } from 'lucide-react';
import { SettingsIconButton } from '@/packages/admin/components/Settings/SettingsIconButton';
import { SubscriptionToneBadge } from '@/packages/admin/components/Subscription/SubscriptionToneBadge';
import {
  DATA_SUBJECT_REQUEST_STATUS_LABELS,
  DATA_SUBJECT_REQUEST_TERMINAL_STATUSES,
  type DataSubjectRequestStatus,
} from '@/packages/admin/enum/DataSubjectRequest/DataSubjectRequestStatusEnum';
import { DATA_SUBJECT_REQUEST_TYPE_LABELS } from '@/packages/admin/enum/DataSubjectRequest/DataSubjectRequestTypeEnum';
import type { SubscriptionPaymentTone } from '@/packages/admin/enum/Subscription/SubscriptionPaymentStatusEnum';
import type { DataSubjectRequestTableProps } from '@/packages/admin/types/DataSubjectRequest/DataSubjectRequestTableTypes';
import { Button } from '@/shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

const STATUS_TONES: Record<DataSubjectRequestStatus, SubscriptionPaymentTone> = {
  RECEIVED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  REJECTED: 'danger',
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

export function DataSubjectRequestTable({
  requests,
  patientNames,
  onComplete,
  onReject,
}: DataSubjectRequestTableProps) {
  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma solicitação do titular registrada.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Paciente</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Prazo</TableHead>
          <TableHead>Pacote</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => {
          const terminal = DATA_SUBJECT_REQUEST_TERMINAL_STATUSES.includes(request.status);
          const patientName = patientNames[request.patientId];
          return (
            <TableRow key={request.id}>
              <TableCell>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0"
                  nativeButton={false}
                  render={
                    <Link href={`/app/pacientes/${request.patientId}`} prefetch={false} />
                  }
                >
                  {patientName ?? 'Ver ficha'}
                </Button>
              </TableCell>
              <TableCell>{DATA_SUBJECT_REQUEST_TYPE_LABELS[request.type]}</TableCell>
              <TableCell>
                <SubscriptionToneBadge tone={STATUS_TONES[request.status]}>
                  {DATA_SUBJECT_REQUEST_STATUS_LABELS[request.status]}
                </SubscriptionToneBadge>
              </TableCell>
              <TableCell>{formatWhen(request.dueAt)}</TableCell>
              <TableCell>
                {request.exportUrl ? (
                  <SettingsIconButton label="Baixar pacote" href={request.exportUrl}>
                    <DownloadIcon strokeWidth={1.7} />
                  </SettingsIconButton>
                ) : request.type === 'ACCESS' || request.type === 'PORTABILITY' ? (
                  <span className="text-sm text-muted-foreground">Preparando pacote…</span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                {terminal ? null : (
                  <div className="flex justify-end gap-1">
                    <SettingsIconButton label="Concluir solicitação" onClick={() => onComplete(request)}>
                      <CheckIcon strokeWidth={1.7} />
                    </SettingsIconButton>
                    <SettingsIconButton
                      label="Rejeitar solicitação"
                      destructive
                      onClick={() => onReject(request)}
                    >
                      <XIcon strokeWidth={1.7} />
                    </SettingsIconButton>
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
