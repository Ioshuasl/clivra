export const REVENUE_GROUP_BYS = ['day', 'month', 'professional'] as const;

export type RevenueGroupBy = (typeof REVENUE_GROUP_BYS)[number];
