/** Tokens Clivra para a grade de agenda (densidade operacional). */
export const AGENDA_TOKENS = {
  gridBg: 'bg-card',
  hourLine: 'border-border',
  dayHeader: 'bg-card border-border',
  dayHeaderToday: 'bg-muted/60 text-primary',
  slotHover: 'hover:bg-muted/40',
  slotToday: 'bg-muted/20',
  blockBg: 'bg-muted/80 text-muted-foreground',
  nowLine: 'bg-destructive',
  transition: 'transition-colors duration-200',
  pxPerMinute: 1.2,
  dayStartHour: 7,
  dayEndHour: 20,
} as const;

/** @deprecated Use AGENDA_TOKENS */
export const AGENDA_NOTION = AGENDA_TOKENS;

/** Valor do seletor de profissional para ver todos de uma vez. */
export const AGENDA_ALL_PROFESSIONALS = 'all';

export const SLOT_MINUTES_OPTIONS = [10, 15, 20, 30, 60] as const;
export type SlotMinutes = (typeof SLOT_MINUTES_OPTIONS)[number];
