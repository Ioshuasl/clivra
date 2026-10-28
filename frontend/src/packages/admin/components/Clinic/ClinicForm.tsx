'use client';

import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { Loader2Icon, SearchIcon } from 'lucide-react';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '@/packages/admin/enum/PaymentMethodEnum';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import {
  BrazilLookupError,
  lookupCep,
  lookupCnpj,
} from '@/packages/admin/helpers/BrazilAddressLookup';
import {
  digitsOnly,
  formatCepMask,
  formatCnpjMask,
  formatPhoneInputMask,
} from '@/packages/admin/helpers/BrazilDocumentMasks';
import {
  BRAZIL_TIMEZONE_VALUES,
  brazilTimezoneLabel,
} from '@/packages/admin/helpers/BrazilTimezones';
import { useClinicFormHook } from '@/packages/admin/hooks/Clinic/useClinicFormHook';
import { useClinicGetHook } from '@/packages/admin/hooks/Clinic/useClinicGetHook';
import { useClinicUpdateHook } from '@/packages/admin/hooks/Clinic/useClinicUpdateHook';
import type { ClinicUpdateFormValues } from '@/packages/admin/schemas/Clinic/ClinicSchema';
import { SettingsCard, SettingsSaveBar } from '@/packages/admin/components/Settings/SettingsCard';
import { ClivraPageHeader } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/shared/ui/combobox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { Switch } from '@/shared/ui/switch';

const PAYMENT_ITEMS = [...PAYMENT_METHODS];

function paymentLabel(method: string): string {
  if (method in PAYMENT_METHOD_LABELS) {
    return PAYMENT_METHOD_LABELS[method as PaymentMethod];
  }
  return method;
}

export function ClinicForm() {
  const clinicQuery = useClinicGetHook();
  const form = useClinicFormHook();
  const update = useClinicUpdateHook();
  const paymentAnchor = useComboboxAnchor();
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupSuccess, setLookupSuccess] = useState<string | null>(null);

  const resetToSaved = () => {
    const clinic = clinicQuery.data;
    if (!clinic) return;
    form.reset({
      name: clinic.name,
      legalName: clinic.legalName ?? '',
      taxId: formatCnpjMask(clinic.taxId ?? ''),
      responsibleCro: clinic.responsibleCro ?? '',
      timezone: clinic.timezone,
      acceptedPaymentMethods: clinic.acceptedPaymentMethods,
      chairsEnabled: clinic.chairsEnabled === true,
      phone: formatPhoneInputMask(clinic.defaultUnit?.phone ?? ''),
      address: {
        street: clinic.defaultUnit?.address?.street ?? '',
        number: clinic.defaultUnit?.address?.number ?? '',
        complement: clinic.defaultUnit?.address?.complement ?? '',
        district: clinic.defaultUnit?.address?.district ?? '',
        city: clinic.defaultUnit?.address?.city ?? '',
        state: clinic.defaultUnit?.address?.state ?? '',
        postalCode: formatCepMask(clinic.defaultUnit?.address?.postalCode ?? ''),
      },
    });
  };

  useEffect(() => {
    resetToSaved();
  }, [clinicQuery.data]);

  const clearLookupFeedback = () => {
    setLookupError(null);
    setLookupSuccess(null);
  };

  const onSave = async (values: ClinicUpdateFormValues) => {
    clearLookupFeedback();
    await update.mutateAsync({
      ...values,
      taxId: digitsOnly(values.taxId ?? '') || null,
      phone: digitsOnly(values.phone ?? '') || null,
      address: values.address
        ? {
            ...values.address,
            postalCode: digitsOnly(values.address.postalCode ?? '') || undefined,
            state: values.address.state
              ? values.address.state.toUpperCase().slice(0, 2)
              : values.address.state,
          }
        : values.address,
    });
  };

  const onLookupCnpj = async () => {
    clearLookupFeedback();
    setCnpjLoading(true);
    try {
      const result = await lookupCnpj(form.getValues('taxId') ?? '');
      const currentName = form.getValues('name')?.trim() ?? '';
      form.setValue('taxId', formatCnpjMask(result.taxId), { shouldDirty: true });
      form.setValue('legalName', result.legalName, { shouldDirty: true });
      if (!currentName && result.tradeName) {
        form.setValue('name', result.tradeName, { shouldDirty: true });
      } else if (!currentName && result.legalName) {
        form.setValue('name', result.legalName, { shouldDirty: true });
      }
      if (result.phone) {
        form.setValue('phone', formatPhoneInputMask(result.phone), { shouldDirty: true });
      }
      form.setValue('address.street', result.street, { shouldDirty: true });
      form.setValue('address.number', result.number, { shouldDirty: true });
      form.setValue('address.complement', result.complement, { shouldDirty: true });
      form.setValue('address.district', result.district, { shouldDirty: true });
      form.setValue('address.city', result.city, { shouldDirty: true });
      form.setValue('address.state', result.state, { shouldDirty: true });
      form.setValue('address.postalCode', formatCepMask(result.postalCode), {
        shouldDirty: true,
      });
      setLookupSuccess('Dados do CNPJ preenchidos. Revise antes de salvar.');
    } catch (error) {
      setLookupError(
        error instanceof BrazilLookupError ? error.message : 'Não foi possível consultar o CNPJ.',
      );
    } finally {
      setCnpjLoading(false);
    }
  };

  const onLookupCep = async () => {
    clearLookupFeedback();
    setCepLoading(true);
    try {
      const result = await lookupCep(form.getValues('address.postalCode') ?? '');
      form.setValue('address.postalCode', formatCepMask(result.postalCode), {
        shouldDirty: true,
      });
      form.setValue('address.street', result.street, { shouldDirty: true });
      form.setValue('address.district', result.district, { shouldDirty: true });
      form.setValue('address.city', result.city, { shouldDirty: true });
      form.setValue('address.state', result.state, { shouldDirty: true });
      if (
        result.timezoneName &&
        BRAZIL_TIMEZONE_VALUES.includes(
          result.timezoneName as (typeof BRAZIL_TIMEZONE_VALUES)[number],
        )
      ) {
        form.setValue('timezone', result.timezoneName, { shouldDirty: true });
      }
      setLookupSuccess('Endereço preenchido pelo CEP. Revise o número e o complemento.');
    } catch (error) {
      setLookupError(
        error instanceof BrazilLookupError ? error.message : 'Não foi possível consultar o CEP.',
      );
    } finally {
      setCepLoading(false);
    }
  };

  const timezoneValue = form.watch('timezone');
  const timezoneItems =
    timezoneValue &&
    !BRAZIL_TIMEZONE_VALUES.includes(timezoneValue as (typeof BRAZIL_TIMEZONE_VALUES)[number])
      ? [...BRAZIL_TIMEZONE_VALUES, timezoneValue]
      : [...BRAZIL_TIMEZONE_VALUES];

  if (clinicQuery.isLoading) {
    return (
      <div className="grid min-w-0 gap-4">
        <ClivraPageHeader
          title="Clínica"
          description="Dados cadastrais, contato, pagamentos e endereço da unidade padrão."
        />
        <SettingsCard title="Carregando…">
          <p className="text-sm text-muted-foreground">Buscando os dados da clínica.</p>
        </SettingsCard>
      </div>
    );
  }

  if (clinicQuery.isError) {
    return (
      <div className="grid min-w-0 gap-4">
        <ClivraPageHeader
          title="Clínica"
          description="Dados cadastrais, contato, pagamentos e endereço da unidade padrão."
        />
        <Alert variant="destructive">
          <AlertDescription>{adminErrorMessage(clinicQuery.error)}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <form
      className="grid min-w-0 gap-5"
      onSubmit={(e) => {
        void form.handleSubmit(onSave)(e);
      }}
    >
      <ClivraPageHeader
        title="Clínica"
        description="Dados cadastrais, contato, pagamentos e endereço da unidade padrão."
      />

      {update.isSuccess ? (
        <Alert>
          <AlertDescription>Clínica atualizada.</AlertDescription>
        </Alert>
      ) : null}
      {lookupError ? (
        <Alert variant="destructive">
          <AlertDescription>{lookupError}</AlertDescription>
        </Alert>
      ) : null}
      {lookupSuccess ? (
        <Alert>
          <AlertDescription>{lookupSuccess}</AlertDescription>
        </Alert>
      ) : null}

      <SettingsCard
        title="Identificação"
        description="Nome da clínica e registros oficiais. Dica: digite o CNPJ e clique na lupa para preencher sozinho."
      >
        <FieldGroup className="gap-4">
          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor="name">Nome da clínica</FieldLabel>
            <Input id="name" autoComplete="organization" {...form.register('name')} />
            <FieldError>{form.formState.errors.name?.message}</FieldError>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.legalName)}>
              <FieldLabel htmlFor="legalName">Razão social</FieldLabel>
              <Input id="legalName" {...form.register('legalName')} />
              <FieldError>{form.formState.errors.legalName?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.taxId)}>
              <FieldLabel htmlFor="taxId">CNPJ</FieldLabel>
              <Controller
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <InputGroup className="h-10">
                    <InputGroupInput
                      id="taxId"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="00.000.000/0000-00"
                      value={field.value ?? ''}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        clearLookupFeedback();
                        field.onChange(formatCnpjMask(event.target.value));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void onLookupCnpj();
                        }
                      }}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        variant="ghost"
                        className="cursor-pointer"
                        disabled={cnpjLoading}
                        aria-label="Buscar CNPJ"
                        onClick={() => {
                          void onLookupCnpj();
                        }}
                      >
                        {cnpjLoading ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <SearchIcon className="size-4" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                )}
              />
              <FieldDescription>
                Digite o CNPJ e clique na lupa (ou Enter) para buscar razão social e endereço.
              </FieldDescription>
              <FieldError>{form.formState.errors.taxId?.message}</FieldError>
            </Field>
          </div>

          <Field data-invalid={Boolean(form.formState.errors.responsibleCro)}>
            <FieldLabel htmlFor="responsibleCro">CRO responsável</FieldLabel>
            <Input id="responsibleCro" {...form.register('responsibleCro')} />
            <FieldDescription>
              Registro do responsável técnico da clínica perante o CRO.
            </FieldDescription>
            <FieldError>{form.formState.errors.responsibleCro?.message}</FieldError>
          </Field>
        </FieldGroup>
      </SettingsCard>

      <SettingsCard
        title="Contato e funcionamento"
        description="Telefone da clínica e o fuso horário usado na agenda, nos orçamentos e nos relatórios."
      >
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.phone)}>
              <FieldLabel htmlFor="phone">Telefone</FieldLabel>
              <Controller
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-0000"
                    value={field.value ?? ''}
                    onBlur={field.onBlur}
                    onChange={(event) => {
                      field.onChange(formatPhoneInputMask(event.target.value));
                    }}
                  />
                )}
              />
              <FieldError>{form.formState.errors.phone?.message}</FieldError>
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.timezone)}>
              <FieldLabel htmlFor="timezone">Fuso horário</FieldLabel>
              <Controller
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <Combobox
                    items={timezoneItems}
                    value={field.value}
                    onValueChange={(next) => {
                      if (typeof next === 'string' && next.length > 0) {
                        field.onChange(next);
                      }
                    }}
                    itemToStringLabel={brazilTimezoneLabel}
                  >
                    <ComboboxInput
                      id="timezone"
                      placeholder="Buscar fuso…"
                      className="w-full h-10"
                      showClear={false}
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>Nenhum fuso encontrado.</ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => (
                          <ComboboxItem key={item} value={item}>
                            {brazilTimezoneLabel(item)}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )}
              />
              <FieldDescription>
                Define o “dia civil” da clínica (agenda, validade de orçamento e relatórios).
              </FieldDescription>
              <FieldError>{form.formState.errors.timezone?.message}</FieldError>
            </Field>
          </div>

          <Field data-invalid={Boolean(form.formState.errors.chairsEnabled)}>
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <FieldLabel htmlFor="chairsEnabled" className="text-sm font-medium">
                  Usar agenda por cadeira
                </FieldLabel>
                <FieldDescription className="mt-1">
                  Ligue se a clínica tem mais de um box ou sala. Desligado, a agenda e o menu
                  escondem a visão por cadeira.
                </FieldDescription>
              </div>
              <Controller
                control={form.control}
                name="chairsEnabled"
                render={({ field }) => (
                  <Switch
                    id="chairsEnabled"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    aria-label="Usar agenda por cadeira"
                  />
                )}
              />
            </div>
            <FieldError>{form.formState.errors.chairsEnabled?.message}</FieldError>
          </Field>
        </FieldGroup>
      </SettingsCard>

      <SettingsCard
        title="Formas de pagamento"
        description="O que a clínica aceita receber. Deixe pelo menos uma marcada."
      >
        <Field data-invalid={Boolean(form.formState.errors.acceptedPaymentMethods)}>
          <FieldLabel htmlFor="acceptedPaymentMethods">Métodos de pagamento</FieldLabel>
          <Controller
            control={form.control}
            name="acceptedPaymentMethods"
            render={({ field }) => (
              <Combobox
                multiple
                items={PAYMENT_ITEMS}
                value={field.value}
                onValueChange={(next) => {
                  field.onChange(next ?? []);
                }}
                itemToStringLabel={paymentLabel}
              >
                <ComboboxChips
                  ref={paymentAnchor}
                  className="w-full min-h-10"
                  data-invalid={Boolean(form.formState.errors.acceptedPaymentMethods) || undefined}
                >
                  <ComboboxValue>
                    {(values: string[]) =>
                      values.map((item) => (
                        <ComboboxChip key={item}>{paymentLabel(item)}</ComboboxChip>
                      ))
                    }
                  </ComboboxValue>
                  <ComboboxChipsInput
                    id="acceptedPaymentMethods"
                    placeholder={field.value?.length ? 'Adicionar…' : 'Selecione os métodos…'}
                  />
                </ComboboxChips>
                <ComboboxContent anchor={paymentAnchor}>
                  <ComboboxEmpty>Nenhum método encontrado.</ComboboxEmpty>
                  <ComboboxList>
                    {(item: string) => (
                      <ComboboxItem key={item} value={item}>
                        {paymentLabel(item)}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          />
          <FieldError>{form.formState.errors.acceptedPaymentMethods?.message}</FieldError>
        </Field>
      </SettingsCard>

      <SettingsCard
        title="Endereço"
        description="Onde a clínica fica. Dica: digite o CEP e clique na lupa para preencher rua, bairro e cidade."
      >
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <Field>
              <FieldLabel htmlFor="postalCode">CEP</FieldLabel>
              <Controller
                control={form.control}
                name="address.postalCode"
                render={({ field }) => (
                  <InputGroup className="h-10">
                    <InputGroupInput
                      id="postalCode"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                      value={field.value ?? ''}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        clearLookupFeedback();
                        field.onChange(formatCepMask(event.target.value));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void onLookupCep();
                        }
                      }}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-sm"
                        variant="ghost"
                        className="cursor-pointer"
                        disabled={cepLoading}
                        aria-label="Buscar CEP"
                        onClick={() => {
                          void onLookupCep();
                        }}
                      >
                        {cepLoading ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <SearchIcon className="size-4" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="street">Rua</FieldLabel>
              <Input
                id="street"
                autoComplete="street-address"
                {...form.register('address.street')}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
            <Field>
              <FieldLabel htmlFor="number">Número</FieldLabel>
              <Input id="number" {...form.register('address.number')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="complement">Complemento</FieldLabel>
              <Input id="complement" {...form.register('address.complement')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="district">Bairro</FieldLabel>
              <Input id="district" {...form.register('address.district')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
            <Field>
              <FieldLabel htmlFor="city">Cidade</FieldLabel>
              <Input id="city" autoComplete="address-level2" {...form.register('address.city')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="state">UF</FieldLabel>
              <Input
                id="state"
                maxLength={2}
                autoComplete="address-level1"
                className="uppercase"
                {...form.register('address.state')}
              />
            </Field>
          </div>
        </FieldGroup>
      </SettingsCard>

      <SettingsSaveBar
        visible={form.formState.isDirty}
        saving={update.isPending}
        onDiscard={resetToSaved}
      />
    </form>
  );
}
