import { hasPermission } from '@/shared/auth/permissions';
import type { AuthMe } from '@/shared/auth/AuthTypes';
import type { DocumentKind } from '@/packages/operacional/enum/Document/DocumentKindEnum';

const CLINICAL_KINDS: readonly DocumentKind[] = ['PRESCRIPTION', 'CERTIFICATE'];

/** Espelha a regra do servidor só para esconder o que a pessoa não pode emitir. */
export function canIssueDocumentKind(me: AuthMe | null | undefined, kind: DocumentKind): boolean {
  return hasPermission(me, CLINICAL_KINDS.includes(kind) ? 'clinical_records.write' : 'patients.write');
}
