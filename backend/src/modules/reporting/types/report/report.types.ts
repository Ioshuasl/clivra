import type { RevenueGroupBy } from '../../enum/report/revenue_group_by.enum.js';

export type DashboardAgendaByStatus = Record<string, number>;

export type DashboardDto = {
  date: string;
  timezone: string;
  agendaByStatus: DashboardAgendaByStatus;
  receivableTodayCents: number;
  receivableTodayCount: number;
  noShowsMonthCount: number;
  productionMonthCents: number;
  drillDown: {
    agenda: string;
    receivableToday: string;
    noShows: string;
    production: string;
  };
};

export type NoShowItemDto = {
  appointmentId: string;
  patientId: string;
  patientCode: number;
  professionalId: string;
  professionalName: string;
  procedureName: string | null;
  status: string;
  startsAt: string;
  estimatedLossCents: number;
};

export type NoShowsReportDto = {
  from: string;
  to: string;
  noShowCount: number;
  cancelledCount: number;
  estimatedLossCents: number;
  items: NoShowItemDto[];
};

export type RevenueBucketDto = {
  key: string;
  label: string;
  amountCents: number;
  count: number;
};

export type RevenueReportDto = {
  from: string;
  to: string;
  groupBy: RevenueGroupBy;
  totalCents: number;
  buckets: RevenueBucketDto[];
};

export type ProcedureReportItemDto = {
  procedureId: string;
  procedureCode: string;
  procedureName: string;
  count: number;
  totalCents: number;
};

export type ProceduresReportDto = {
  from: string;
  to: string;
  items: ProcedureReportItemDto[];
};
