import {
  CLINICAL_DOCUMENT_KINDS,
  DOCUMENT_KINDS,
  type DocumentKind,
} from '../../enum/document/document_kind.enum.js';

type Access = 'read' | 'write';

/**
 * Receita e atestado seguem o prontuário (dono e dentista); contrato e termo seguem
 * o cadastro do paciente (inclui recepção).
 */
export function canAccessKind(
  permissions: readonly string[] | undefined,
  kind: DocumentKind,
  access: Access,
): boolean {
  const granted = new Set(permissions ?? []);
  const clinical = CLINICAL_DOCUMENT_KINDS.includes(kind);
  const area = clinical ? 'clinical_records' : 'patients';
  return granted.has(`${area}.${access}`);
}

export function accessibleKinds(
  permissions: readonly string[] | undefined,
  access: Access,
): DocumentKind[] {
  return DOCUMENT_KINDS.filter((kind) => canAccessKind(permissions, kind, access));
}
