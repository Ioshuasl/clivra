'use client';

import { useState } from 'react';
import { TOOTH_FACES, TOOTH_FACE_LABELS } from '@/packages/clinico/enum/Odontogram/ToothFaceEnum';
import { clinicoErrorMessage } from '@/packages/clinico/helpers/ClinicoErrorMessage';
import { formatCents } from '@/packages/clinico/helpers/FormatCents';
import { TOOTH_CODE_GROUPS, toothName } from '@/packages/clinico/helpers/ToothName';
import { useProcedureListHook } from '@/packages/clinico/hooks/Procedure/useProcedureListHook';
import { useTreatmentItemCreateHook } from '@/packages/clinico/hooks/TreatmentPlan/useTreatmentItemCreateHook';
import type { TreatmentItemCreateFormDialogProps } from '@/packages/clinico/types/TreatmentPlan/TreatmentItemCreateTypes';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Field, FieldLabel } from '@/shared/ui/field';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

export function TreatmentItemCreateFormDialog({ patientId, onClose }: TreatmentItemCreateFormDialogProps) {
  const procedures = useProcedureListHook();
  const create = useTreatmentItemCreateHook(patientId);
  const [procedureId, setProcedureId] = useState('');
  const [toothCode, setToothCode] = useState('');
  const [face, setFace] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const active = (procedures.data ?? []).filter((procedure) => procedure.active);
  const procedure = active.find((item) => item.id === procedureId);
  const toothMissing = Boolean(procedure?.requiresTooth && !toothCode);
  const faceMissing = Boolean(procedure?.requiresFace && !face);

  const onSave = async () => {
    setSubmitted(true);
    if (!procedure || toothMissing || faceMissing) return;
    await create.mutateAsync({
      patientId,
      procedureId: procedure.id,
      toothCode: toothCode || null,
      face: face || null,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !create.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Adicionar ao plano de tratamento</DialogTitle>
            <DialogDescription>
              O valor vem da tabela de procedimentos da clínica. Se o paciente ainda não tem plano, ele
              é criado agora.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <Field>
              <FieldLabel htmlFor="plan-item-procedure">Procedimento</FieldLabel>
              <NativeSelect
                id="plan-item-procedure"
                className="w-full"
                value={procedureId}
                disabled={procedures.isLoading}
                onChange={(event) => {
                  setProcedureId(event.target.value);
                  setFace('');
                }}
              >
                <NativeSelectOption value="">
                  {procedures.isLoading ? 'Carregando…' : 'Escolha o procedimento'}
                </NativeSelectOption>
                {active.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {item.name} — {formatCents(item.priceCents)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {submitted && !procedure ? (
                <p className="text-xs text-destructive">Escolha um procedimento.</p>
              ) : null}
            </Field>

            {procedure ? (
              <Field>
                <FieldLabel htmlFor="plan-item-tooth">
                  Dente {procedure.requiresTooth ? '' : '(opcional)'}
                </FieldLabel>
                <NativeSelect
                  id="plan-item-tooth"
                  className="w-full"
                  value={toothCode}
                  onChange={(event) => setToothCode(event.target.value)}
                >
                  <NativeSelectOption value="">Sem dente específico</NativeSelectOption>
                  {TOOTH_CODE_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.codes.map((code) => (
                        <NativeSelectOption key={code} value={code}>
                          {code} · {toothName(code)}
                        </NativeSelectOption>
                      ))}
                    </optgroup>
                  ))}
                </NativeSelect>
                {submitted && toothMissing ? (
                  <p className="text-xs text-destructive">Este procedimento precisa de um dente.</p>
                ) : null}
              </Field>
            ) : null}

            {procedure?.requiresFace ? (
              <Field>
                <FieldLabel>Face do dente</FieldLabel>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Face do dente">
                  {TOOTH_FACES.map((item) => (
                    <Button
                      key={item}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={face === item}
                      variant={face === item ? 'default' : 'outline'}
                      onClick={() => setFace(item)}
                    >
                      {item} · {TOOTH_FACE_LABELS[item]}
                    </Button>
                  ))}
                </div>
                {submitted && faceMissing ? (
                  <p className="text-xs text-destructive">Escolha a face.</p>
                ) : null}
              </Field>
            ) : null}

            {create.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{clinicoErrorMessage(create.error)}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={create.isPending} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={create.isPending}
              onClick={() => {
                void onSave();
              }}
            >
              {create.isPending ? 'Adicionando…' : 'Adicionar ao plano'}
            </Button>
          </DialogFooter>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
