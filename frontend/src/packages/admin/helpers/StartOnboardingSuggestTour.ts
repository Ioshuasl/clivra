'use client';

import {
  clearOnboardingSuggest,
  hasOnboardingSuggest,
} from '@/shared/helpers/onboarding-suggest-flag';

export const ONBOARDING_SUGGEST_BANNER_ID = 'onboarding-suggest-banner';

type StartOnboardingSuggestTourInput = {
  onOpenWizard: () => void;
};

export async function startOnboardingSuggestTour(
  input: StartOnboardingSuggestTourInput,
): Promise<(() => void) | null> {
  if (!hasOnboardingSuggest()) return null;

  const element = document.getElementById(ONBOARDING_SUGGEST_BANNER_ID);
  if (!element) return null;

  const [{ driver }] = await Promise.all([
    import('driver.js'),
    import('driver.js/dist/driver.css'),
  ]);

  const tour = driver({
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 12,
    allowClose: true,
    nextBtnText: 'Abrir primeiros passos',
    doneBtnText: 'Abrir primeiros passos',
    popoverClass: 'onboarding-suggest-popover',
    steps: [
      {
        element: `#${ONBOARDING_SUGGEST_BANNER_ID}`,
        popover: {
          title: 'Configure sua clínica',
          description:
            'Complete os primeiros passos: dados da clínica, horários e profissionais. Etapas opcionais você pode pular por agora.',
          side: 'bottom',
          align: 'start',
          onNextClick: () => {
            clearOnboardingSuggest();
            tour.destroy();
            input.onOpenWizard();
          },
        },
      },
    ],
    onDestroyStarted: () => {
      if (!tour.isActive()) return;
      clearOnboardingSuggest();
      tour.destroy();
    },
  });

  tour.drive();
  return () => {
    if (tour.isActive()) {
      tour.destroy();
    }
  };
}
