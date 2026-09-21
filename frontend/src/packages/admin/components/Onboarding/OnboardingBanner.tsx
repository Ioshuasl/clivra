'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ONBOARDING_LEGACY_PATH,
  PRIMEIROS_PASSOS_PATH,
} from '@/packages/admin/enum/OnboardingStepEnum';
import { ONBOARDING_SUGGEST_BANNER_ID } from '@/packages/admin/helpers/StartOnboardingSuggestTour';
import { useOnboardingGetHook } from '@/packages/admin/hooks/Onboarding/useOnboardingGetHook';
import { useOnboardingSuggestTourHook } from '@/packages/admin/hooks/Onboarding/useOnboardingSuggestTourHook';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/helpers/utils';

export function OnboardingBanner() {
  const pathname = usePathname();
  const onboardingQuery = useOnboardingGetHook();
  const onPrimeirosPassosPage =
    pathname === PRIMEIROS_PASSOS_PATH ||
    pathname.startsWith(`${PRIMEIROS_PASSOS_PATH}/`) ||
    pathname === ONBOARDING_LEGACY_PATH;

  const visible =
    !onPrimeirosPassosPage &&
    !onboardingQuery.isLoading &&
    Boolean(onboardingQuery.data) &&
    !onboardingQuery.data?.completed;

  useOnboardingSuggestTourHook({ ready: visible });

  if (!visible) {
    return null;
  }

  return (
    <div
      id={ONBOARDING_SUGGEST_BANNER_ID}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[0_1px_2px_rgb(74_15_22/0.04)]"
    >
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-foreground">Complete os primeiros passos</p>
        <p className="text-xs text-muted-foreground">
          Faltam configurações para a clínica ficar pronta para atender.
        </p>
      </div>
      <Link
        href={PRIMEIROS_PASSOS_PATH}
        className={cn(buttonVariants({ size: 'sm' }), 'cursor-pointer')}
      >
        Continuar
      </Link>
    </div>
  );
}
