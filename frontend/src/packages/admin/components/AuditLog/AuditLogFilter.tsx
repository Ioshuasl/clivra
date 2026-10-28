'use client';

import { AUDIT_ACTION_FILTERS } from '@/packages/admin/enum/AuditLog/AuditActionEnum';
import type { AuditLogFilterProps } from '@/packages/admin/types/AuditLog/AuditLogFilterTypes';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { DatePicker } from '@/shared/ui/date-picker';
import { dateToIso, isoToRange } from '@/shared/helpers/DateIso';

export function AuditLogFilter({
  patientSearch,
  onPatientSearchChange,
  patients,
  patientId,
  onPatientIdChange,
  members,
  actorId,
  onActorIdChange,
  action,
  onActionChange,
  from,
  onFromChange,
  to,
  onToChange,
}: AuditLogFilterProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="min-w-56 flex-1">
        <Input
          value={patientSearch}
          onChange={(event) => onPatientSearchChange(event.target.value)}
          placeholder="Filtrar paciente…"
          aria-label="Filtrar paciente"
        />
      </div>
      <NativeSelect
        aria-label="Paciente"
        className="w-56"
        value={patientId}
        onChange={(event) => onPatientIdChange(event.target.value)}
      >
        <NativeSelectOption value="">Todos os pacientes</NativeSelectOption>
        {patients.map((patient) => (
          <NativeSelectOption key={patient.id} value={patient.id}>
            {patient.socialName || patient.name} (#{patient.code})
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Ator"
        className="w-56"
        value={actorId}
        onChange={(event) => onActorIdChange(event.target.value)}
      >
        <NativeSelectOption value="">Todos os atores</NativeSelectOption>
        {members.map((member) => (
          <NativeSelectOption key={member.id} value={member.id}>
            {member.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Ação"
        className="w-56"
        value={action}
        onChange={(event) => onActionChange(event.target.value)}
      >
        <NativeSelectOption value="">Todas as ações</NativeSelectOption>
        {AUDIT_ACTION_FILTERS.map((item) => (
          <NativeSelectOption key={item.value} value={item.value}>
            {item.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <DatePicker
              mode="range"
              aria-label="Período"
              className="w-72"
              value={isoToRange(from, to)}
              onChange={(range) => {
                onFromChange(dateToIso(range?.from));
                onToChange(dateToIso(range?.to));
              }}
            />
    </div>
  );
}
