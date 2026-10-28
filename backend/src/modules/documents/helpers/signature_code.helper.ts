import { randomInt } from 'node:crypto';
import { hashToken } from '../../../shared/helpers/token_hash.js';

export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 5;

export function generateSignatureCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** O código é amarrado ao pedido: o mesmo número em outro pedido não vale. */
export function hashSignatureCode(requestId: string, code: string): string {
  return hashToken(`${requestId}:${code}`);
}

/** "final 4321": o paciente reconhece o destino sem expor o número inteiro. */
export function destinationHint(phoneOrEmail: string): string {
  if (phoneOrEmail.includes('@')) {
    const [user = '', domain = ''] = phoneOrEmail.split('@');
    return `${user.slice(0, 2)}***@${domain}`;
  }
  return `final ${phoneOrEmail.replace(/\D/g, '').slice(-4)}`;
}
