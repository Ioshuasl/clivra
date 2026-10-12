import { z } from 'zod';
import { EXPORT_FORMATS } from '../enum/report/export_format.enum.js';
import { EXPORTABLE_REPORTS } from '../enum/report/exportable_report.enum.js';
import { REVENUE_GROUP_BYS } from '../enum/report/revenue_group_by.enum.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dashboardQuerySchema = z.object({
  date: isoDate.optional(),
  unitId: z.string().uuid().optional(),
});

export type DashboardQuerySchema = z.infer<typeof dashboardQuerySchema>;

export const noShowsQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  professionalId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
});

export type NoShowsQuerySchema = z.infer<typeof noShowsQuerySchema>;

export const revenueQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  groupBy: z.enum(REVENUE_GROUP_BYS).default('day'),
  unitId: z.string().uuid().optional(),
});

export type RevenueQuerySchema = z.infer<typeof revenueQuerySchema>;

export const proceduresQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  professionalId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
});

export type ProceduresQuerySchema = z.infer<typeof proceduresQuerySchema>;

export const exportReportParamSchema = z.object({
  report: z.enum(EXPORTABLE_REPORTS),
});

export type ExportReportParamSchema = z.infer<typeof exportReportParamSchema>;

export const exportCreateBodySchema = z
  .object({
    format: z.enum(EXPORT_FORMATS).default('CSV'),
    from: isoDate.optional(),
    to: isoDate.optional(),
    date: isoDate.optional(),
    unitId: z.string().uuid().optional(),
    professionalId: z.string().uuid().optional(),
    groupBy: z.enum(REVENUE_GROUP_BYS).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.from && body.to && body.from > body.to) {
      ctx.addIssue({ code: 'custom', message: 'from deve ser ≤ to', path: ['from'] });
    }
  });

export type ExportCreateBodySchema = z.infer<typeof exportCreateBodySchema>;

export const exportIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ExportIdParamSchema = z.infer<typeof exportIdParamSchema>;
