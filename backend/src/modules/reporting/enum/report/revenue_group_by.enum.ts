export const REVENUE_GROUP_BY = ['day', 'month', 'professional'] as const;
export type RevenueGroupBy = (typeof REVENUE_GROUP_BY)[number];
