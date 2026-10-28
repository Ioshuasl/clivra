'use client';

import { Controller } from 'react-hook-form';
import {
  formatCpfInputMask,
  formatCpfMask,
  formatPhoneInputMask,
  formatPhoneMask,
} from '@/packages/operacional/helpers/FormatPatientContact';
import { useGuardianCreateFormHook } from '@/packages/operacional/hooks/Patient/usePatientFormHook';
import { usePatientGuardianCreateHook } from '@/packages/operacional/hooks/Patient/usePatientGuardianCreateHook';
import type { GuardianCreateFormValues } from '@/packages/operacional/schemas/Patient/PatientSchema';
import type { LegalGuardianSummary } from '@/packages/operacional/types/Patient/PatientTypes';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

type PatientGuardiansPanelProps = {
  patientId: string;
  guardians: LegalGuardianSummary[];
};

export function PatientGuardiansPanel({ patientId, guardians }: PatientGuardiansPanelProps) {
  const form = useGuardianCreateFormHook();
  const create = usePatientGuardianCreateHook(patientId);

  const onSubmit = async (values: GuardianCreateFormValues) => {
    await create.mutateAsync(values);
    form.reset();
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Responsáveis legais</CardTitle>
        <CardDescription>Obrigatório para menores de 18 anos.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {guardians.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum responsável cadastrado.</p>
        ) : (
          <ul className="grid gap-2">
            {guardians.map((guardian, index) => (
              <li
                key={guardian.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border px-3 py-3"
              >
                <div>
                  <p className="font-semibold text-foreground">{guardian.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      guardian.relationship,
                      guardian.phone ? formatPhoneMask(guardian.phone) : null,
                      guardian.cpf ? formatCpfMask(guardian.cpf) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                </div>
                {index === 0 ? (
                  <Badge variant="outline" className="border-transparent bg-success/15 text-success">
                    Principal
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <form
          className="grid gap-4 border-t border-border pt-4"
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
        >
          <h2 className="text-sm font-semibold text-foreground">Adicionar responsável</h2>
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="guardian-name">Nome</FieldLabel>
              <Input id="guardian-name" {...form.register('name')} />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="guardian-rel">Parentesco</FieldLabel>
                <Input id="guardian-rel" {...form.register('relationship')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="guardian-phone">Telefone</FieldLabel>
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <Input
                      id="guardian-phone"
                      inputMode="tel"
                      placeholder="(11) 99999-0000"
                      value={field.value ?? ''}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        field.onChange(formatPhoneInputMask(event.target.value));
                      }}
                    />
                  )}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="guardian-cpf">CPF</FieldLabel>
              <Controller
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <Input
                    id="guardian-cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={field.value ?? ''}
                    onBlur={field.onBlur}
                    onChange={(event) => {
                      field.onChange(formatCpfInputMask(event.target.value));
                    }}
                  />
                )}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" className="w-fit cursor-pointer" disabled={create.isPending}>
            {create.isPending ? 'Salvando…' : 'Adicionar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
