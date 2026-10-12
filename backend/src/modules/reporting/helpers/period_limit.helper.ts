import {
  ReportPeriodInvalidError,
  ReportPeriodTooLongError,
} from '../models/errors/reporting.errors.js';
import { inclusiveDayCount } from './civil_period.helper.js';

export const REPORT_MAX_PERIOD_DAYS = 366;

export function assertReportPeriod(from: string, to: string, maxDays = REPORT_MAX_PERIOD_DAYS): void {
  if (from > to) throw new ReportPeriodInvalidError();
  if (inclusiveDayCount(from, to) > maxDays) throw new ReportPeriodTooLongError(maxDays);
}
