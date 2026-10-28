'use client';

import { useEffect } from 'react';
import { ROLE_LABELS, ROLES } from '@/packages/admin/enum/RoleEnum';
import { useMemberFormHook } from '@/packages/admin/hooks/Member/useMemberFormHook';
import { useMemberUpdateHook } from '@/packages/admin/hooks/Member/useMemberUpdateHook';
import type { MemberUpdateFormValues } from '@/packages/admin/schemas/Member/MemberSchema';
import type { MemberFormDialogProps } from '@/packages/admin/types/Member/MemberFormDialogTypes';
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

export function MemberFormDialog({ member, onClose }: MemberFormDialogProps) {
  const form = useMemberFormHook({
    role: member.role,
    active: member.active,
  });
  const update = useMemberUpdateHook();

  useEffect(() => {
    form.reset({
      role: member.role,
      active: member.active,
    });
  }, [member, form]);

  const onSave = async (values: MemberUpdateFormValues) => {
    await update.mutateAsync({ userId: member.id, memberSchema: values });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Editar membro</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              void form.handleSubmit(onSave)(e);
            }}
          >
            <p className="text-sm text-muted-foreground">
              {member.name} · {member.email}
            </p>
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.role)}>
                <FieldLabel htmlFor="member-role">Papel</FieldLabel>
                <NativeSelect id="member-role" {...form.register('role')}>
                  {ROLES.map((role) => (
                    <NativeSelectOption key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError>{form.formState.errors.role?.message}</FieldError>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register('active')} />
                Ativo
              </label>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
