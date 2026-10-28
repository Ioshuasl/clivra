const ALLOWED_VARS = new Set(['nome', 'clinica', 'data', 'hora', 'link', 'valor', 'codigo']);

export function renderTemplateBody(
  body: string,
  variables: Record<string, string>,
): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    if (!ALLOWED_VARS.has(key)) return '';
    return variables[key] ?? '';
  });
}

export function parseTemplateVariables(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string');
}

export function isAgendaTemplate(key: string): boolean {
  return (
    key === 'appointment_created' ||
    key === 'appointment_confirmation' ||
    key === 'appointment_reminder' ||
    key === 'appointment_cancelled'
  );
}
