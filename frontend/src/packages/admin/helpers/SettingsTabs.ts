import type { LucideIcon } from 'lucide-react';
import {
  ArmchairIcon,
  Building2Icon,
  ClipboardListIcon,
  ClockIcon,
  CreditCardIcon,
  FileTextIcon,
  LockIcon,
  MessageCircleIcon,
  ScrollTextIcon,
  StethoscopeIcon,
  SyringeIcon,
  UsersIcon,
} from 'lucide-react';

export const SETTINGS_SECTION = {
  CLINICA: 'clinica',
  HORARIOS: 'horarios',
  CADEIRAS: 'cadeiras',
  PROFISSIONAIS: 'profissionais',
  PROCEDIMENTOS: 'procedimentos',
  ANAMNESE: 'anamnese',
  DOCUMENTOS: 'documentos',
  MEMBROS: 'membros',
  WHATSAPP: 'whatsapp',
  ASSINATURA: 'assinatura',
  AUDITORIA: 'auditoria',
  PRIVACIDADE: 'privacidade',
} as const;

/** @deprecated Use SETTINGS_SECTION */
export const SETTINGS_TAB = SETTINGS_SECTION;

export type SettingsSection = (typeof SETTINGS_SECTION)[keyof typeof SETTINGS_SECTION];
/** @deprecated Use SettingsSection */
export type SettingsTab = SettingsSection;

export type SettingsGroupId = 'clinic' | 'team' | 'care' | 'account';

export type SettingsNavItem = {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
  group: SettingsGroupId;
  /** Frase curta em linguagem leiga: aparece como dica e entra na busca. */
  description: string;
  /** Sinônimos que o usuário pode digitar na busca. */
  keywords?: string;
  permission?: string;
};

/** Ordem e nomes dos grupos da lateral de configurações. */
export const SETTINGS_GROUPS: ReadonlyArray<{ id: SettingsGroupId; label: string }> = [
  { id: 'clinic', label: 'Minha clínica' },
  { id: 'team', label: 'Equipe' },
  { id: 'care', label: 'Atendimento' },
  { id: 'account', label: 'Conta e segurança' },
];

export const SETTINGS_NAV_ITEMS: readonly SettingsNavItem[] = [
  {
    id: SETTINGS_SECTION.CLINICA,
    label: 'Clínica',
    icon: Building2Icon,
    group: 'clinic',
    description: 'Nome, CNPJ, telefone, endereço e formas de pagamento.',
    keywords: 'dados cadastro cnpj endereço telefone fuso pagamento',
  },
  {
    id: SETTINGS_SECTION.HORARIOS,
    label: 'Horários',
    icon: ClockIcon,
    group: 'clinic',
    description: 'Dias e horários em que a clínica atende, feriados e férias.',
    keywords: 'expediente funcionamento feriado férias folga agenda',
  },
  {
    id: SETTINGS_SECTION.CADEIRAS,
    label: 'Cadeiras',
    icon: ArmchairIcon,
    group: 'clinic',
    description: 'Cadeiras ou salas de atendimento da clínica.',
    keywords: 'box sala consultório',
  },
  {
    id: SETTINGS_SECTION.PROFISSIONAIS,
    label: 'Profissionais',
    icon: StethoscopeIcon,
    group: 'team',
    description: 'Dentistas que atendem na clínica e suas especialidades.',
    keywords: 'dentista doutor cro especialidade cor',
  },
  {
    id: SETTINGS_SECTION.MEMBROS,
    label: 'Membros',
    icon: UsersIcon,
    group: 'team',
    description: 'Quem acessa o sistema, convites e o que cada pessoa pode fazer.',
    keywords: 'usuários equipe convite permissão acesso recepção',
    permission: 'users.manage',
  },
  {
    id: SETTINGS_SECTION.PROCEDIMENTOS,
    label: 'Procedimentos',
    icon: SyringeIcon,
    group: 'care',
    description: 'Serviços que a clínica oferece, duração e valor.',
    keywords: 'tratamentos serviços preço valor tabela duração',
  },
  {
    id: SETTINGS_SECTION.ANAMNESE,
    label: 'Anamnese',
    icon: ClipboardListIcon,
    group: 'care',
    description: 'Perguntas da ficha de saúde que o paciente responde.',
    keywords: 'ficha saúde questionário perguntas formulário',
  },
  {
    id: SETTINGS_SECTION.DOCUMENTOS,
    label: 'Documentos',
    icon: FileTextIcon,
    group: 'care',
    description: 'Modelos de receita, atestado, termo de consentimento e contrato.',
    keywords: 'receita atestado termo contrato consentimento modelo texto assinatura',
  },
  {
    id: SETTINGS_SECTION.WHATSAPP,
    label: 'WhatsApp',
    icon: MessageCircleIcon,
    group: 'care',
    description: 'Conectar o número de WhatsApp da clínica.',
    keywords: 'mensagens conversa número conectar lembrete',
  },
  {
    id: SETTINGS_SECTION.ASSINATURA,
    label: 'Assinatura',
    icon: CreditCardIcon,
    group: 'account',
    description: 'Plano contratado, cobranças e forma de pagamento do sistema.',
    keywords: 'plano cobrança fatura cartão pix mensalidade trial',
    permission: 'subscription.manage',
  },
  {
    id: SETTINGS_SECTION.PRIVACIDADE,
    label: 'Privacidade',
    icon: LockIcon,
    group: 'account',
    description: 'Exportar dados da clínica e atender pedidos dos pacientes (LGPD).',
    keywords: 'lgpd exportar dados titular backup',
    permission: 'data.export',
  },
  {
    id: SETTINGS_SECTION.AUDITORIA,
    label: 'Auditoria',
    icon: ScrollTextIcon,
    group: 'account',
    description: 'Histórico de quem viu ou alterou informações no sistema.',
    keywords: 'histórico log acessos segurança quem',
    permission: 'audit.read',
  },
] as const;

/** @deprecated Use SETTINGS_NAV_ITEMS */
export const SETTINGS_TABS = SETTINGS_NAV_ITEMS;

export const DEFAULT_SETTINGS_SECTION: SettingsSection = SETTINGS_SECTION.CLINICA;
/** @deprecated Use DEFAULT_SETTINGS_SECTION */
export const DEFAULT_SETTINGS_TAB = DEFAULT_SETTINGS_SECTION;

export const SETTINGS_PATH = '/app/configuracoes';

export function isSettingsSection(value: string | null | undefined): value is SettingsSection {
  return SETTINGS_NAV_ITEMS.some((item) => item.id === value);
}

/** @deprecated Use isSettingsSection */
export const isSettingsTab = isSettingsSection;

export function parseSettingsSection(value: string | null | undefined): SettingsSection {
  return isSettingsSection(value) ? value : DEFAULT_SETTINGS_SECTION;
}

/** @deprecated Use parseSettingsSection */
export const parseSettingsTab = parseSettingsSection;

export function settingsHref(
  section: SettingsSection = DEFAULT_SETTINGS_SECTION,
  extra?: Record<string, string | undefined | null>,
): string {
  const base = `${SETTINGS_PATH}/${section}`;
  if (!extra) return base;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function isSettingsPath(pathname: string): boolean {
  return pathname === SETTINGS_PATH || pathname.startsWith(`${SETTINGS_PATH}/`);
}
