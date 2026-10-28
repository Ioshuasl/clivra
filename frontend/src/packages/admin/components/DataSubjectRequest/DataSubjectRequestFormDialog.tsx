'use client';

import { useDeferredValue, useState } from 'react';
import {
  DATA_SUBJECT_REQUEST_TYPES,
  DATA_SUBJECT_REQUEST_TYPE_LABELS,
} from '@/packages/admin/enum/DataSubjectRequest/DataSubjectRequestTypeEnum';
import { useAuditLogPatientListHook } from '@/packages/admin/hooks/AuditLog/useAuditLogPatientListHook';
import { useDataSubjectRequestCreateHook } from '@/packages/admin/hooks/DataSubjectRequest/useDataSubjectRequestCreateHook';
import { useDataSubjectRequestFormHook } from '@/packages/admin/hooks/DataSubjectRequest/useDataSubjectRequestFormHook';
import type { DataSubjectRequestCreateFormValues } from '@/packages/admin/schemas/DataSubjectRequest/DataSubjectRequestSchema';
import type { DataSubjectRequestFormDialogProps } from '@/packages/admin/types/DataSubjectRequest/DataSubjectRequestFormDialogTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';

export function DataSubjectRequestFormDialog({ onClose }: DataSubjectRequestFormDialogProps) {
  const form = useDataSubjectRequestFormHook();
  const create = useDataSubjectRequestCreateHook();
  const [patientSearch, setPatientSearch] = useState('');
  const deferredSearch = useDeferredValue(patientSearch);
  const patientsQuery = useAuditLogPatientListHook(deferredSearch);

  const onSave = async (values: DataSubjectRequestCreateFormValues) => {
    const notes = values.notes?.trim();
    await create.mutateAsync({
      patientId: values.patientId,
      type: values.type,
      notes: notes ? notes : undefined,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Nova solicitação do titular</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              void form.handleSubmit(onSave)(e);
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="dsr-patient-search">Paciente</FieldLabel>
                <Input
                  id="dsr-patient-search"
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Buscar por nome…"
                  aria-label="Filtrar paciente"
                />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.patientId)}>
                <NativeSelect
                  aria-label="Paciente"
                  value={form.watch('patientId')}
                  onChange={(event) => form.setValue('patientId', event.target.value)}
                >
                  <NativeSelectOption value="">Selecione o paciente</NativeSelectOption>
                  {(patientsQuery.data?.items ?? []).map((patient) => (
                    <NativeSelectOption key={patient.id} value={patient.id}>
                      {patient.socialName || patient.name} (#{patient.code})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{form.formState.errors.patientId?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.type)}>
                <FieldLabel htmlFor="dsr-type">Tipo</FieldLabel>
                <NativeSelect id="dsr-type" aria-label="Tipo" {...form.register('type')}>
                  {DATA_SUBJECT_REQUEST_TYPES.map((type) => (
                    <NativeSelectOption key={type} value={type}>
                      {DATA_SUBJECT_REQUEST_TYPE_LABELS[type]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{form.formState.errors.type?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="dsr-notes">Observações</FieldLabel>
                <Textarea id="dsr-notes" rows={3} {...form.register('notes')} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Registrando…' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
