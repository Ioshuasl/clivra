'use client';

import { useEffect } from 'react';
import {
  TOOTH_CONDITIONS,
  TOOTH_CONDITION_LABELS,
  type ToothCondition,
} from '@/packages/clinico/enum/Odontogram/ToothConditionEnum';
import { TOOTH_FACES, TOOTH_FACE_LABELS, type ToothFace } from '@/packages/clinico/enum/Odontogram/ToothFaceEnum';
import { toothName } from '@/packages/clinico/helpers/ToothName';
import { useOdontogramToothFormHook } from '@/packages/clinico/hooks/Odontogram/useOdontogramToothFormHook';
import { useOdontogramUpdateHook } from '@/packages/clinico/hooks/Odontogram/useOdontogramUpdateHook';
import type { OdontogramToothFormValues } from '@/packages/clinico/schemas/Odontogram/OdontogramSchema';
import type { OdontogramToothFormDialogProps } from '@/packages/clinico/types/Odontogram/OdontogramToothFormDialogTypes';
import { Can } from '@/shared/auth/Can';
import { ApiClientError } from '@/shared/api/api-client';
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
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';

export function OdontogramToothFormDialog({
  patientId,
  dentition,
  toothCode,
  initialFace = null,
  teeth,
  onClose,
}: OdontogramToothFormDialogProps) {
  const form = useOdontogramToothFormHook(dentition);
  const update = useOdontogramUpdateHook(patientId);
  const matches = teeth.filter((item) => item.toothCode === toothCode);
  const history = matches
    .flatMap((item) => item.history ?? [])
    .sort((a, b) => b.at.localeCompare(a.at));

  useEffect(() => {
    const whole = matches.find((item) => item.face == null);
    const faces = matches
      .map((item) => item.face)
      .filter((face): face is ToothFace => face != null && face in TOOTH_FACE_LABELS);
    if (initialFace) {
      const current = matches.find((item) => item.face === initialFace);
      const condition = (current?.condition ?? whole?.condition ?? 'HEALTHY') as ToothCondition;
      form.reset({
        dentition,
        wholeTooth: false,
        faces: [initialFace],
        condition: condition in TOOTH_CONDITION_LABELS ? condition : 'HEALTHY',
        notes: current?.notes ?? whole?.notes ?? '',
        justification: '',
      });
      return;
    }
    const condition = (whole?.condition ?? matches[0]?.condition ?? 'HEALTHY') as ToothCondition;
    form.reset({
      dentition,
      wholeTooth: Boolean(whole) || matches.length === 0,
      faces,
      condition: condition in TOOTH_CONDITION_LABELS ? condition : 'HEALTHY',
      notes: whole?.notes ?? matches[0]?.notes ?? '',
      justification: '',
    });
  }, [dentition, toothCode, initialFace, form]);

  const onSave = async (values: OdontogramToothFormValues) => {
    const justification = values.justification?.trim() ? values.justification.trim() : null;
    const notes = values.notes?.trim() ? values.notes.trim() : null;
    const targets = values.wholeTooth ? [null] : values.faces;
    try {
      for (const face of targets) {
        await update.mutateAsync({
          patientId,
          toothCode,
          odontogramSchema: {
            dentition: values.dentition,
            face,
            condition: values.condition,
            notes,
            justification,
          },
        });
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'TOOTH_STATE_CONFLICT') {
        return;
      }
      throw error;
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>
              Dente {toothCode}
              {initialFace ? ` · ${TOOTH_FACE_LABELS[initialFace]}` : ''}
            </DialogTitle>
            {toothName(toothCode) ? (
              <p className="text-sm text-muted-foreground">{toothName(toothCode)}</p>
            ) : null}
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSave)(event);
            }}
          >
            <FieldGroup>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register('wholeTooth')} />
                Dente inteiro
              </label>
              {!form.watch('wholeTooth') ? (
                <Field data-invalid={Boolean(form.formState.errors.faces)}>
                  <FieldLabel>Faces</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {TOOTH_FACES.map((face) => {
                      const selected = form.watch('faces').includes(face);
                      return (
                        <Button
                          key={face}
                          type="button"
                          size="sm"
                          variant={selected ? 'default' : 'outline'}
                          onClick={() => {
                            const current = form.getValues('faces');
                            form.setValue(
                              'faces',
                              selected ? current.filter((item) => item !== face) : [...current, face],
                              { shouldValidate: true },
                            );
                          }}
                        >
                          {face} · {TOOTH_FACE_LABELS[face]}
                        </Button>
                      );
                    })}
                  </div>
                  <FieldError>{form.formState.errors.faces?.message}</FieldError>
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="tooth-condition">Condição</FieldLabel>
                <NativeSelect
                  id="tooth-condition"
                  value={form.watch('condition')}
                  onChange={(event) => {
                    form.setValue('condition', event.target.value as ToothCondition);
                  }}
                >
                  {TOOTH_CONDITIONS.map((condition) => (
                    <NativeSelectOption key={condition} value={condition}>
                      {TOOTH_CONDITION_LABELS[condition]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="tooth-notes">Notas</FieldLabel>
                <Textarea id="tooth-notes" rows={2} {...form.register('notes')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="tooth-justification">Motivo da alteração (se mudar algo já registrado)</FieldLabel>
                <Textarea
                  id="tooth-justification"
                  rows={2}
                  placeholder="Ex.: dente restaurado hoje"
                  {...form.register('justification')}
                />
              </Field>
            </FieldGroup>

            {history.length > 0 ? (
              <div className="grid gap-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Histórico</p>
                {history.slice(0, 8).map((item) => (
                  <p key={`${item.at}-${item.toCondition}`}>
                    {new Date(item.at).toLocaleString('pt-BR')} ·{' '}
                    {item.fromCondition
                      ? TOOTH_CONDITION_LABELS[item.fromCondition as ToothCondition] ?? item.fromCondition
                      : '—'}{' '}
                    → {TOOTH_CONDITION_LABELS[item.toCondition as ToothCondition] ?? item.toCondition}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem histórico neste dente.</p>
            )}


            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Can permission="clinical_records.write">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? 'Salvando…' : 'Confirmar'}
                </Button>
              </Can>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
