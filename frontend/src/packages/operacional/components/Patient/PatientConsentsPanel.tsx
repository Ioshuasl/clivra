'use client';

import {
  CONSENT_CHANNEL_LABELS,
  CONSENT_CHANNELS,
  CONSENT_TYPE_LABELS,
  CONSENT_TYPES,
} from '@/packages/operacional/enum/Patient/ConsentEnum';
import { usePatientConsentCreateHook } from '@/packages/operacional/hooks/Patient/usePatientConsentCreateHook';
import { useConsentCreateFormHook } from '@/packages/operacional/hooks/Patient/usePatientFormHook';
import type { ConsentCreateFormValues } from '@/packages/operacional/schemas/Patient/PatientSchema';
import type { ConsentSummary } from '@/packages/operacional/types/Patient/PatientTypes';
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
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

type PatientConsentsPanelProps = {
  patientId: string;
  consents: ConsentSummary[];
};

export function PatientConsentsPanel({ patientId, consents }: PatientConsentsPanelProps) {
  const form = useConsentCreateFormHook();
  const create = usePatientConsentCreateHook(patientId);

  const onSubmit = async (values: ConsentCreateFormValues) => {
    await create.mutateAsync(values);
  };

  const onRevoke = async (consent: ConsentSummary) => {
    await create.mutateAsync({
      type: consent.type as ConsentCreateFormValues['type'],
      granted: false,
      documentVersion: consent.documentVersion,
      channel: consent.channel as ConsentCreateFormValues['channel'],
    });
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Consentimentos LGPD</CardTitle>
        <CardDescription>Registro de aceite e canal (presencial / WhatsApp).</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {consents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum consentimento registrado.</p>
        ) : (
          <ul className="grid gap-2">
            {consents.map((consent) => {
              const active = consent.granted && !consent.revokedAt;
              return (
                <li
                  key={consent.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-3"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {CONSENT_TYPE_LABELS[consent.type as keyof typeof CONSENT_TYPE_LABELS] ??
                        consent.type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {CONSENT_CHANNEL_LABELS[
                        consent.channel as keyof typeof CONSENT_CHANNEL_LABELS
                      ] ?? consent.channel}{' '}
                      · {consent.documentVersion}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        active
                          ? 'border-transparent bg-success/15 text-success'
                          : 'text-muted-foreground'
                      }
                    >
                      {active ? 'Ativo' : 'Revogado'}
                    </Badge>
                    {active ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        disabled={create.isPending}
                        onClick={() => {
                          void onRevoke(consent);
                        }}
                      >
                        Revogar
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="grid gap-4 border-t border-border pt-4"
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
        >
          <h2 className="text-sm font-semibold text-foreground">Registrar consentimento</h2>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="consent-type">Tipo</FieldLabel>
                <NativeSelect
                  id="consent-type"
                  className="w-full max-w-none"
                  value={form.watch('type')}
                  onChange={(event) =>
                    form.setValue('type', event.target.value as ConsentCreateFormValues['type'])
                  }
                >
                  {CONSENT_TYPES.map((type) => (
                    <NativeSelectOption key={type} value={type}>
                      {CONSENT_TYPE_LABELS[type]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="consent-channel">Canal</FieldLabel>
                <NativeSelect
                  id="consent-channel"
                  className="w-full max-w-none"
                  value={form.watch('channel')}
                  onChange={(event) =>
                    form.setValue(
                      'channel',
                      event.target.value as ConsentCreateFormValues['channel'],
                    )
                  }
                >
                  {CONSENT_CHANNELS.map((channel) => (
                    <NativeSelectOption key={channel} value={channel}>
                      {CONSENT_CHANNEL_LABELS[channel]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field data-invalid={Boolean(form.formState.errors.documentVersion)}>
              <FieldLabel htmlFor="consent-version">Versão do documento</FieldLabel>
              <Input id="consent-version" {...form.register('documentVersion')} />
              <FieldError>{form.formState.errors.documentVersion?.message}</FieldError>
            </Field>
          </FieldGroup>
          <Button type="submit" className="w-fit cursor-pointer" disabled={create.isPending}>
            {create.isPending ? 'Salvando…' : 'Registrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
