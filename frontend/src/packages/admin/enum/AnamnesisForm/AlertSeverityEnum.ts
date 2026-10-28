export const ALERT_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'] as const;

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  INFO: 'Informativo',
  WARNING: 'Atenção',
  CRITICAL: 'Urgente',
};
