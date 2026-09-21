'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookingShell } from '@/packages/public/components/Booking/BookingShell';
import { BookingStepIdentity } from '@/packages/public/components/Booking/BookingStepIdentity';
import { BookingStepOtp } from '@/packages/public/components/Booking/BookingStepOtp';
import { BookingStepProfessional } from '@/packages/public/components/Booking/BookingStepProfessional';
import { BookingStepSlot } from '@/packages/public/components/Booking/BookingStepSlot';
import { BookingStepSuccess } from '@/packages/public/components/Booking/BookingStepSuccess';
import {
  BOOKING_ANY_PROFESSIONAL,
  type BookingStep,
} from '@/packages/public/enum/Booking/BookingStepEnum';
import { addDaysYmd, ymdInTimeZone } from '@/packages/public/helpers/BookingTime';
import { publicErrorMessage, suggestedSlotsFromError } from '@/packages/public/helpers/PublicErrorMessage';
import { useBookingAvailabilityGetHook } from '@/packages/public/hooks/Booking/useBookingAvailabilityGetHook';
import { useBookingClinicGetHook } from '@/packages/public/hooks/Booking/useBookingClinicGetHook';
import { useBookingCreateHook } from '@/packages/public/hooks/Booking/useBookingCreateHook';
import { useBookingIdentityFormHook } from '@/packages/public/hooks/Booking/useBookingIdentityFormHook';
import { useBookingOtpFormHook } from '@/packages/public/hooks/Booking/useBookingOtpFormHook';
import { useBookingVerifyHook } from '@/packages/public/hooks/Booking/useBookingVerifyHook';
import type { BookingIdentityFormValues } from '@/packages/public/schemas/Booking/BookingSchema';
import type { BookingFormProps } from '@/packages/public/types/Booking/BookingFormTypes';
import type {
  BookingCreateResult,
  BookingVerifyResult,
} from '@/packages/public/types/Booking/BookingTypes';
import { ApiClientError } from '@/shared/api/api-client';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const STEP_META: Record<Exclude<BookingStep, 'success'>, { label: string; index: number }> = {
  professional: { label: 'Profissional', index: 1 },
  slot: { label: 'Data e horário', index: 2 },
  identity: { label: 'Seus dados', index: 3 },
  otp: { label: 'Código de verificação', index: 4 },
};

export function BookingForm({ slug }: BookingFormProps) {
  const clinicQuery = useBookingClinicGetHook(slug);
  const identityForm = useBookingIdentityFormHook();
  const otpForm = useBookingOtpFormHook();
  const create = useBookingCreateHook();
  const verify = useBookingVerifyHook();

  const [step, setStep] = useState<BookingStep>('professional');
  const [professionalChoice, setProfessionalChoice] = useState('');
  const [resolvedProfessionalId, setResolvedProfessionalId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [rangeOffset, setRangeOffset] = useState(0);
  const [booking, setBooking] = useState<BookingCreateResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<BookingVerifyResult | null>(null);
  const [slotAlert, setSlotAlert] = useState<string | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<string[]>([]);

  const clinic = clinicQuery.data;
  const timezone = clinic?.timezone ?? 'America/Sao_Paulo';
  const today = ymdInTimeZone(new Date(), timezone);
  const from = addDaysYmd(today, rangeOffset);
  const to = addDaysYmd(today, rangeOffset + 6);
  const skipProfessional = (clinic?.professionals.length ?? 0) <= 1;

  const availabilityProfessionalIds = useMemo(() => {
    if (!clinic) return [];
    if (professionalChoice === BOOKING_ANY_PROFESSIONAL) {
      return clinic.professionals.map((item) => item.id);
    }
    if (professionalChoice) return [professionalChoice];
    return [];
  }, [clinic, professionalChoice]);

  const availabilityQuery = useBookingAvailabilityGetHook({
    slug,
    professionalIds: availabilityProfessionalIds,
    from,
    to,
    enabled:
      availabilityProfessionalIds.length > 0 && (step === 'slot' || step === 'identity'),
  });

  useEffect(() => {
    if (!clinic) return;
    if (clinic.professionals.length === 1) {
      const only = clinic.professionals[0];
      if (!only) return;
      setProfessionalChoice(only.id);
      setResolvedProfessionalId(only.id);
      if (step === 'professional') setStep('slot');
    }
  }, [clinic, step]);

  const professional = clinic?.professionals.find(
    (item) => item.id === (resolvedProfessionalId || professionalChoice),
  );

  const visibleTotal = skipProfessional ? 3 : 4;
  const visibleIndex = useMemo(() => {
    if (step === 'success') return visibleTotal;
    const raw = STEP_META[step].index;
    if (skipProfessional && raw > 1) return raw - 1;
    return raw;
  }, [skipProfessional, step, visibleTotal]);

  const onSelectSlot = (nextStartsAt: string) => {
    setStartsAt(nextStartsAt);
    if (professionalChoice === BOOKING_ANY_PROFESSIONAL) {
      const owner = availabilityQuery.slotOwners.get(nextStartsAt);
      setResolvedProfessionalId(owner ?? '');
      return;
    }
    setResolvedProfessionalId(professionalChoice);
  };

  const onCreate = async (values: BookingIdentityFormValues) => {
    const professionalId = resolvedProfessionalId || professionalChoice;
    if (!professionalId || professionalId === BOOKING_ANY_PROFESSIONAL) return;

    setSlotAlert(null);
    setSuggestedSlots([]);
    try {
      const result = await create.mutateAsync({
        slug,
        professionalId,
        startsAt,
        name: values.name,
        phone: values.phone,
        email: values.email,
        patientNote: values.patientNote?.trim() || null,
        consentDataProcessing: values.consentDataProcessing,
        consentTerms: values.consentTerms,
        consentWhatsappMarketing: values.consentWhatsappMarketing,
      });
      setBooking(result);
      otpForm.reset({ code: '' });
      setStep('otp');
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'SLOT_UNAVAILABLE') {
        setSlotAlert(publicErrorMessage(error));
        setSuggestedSlots(suggestedSlotsFromError(error));
        setStartsAt('');
        create.reset();
        setStep('slot');
      }
    }
  };

  const onVerify = async (values: { code: string }) => {
    if (!booking) return;
    const result = await verify.mutateAsync({
      slug,
      bookingId: booking.bookingId,
      code: values.code,
    });
    setVerifyResult(result);
    setStep('success');
  };

  if (clinicQuery.isLoading) {
    return (
      <BookingShell title="Carregando…">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-full rounded-[12px]" />
        <Skeleton className="h-12 w-full rounded-[12px]" />
        <Skeleton className="h-12 w-full rounded-[12px]" />
        <Skeleton className="mt-2 h-11 w-full rounded-[10px]" />
      </BookingShell>
    );
  }

  if (clinicQuery.isError || !clinic) {
    const notFound = clinicQuery.error instanceof ApiClientError && clinicQuery.error.status === 404;
    return (
      <BookingShell title="Agendamento">
        <Alert variant="destructive">
          <AlertDescription>
            {notFound ? 'Clínica não encontrada.' : publicErrorMessage(clinicQuery.error)}
          </AlertDescription>
        </Alert>
        {!notFound ? (
          <Button
            type="button"
            size="lg"
            className="mt-auto h-11 w-full cursor-pointer rounded-[10px] font-semibold sm:h-12"
            onClick={() => void clinicQuery.refetch()}
          >
            Tentar novamente
          </Button>
        ) : null}
      </BookingShell>
    );
  }

  if (clinic.professionals.length === 0) {
    return (
      <BookingShell title={clinic.name}>
        <Alert>
          <AlertDescription>
            Esta clínica ainda não possui profissionais disponíveis para agendamento online.
          </AlertDescription>
        </Alert>
      </BookingShell>
    );
  }

  const stepMeta = step === 'success' ? null : STEP_META[step];

  return (
    <BookingShell
      title={clinic.name}
      description={
        step === 'success'
          ? undefined
          : 'Reserve um horário. O dentista define o atendimento na consulta.'
      }
      stepLabel={step === 'success' ? undefined : stepMeta?.label}
      stepIndex={step === 'success' ? undefined : visibleIndex}
      stepTotal={step === 'success' ? undefined : visibleTotal}
      progress={
        step === 'success' ? undefined : Math.round((visibleIndex / visibleTotal) * 100)
      }
    >
      {step === 'professional' && !skipProfessional ? (
        <BookingStepProfessional
          professionals={clinic.professionals}
          selectedId={professionalChoice}
          onSelect={setProfessionalChoice}
          onContinue={() => {
            setStartsAt('');
            setResolvedProfessionalId(
              professionalChoice === BOOKING_ANY_PROFESSIONAL ? '' : professionalChoice,
            );
            setStep('slot');
          }}
        />
      ) : null}

      {step === 'slot' ? (
        <BookingStepSlot
          timezone={timezone}
          days={availabilityQuery.data?.days ?? []}
          loading={availabilityQuery.isLoading}
          errorMessage={
            availabilityQuery.isError ? publicErrorMessage(availabilityQuery.error) : null
          }
          slotAlert={slotAlert}
          suggestedSlots={suggestedSlots}
          selectedStartsAt={startsAt}
          canGoBackRange={rangeOffset > 0}
          onSelect={onSelectSlot}
          onPrevRange={() => setRangeOffset((value) => Math.max(0, value - 7))}
          onNextRange={() => setRangeOffset((value) => value + 7)}
          onRetry={() => void availabilityQuery.refetch()}
          onBack={() => {
            if (skipProfessional) return;
            setStep('professional');
          }}
          showBack={!skipProfessional}
          onContinue={() => setStep('identity')}
        />
      ) : null}

      {step === 'identity' ? (
        <BookingStepIdentity
          form={identityForm}
          pending={create.isPending}
          errorMessage={create.isError ? publicErrorMessage(create.error) : null}
          onBack={() => setStep('slot')}
          onSave={(values) => {
            void onCreate(values);
          }}
        />
      ) : null}

      {step === 'otp' && booking ? (
        <BookingStepOtp
          form={otpForm}
          sentVia={booking.otpSentVia}
          pending={verify.isPending}
          errorMessage={verify.isError ? publicErrorMessage(verify.error) : null}
          onBack={() => setStep('identity')}
          onSave={(values) => {
            void onVerify(values);
          }}
        />
      ) : null}

      {step === 'success' && verifyResult ? (
        <BookingStepSuccess
          timezone={timezone}
          startsAt={verifyResult.appointment.startsAt}
          professionalName={professional?.name}
          requested={verifyResult.appointment.status === 'REQUESTED'}
        />
      ) : null}
    </BookingShell>
  );
}
