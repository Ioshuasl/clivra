'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PatientDadosFields } from '@/packages/operacional/components/Patient/PatientDadosFields';
import { usePatientCheckDuplicateHook } from '@/packages/operacional/hooks/Patient/usePatientCheckDuplicateHook';
import { usePatientCreateHook } from '@/packages/operacional/hooks/Patient/usePatientCreateHook';
import { usePatientCreateFormHook } from '@/packages/operacional/hooks/Patient/usePatientFormHook';
import type { PatientCreateFormValues } from '@/packages/operacional/schemas/Patient/PatientSchema';
import type { PatientFormDrawerProps } from '@/packages/operacional/types/Patient/PatientFormDialogTypes';
import type { PatientDuplicateMatch } from '@/packages/operacional/types/Patient/PatientTypes';
import { ApiClientError } from '@/shared/api/api-client';
import { useSheetOpenState } from '@/shared/motion/useSheetOpenState';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

export function PatientFormDrawer({ open, onClose, onCreated }: PatientFormDrawerProps) {
  const form = usePatientCreateFormHook();
  const create = usePatientCreateHook();
  const checkDup = usePatientCheckDuplicateHook();
  const [cpfBlock, setCpfBlock] = useState<PatientDuplicateMatch | null>(null);
  const [phoneWarning, setPhoneWarning] = useState<PatientDuplicateMatch[]>([]);
  const resetCreate = create.reset;

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: '',
      socialName: '',
      cpf: '',
      birthDate: '',
      sex: '',
      phonePrimary: '',
      phoneSecondary: '',
      email: '',
      notes: '',
    });
    setCpfBlock(null);
    setPhoneWarning([]);
    resetCreate();
  }, [open, form, resetCreate]);

  const onCpfBlur = async () => {
    const cpf = form.getValues('cpf')?.trim();
    if (!cpf) {
      setCpfBlock(null);
      return;
    }
    const result = await checkDup.mutateAsync({ cpf });
    setCpfBlock(result.cpfMatch);
  };

  const onPhoneBlur = async () => {
    const phone = form.getValues('phonePrimary')?.trim();
    if (!phone || phone.length < 8) {
      setPhoneWarning([]);
      return;
    }
    const result = await checkDup.mutateAsync({ phone });
    setPhoneWarning(result.phoneMatches);
  };

  const { sheetOpen, requestClose, onOpenChange, onOpenChangeComplete } = useSheetOpenState(
    open,
    onClose,
  );

  const onSubmit = async (values: PatientCreateFormValues) => {
    if (cpfBlock) return;
    try {
      const result = await create.mutateAsync(values);
      onCreated?.(result.patient.id);
      requestClose();
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'DUPLICATE_RESOURCE') {
        const details = error.details as {
          existingPatientId?: string;
          code?: number;
          name?: string;
        };
        if (details?.existingPatientId) {
          setCpfBlock({
            id: details.existingPatientId,
            code: details.code ?? 0,
            name: details.name ?? 'Paciente',
            phonePrimary: '',
            cpf: values.cpf ?? null,
          });
        }
      }
    }
  };

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>Novo paciente</SheetTitle>
          <SheetDescription>
            Cadastro rápido — nome e telefone bastam para começar.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <PatientDadosFields
              form={form}
              idPrefix="patient-create"
              onCpfBlur={() => {
                void onCpfBlur();
              }}
              onPhoneBlur={() => {
                void onPhoneBlur();
              }}
            />

            {cpfBlock ? (
              <Alert variant="destructive">
                <AlertTitle>CPF já cadastrado</AlertTitle>
                <AlertDescription>
                  Ficha #{cpfBlock.code} — {cpfBlock.name}.{' '}
                  <Link className="underline" href={`/app/pacientes/${cpfBlock.id}`}>
                    Abrir ficha
                  </Link>
                </AlertDescription>
              </Alert>
            ) : null}

            {phoneWarning.length > 0 ? (
              <Alert>
                <AlertTitle>Possível duplicata por telefone</AlertTitle>
                <AlertDescription>
                  {phoneWarning.map((match) => `#${match.code} ${match.name}`).join(', ')}. Você
                  ainda pode salvar.
                </AlertDescription>
              </Alert>
            ) : null}

          </div>

          <SheetFooter className="border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="cursor-pointer" onClick={requestClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={create.isPending || Boolean(cpfBlock)}
            >
              {create.isPending ? 'Salvando…' : 'Criar paciente'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** @deprecated Use PatientFormDrawer */
export const PatientFormDialog = PatientFormDrawer;
