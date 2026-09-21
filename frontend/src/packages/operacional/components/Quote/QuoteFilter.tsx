'use client';

import { useMemo } from 'react';
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from '@/packages/operacional/enum/Quote/QuoteStatusEnum';
import type { QuoteStatus } from '@/packages/operacional/enum/Quote/QuoteStatusEnum';
import type { QuoteFilterProps } from '@/packages/operacional/types/Quote/QuoteFilterTypes';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/shared/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

const STATUS_ALL = '__all__';

export function QuoteFilter({
  patientId,
  onPatientIdChange,
  onPatientSearchChange,
  patients,
  patientsLoading,
  patientLabelById,
  status,
  onStatusChange,
}: QuoteFilterProps) {
  const patientIds = useMemo(() => {
    const ids = patients.map((item) => item.id);
    if (patientId && !ids.includes(patientId)) {
      return [patientId, ...ids];
    }
    return ids;
  }, [patients, patientId]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 sm:max-w-md">
        <Combobox
          items={patientIds}
          value={patientId || null}
          onValueChange={(next) => {
            onPatientIdChange(typeof next === 'string' ? next : '');
          }}
          onInputValueChange={(value) => {
            onPatientSearchChange(value);
          }}
          itemToStringLabel={patientLabelById}
          filter={null}
        >
          <ComboboxInput
            placeholder="Buscar paciente…"
            aria-label="Filtrar por paciente"
            className="w-full"
            showClear
          />
          <ComboboxContent>
            <ComboboxEmpty>
              {patientsLoading ? 'Carregando…' : 'Nenhum paciente encontrado.'}
            </ComboboxEmpty>
            <ComboboxList>
              {(id) => (
                <ComboboxItem key={id} value={id}>
                  {patientLabelById(id)}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <Select
        value={status || STATUS_ALL}
        onValueChange={(next) => {
          if (next == null || next === STATUS_ALL) {
            onStatusChange('');
            return;
          }
          onStatusChange(next as QuoteStatus);
        }}
      >
        <SelectTrigger className="w-full cursor-pointer sm:w-56" aria-label="Filtrar por status">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="end">
          <SelectItem value={STATUS_ALL}>Todos os status</SelectItem>
          {QUOTE_STATUSES.map((item) => (
            <SelectItem key={item} value={item}>
              {QUOTE_STATUS_LABELS[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
