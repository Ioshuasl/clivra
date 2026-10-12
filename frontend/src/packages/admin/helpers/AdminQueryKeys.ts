import type { AuditLogListQuery } from '@/packages/admin/types/AuditLog/AuditLogTypes';
import type { DataSubjectRequestListQuery } from '@/packages/admin/types/DataSubjectRequest/DataSubjectRequestTypes';
import type { DashboardQuery } from '@/packages/admin/types/Report/ReportTypes';
import type { NoShowsQuery } from '@/packages/admin/types/Report/ReportTypes';
import type { ProceduresQuery } from '@/packages/admin/types/Report/ReportTypes';
import type { RevenueQuery } from '@/packages/admin/types/Report/ReportTypes';

export const adminQueryKeys = {
  clinic: ['clinic'] as const,
  chairs: (unitId: string) => ['chairs', unitId] as const,
  businessHours: (unitId: string, professionalId?: string | null) =>
    ['business-hours', unitId, professionalId ?? null] as const,
  professionals: ['professionals'] as const,
  procedures: ['procedures'] as const,
  members: ['members'] as const,
  invitations: ['invitations'] as const,
  onboarding: ['onboarding'] as const,
  anamnesisForms: ['anamnesis-forms'] as const,
  auditLogs: (query: AuditLogListQuery) => ['audit-logs', query] as const,
  auditLogPatients: (search: string) => ['audit-logs', 'patients', search] as const,
  dataSubjectRequests: (query: DataSubjectRequestListQuery) =>
    ['data-subject-requests', query] as const,
  dataSubjectRequest: (id: string) => ['data-subject-requests', 'item', id] as const,
  tenantExport: (exportId: string) => ['tenant-export', exportId] as const,
  export: (exportId: string) => ['export', exportId] as const,
  dashboard: (query: DashboardQuery | string | undefined) =>
    ['reports', 'dashboard', query] as const,
  dashboardAppointments: (query: { from: string; to: string }) =>
    ['dashboard', 'appointments', query.from, query.to] as const,
  noShows: (query: NoShowsQuery) => ['reports', 'no-shows', query] as const,
  revenue: (query: RevenueQuery) => ['reports', 'revenue', query] as const,
  reportProcedures: (query: ProceduresQuery) => ['reports', 'procedures', query] as const,
  procedureReport: (query: ProceduresQuery) => ['reports', 'procedure', query] as const,
  reportExport: (exportId: string) => ['reports', 'export', exportId] as const,
  subscription: ['subscription'] as const,
  subscriptionPlans: ['subscription', 'plans'] as const,
  subscriptionUsage: ['subscription', 'usage'] as const,
  subscriptionPayments: ['subscription', 'payments'] as const,
  subscriptionPaymentPay: (paymentId: string) =>
    ['subscription', 'payments', 'pay', paymentId] as const,
};
