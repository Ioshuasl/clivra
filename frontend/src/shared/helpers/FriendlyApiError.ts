import { ApiClientError } from '@/shared/api/api-client';

/** Nomes dos campos como a pessoa os conhece (o servidor devolve o nome técnico). */
const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  socialName: 'Nome social',
  cpf: 'CPF',
  cpfCnpj: 'CPF/CNPJ',
  birthDate: 'Nascimento',
  phonePrimary: 'Telefone',
  phoneSecondary: 'Telefone 2',
  email: 'E-mail',
  password: 'Senha',
  notes: 'Observações',
  reason: 'Motivo',
  startsAt: 'Início',
  endsAt: 'Fim',
  patientId: 'Paciente',
  professionalId: 'Profissional',
  procedureId: 'Procedimento',
  dueDate: 'Vencimento',
  validUntil: 'Validade',
  amountCents: 'Valor',
  description: 'Descrição',
  title: 'Título',
  code: 'Código',
  role: 'Perfil',
};

type Issue = { code?: string; path?: unknown[]; message?: string; minimum?: number; maximum?: number };

function issuesOf(error: ApiClientError): Issue[] {
  const details = error.details as { issues?: Issue[] } | undefined;
  return Array.isArray(details?.issues) ? details.issues : [];
}

function fieldLabel(path: unknown[] | undefined): string {
  const last = path?.[path.length - 1];
  const key = typeof last === 'string' || typeof last === 'number' ? String(last) : '';
  return FIELD_LABELS[key] ?? '';
}

/** Traduz uma falha de validação do servidor numa frase curta em português. */
function issueText(issue: Issue): string {
  const label = fieldLabel(issue.path);
  const message = issue.message ?? '';
  let reason: string;
  if (issue.code === 'invalid_type' && /Required/i.test(message)) reason = 'é obrigatório';
  else if (issue.code === 'too_small') reason = issue.minimum === 1 ? 'é obrigatório' : `precisa ter ao menos ${issue.minimum} caracteres`;
  else if (issue.code === 'too_big') reason = `pode ter no máximo ${issue.maximum} caracteres`;
  else if (issue.code === 'invalid_string' && /email/i.test(message)) reason = 'não parece um e-mail válido';
  else if (issue.code === 'invalid_string' && /uuid/i.test(message)) reason = 'precisa ser escolhido na lista';
  else if (issue.code === 'invalid_enum_value') reason = 'tem uma opção inválida';
  else if (issue.code === 'invalid_date') reason = 'não é uma data válida';
  else if (issue.code === 'unrecognized_keys') return '';
  else if (/[áéíóúãõçà]/i.test(message)) reason = message.charAt(0).toLowerCase() + message.slice(1);
  else reason = 'está incorreto';
  return label ? `${label} ${reason}` : '';
}

const BY_STATUS: Record<number, string> = {
  400: 'Confira os dados informados e tente de novo.',
  401: 'Sua sessão expirou. Entre novamente para continuar.',
  403: 'Você não tem permissão para fazer isso. Fale com quem administra a clínica.',
  404: 'Não encontramos o que você procurou. Ele pode ter sido removido.',
  409: 'Essas informações conflitam com algo que já existe. Revise e tente de novo.',
  413: 'O arquivo ou os dados enviados são grandes demais.',
  422: 'Confira os dados informados e tente de novo.',
  429: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.',
};

/** Mensagem que o servidor já escreveu para a pessoa (português, sem termos técnicos)? */
function isHumanMessage(message: string): boolean {
  if (!message || message.length < 4) return false;
  if (/\b(startsAt|endsAt|undefined|null|NaN|HTTP \d{3}|Zod|Required|Invalid|Unexpected|ECONN|fetch failed)\b/i.test(message)) return false;
  return /[áéíóúãõçà]|\b(não|nao|deve|precisa|inválid|obrigat|informe|selecione|já|existe|permiss)/i.test(message) || /^[A-ZÁÉÍÓÚ][^{}[\]]+\.$/.test(message);
}

/** Texto para mostrar a qualquer pessoa, em qualquer tela, quando uma chamada à API falha. */
export function friendlyApiError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') return error.message;
    if (error.status >= 500 || error.code === 'INTERNAL_ERROR') {
      return 'Algo deu errado do nosso lado. Tente de novo em instantes — se continuar, avise o suporte.';
    }
    if (error.code === 'VALIDATION_ERROR') {
      const lines = [...new Set(issuesOf(error).map(issueText).filter(Boolean))];
      if (lines.length > 0) return `Revise: ${lines.slice(0, 3).join('; ')}.`;
      if (isHumanMessage(error.message) && !/^Dados inválidos\.?$/i.test(error.message)) return error.message;
      return BY_STATUS[400] ?? 'Confira os dados informados.';
    }
    if (error.code === 'INVALID_RESPONSE' || error.code === 'HTTP_ERROR') {
      return 'Não conseguimos falar com o servidor agora. Tente de novo em instantes.';
    }
    if (isHumanMessage(error.message)) return error.message;
    return BY_STATUS[error.status] ?? 'Não foi possível concluir a operação. Tente de novo.';
  }
  if (error instanceof Error && isHumanMessage(error.message)) return error.message;
  return 'Não foi possível concluir a operação. Tente de novo.';
}

/** Título curto do aviso (toast) conforme o tipo de falha. */
export function friendlyApiErrorTitle(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') return 'Sem conexão';
    if (error.status >= 500) return 'Erro no servidor';
    if (error.status === 401) {
      if (/credenciais|senha|e-mail/i.test(error.message)) return 'Não foi possível entrar';
      return /sess|token|expir/i.test(error.message) ? 'Sessão expirada' : 'Acesso negado';
    }
    if (error.status === 403) return 'Sem permissão';
    if (error.status === 429) return 'Calma, muitas tentativas';
    if (error.code === 'VALIDATION_ERROR') return 'Confira os dados';
  }
  return 'Não foi possível concluir';
}
