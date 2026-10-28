import { z } from 'zod';

/**
 * Mensagens padrão do Zod em português para qualquer campo sem texto próprio
 * (assim a pessoa nunca vê "Required" ou "String must contain at least 1 character").
 */
const ptBrErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return {
        message:
          issue.received === 'undefined' || issue.received === 'null'
            ? 'Campo obrigatório'
            : 'Valor inválido',
      };
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return { message: issue.minimum === 1 ? 'Campo obrigatório' : `Use ao menos ${String(issue.minimum)} caracteres` };
      }
      if (issue.type === 'number') return { message: `O valor mínimo é ${String(issue.minimum)}` };
      if (issue.type === 'array') return { message: issue.minimum === 1 ? 'Escolha ao menos uma opção' : `Escolha ao menos ${String(issue.minimum)} itens` };
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `Use no máximo ${String(issue.maximum)} caracteres` };
      if (issue.type === 'number') return { message: `O valor máximo é ${String(issue.maximum)}` };
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'E-mail inválido' };
      if (issue.validation === 'uuid') return { message: 'Escolha uma opção da lista' };
      if (issue.validation === 'url') return { message: 'Endereço (link) inválido' };
      if (issue.validation === 'regex') return { message: 'Formato inválido' };
      return { message: 'Texto inválido' };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Escolha uma opção da lista' };
    case z.ZodIssueCode.invalid_date:
      return { message: 'Data inválida' };
    case z.ZodIssueCode.invalid_literal:
    case z.ZodIssueCode.invalid_union:
      return { message: 'Valor inválido' };
    default:
      break;
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(ptBrErrorMap);
