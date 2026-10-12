import type { RevenueGroupBy } from '../../enum/report/revenue_group_by.enum.js';

export type MoneyCount = {
  count: number;
  amountCents: number;
};

export type DashboardAgenda = {
  total: number;
  byStatus: Record<string, number>;
};

export type DashboardDto = {
  date: string;
  timezone: string;
  agenda: DashboardAgenda;
  receivableToday: MoneyCount | null;
  receivedToday: MoneyCount | null;
  noShowsMonth: { count: number };
  productionMonth: { executedCents: number };
  hrefs: {
    agenda: string;
    receivableToday: string;
    receivedToday: string;
    noShowsMonth: string;
    productionMonth: string;
  };
};

export type NoShowItemDto = {
  appointmentId: string;
  status: string;
  startsAt: string;
  professionalId: string;
  professionalName: string;
  procedureName: string | null;
  estimatedLossCents: number;
};

export type NoShowReportDto = {
  from: string;
  to: string;
  noShowCount: number;
  cancelledCount: number;
  estimatedLossCents: number;
  items: NoShowItemDto[];
};

export type RevenueItemDto = {
  key: string;
  amountCents: number;
  count: number;
  professionalId?: string;
  professionalName?: string;
};

export type RevenueReportDto = {
  from: string;
  to: string;
  groupBy: RevenueGroupBy;
  totalCents: number;
  count: number;
  items: RevenueItemDto[];
};

export type ProcedureReportItemDto = {
  procedureId: string;
  procedureName: string;
  count: number;
  executedCents: number;
};

export type ProcedureReportDto = {
  from: string;
  to: string;
  items: ProcedureReportItemDto[];
};

export type ReportPeriod = {
  from: string;
  to: string;
  start: Date;
  endExclusive: Date;
};

export type DashboardQuery = {
  date: string;
  unitId?: string;
  professionalId?: string;
  includeFinancial: boolean;
};
