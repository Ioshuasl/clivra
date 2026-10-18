import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { toJsonCents } from '../../helpers/money.helper.js';
import { tenantTimezone } from '../../helpers/tenant_today.helper.js';
import { GetRepository } from '../../repositories/report/cash_flow_get.repository.js';
import type { CashFlowQuerySchema } from '../../schemas/billing.schema.js';
import type { CashFlowDto } from '../../types/report/report.types.js';
import type { PaymentMethod } from '../../enum/payment/payment_method.enum.js';

export class GetService {
  constructor(private readonly get = new GetRepository()) {}

  async execute(ctx: RequestContext, cashFlowQuerySchema: CashFlowQuerySchema): Promise<CashFlowDto> {
    const raw = await this.get.execute(ctx, cashFlowQuerySchema, await tenantTimezone(ctx));
    const opening = raw.openingInflowsCents - raw.openingOutflowsCents;
    const inflowsCents = raw.inflows.reduce((sum, line) => sum + line.amountCents, 0n);
    const outflowsCents = raw.outflows.reduce((sum, line) => sum + line.amountCents, 0n);

    const byDayMap = new Map<string, { inflowsCents: bigint; outflowsCents: bigint }>();
    for (const line of raw.inflows) {
      const current = byDayMap.get(line.date) ?? { inflowsCents: 0n, outflowsCents: 0n };
      current.inflowsCents += line.amountCents;
      byDayMap.set(line.date, current);
    }
    for (const line of raw.outflows) {
      const current = byDayMap.get(line.date) ?? { inflowsCents: 0n, outflowsCents: 0n };
      current.outflowsCents += line.amountCents;
      byDayMap.set(line.date, current);
    }
    const dates = [...byDayMap.keys()].sort();
    let running = opening;
    const byDay = dates.map((date) => {
      const day = byDayMap.get(date)!;
      running += day.inflowsCents - day.outflowsCents;
      return {
        date,
        inflowsCents: toJsonCents(day.inflowsCents),
        outflowsCents: toJsonCents(day.outflowsCents),
        balanceCents: toJsonCents(running),
      };
    });

    const inflowCats = new Map<string, bigint>();
    const outflowCats = new Map<string, bigint>();
    for (const line of raw.inflows) {
      inflowCats.set(line.category, (inflowCats.get(line.category) ?? 0n) + line.amountCents);
    }
    for (const line of raw.outflows) {
      outflowCats.set(line.category, (outflowCats.get(line.category) ?? 0n) + line.amountCents);
    }

    const methods = new Map<PaymentMethod, bigint>();
    for (const line of raw.inflows) {
      if (!line.method) continue;
      methods.set(line.method, (methods.get(line.method) ?? 0n) + line.amountCents);
    }

    return {
      basis: cashFlowQuerySchema.basis,
      openingBalanceCents: toJsonCents(opening),
      inflowsCents: toJsonCents(inflowsCents),
      outflowsCents: toJsonCents(outflowsCents),
      closingBalanceCents: toJsonCents(opening + inflowsCents - outflowsCents),
      byDay,
      byCategory: {
        inflows: [...inflowCats.entries()].map(([category, amountCents]) => ({
          category,
          amountCents: toJsonCents(amountCents),
        })),
        outflows: [...outflowCats.entries()].map(([category, amountCents]) => ({
          category,
          amountCents: toJsonCents(amountCents),
        })),
      },
      byPaymentMethod: [...methods.entries()].map(([method, amountCents]) => ({
        method,
        amountCents: toJsonCents(amountCents),
      })),
    };
  }
}
