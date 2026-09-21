export const OnboardingStep = {
  CLINIC: 'clinic',
  HOURS: 'hours',
  PROFESSIONALS: 'professionals',
  PROCEDURES: 'procedures',
  TEAM: 'team',
  WHATSAPP: 'whatsapp',
  FIRST_APPOINTMENT: 'firstAppointment',
} as const;

export type OnboardingStep = (typeof OnboardingStep)[keyof typeof OnboardingStep];

export const ONBOARDING_STEPS = Object.values(OnboardingStep);

export const REQUIRED_ONBOARDING_STEPS: readonly OnboardingStep[] = [
  OnboardingStep.CLINIC,
  OnboardingStep.HOURS,
  OnboardingStep.PROFESSIONALS,
];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  clinic: 'Dados da clínica',
  hours: 'Horários de funcionamento',
  professionals: 'Profissionais',
  procedures: 'Procedimentos',
  team: 'Equipe',
  whatsapp: 'WhatsApp',
  firstAppointment: 'Primeiro agendamento',
};

export const ONBOARDING_STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  clinic: 'Nome, endereço e dados básicos para a clínica aparecer direitinho.',
  hours: 'Defina quando a clínica atende — base da agenda.',
  professionals: 'Cadastre os dentistas que vão aparecer na agenda.',
  procedures: 'Monte o catálogo de serviços e valores (pode fazer depois).',
  team: 'Convide recepção e outros acessos (pode fazer depois).',
  whatsapp: 'Conecte o WhatsApp para confirmações (pode fazer depois).',
  firstAppointment: 'Crie o primeiro horário na agenda (pode fazer depois).',
};

export const ONBOARDING_STEP_HREFS: Record<OnboardingStep, string> = {
  clinic: '/app/configuracoes/clinica',
  hours: '/app/configuracoes/horarios',
  professionals: '/app/configuracoes/profissionais',
  procedures: '/app/configuracoes/procedimentos',
  team: '/app/configuracoes/membros',
  whatsapp: '/app/configuracoes/whatsapp',
  firstAppointment: '/app/agenda',
};

/** Rota pública da tela (label: Primeiros passos). */
export const PRIMEIROS_PASSOS_PATH = '/app/primeiros-passos';

/** Alias legado — redireciona para `PRIMEIROS_PASSOS_PATH`. */
export const ONBOARDING_LEGACY_PATH = '/app/onboarding';

export function isOnboardingStepRequired(step: OnboardingStep): boolean {
  return (REQUIRED_ONBOARDING_STEPS as readonly string[]).includes(step);
}

export function publicBookingUrl(publicBookingPath: string, origin?: string): string {
  const slug = publicBookingPath.split('/').filter(Boolean).pop() ?? '';
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/agendar/${slug}`;
}
