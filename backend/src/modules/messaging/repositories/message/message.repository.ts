import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import { mapLogItem } from '../../helpers/messaging_mapper.helper.js';
import type { MessageLogItem } from '../../types/messaging.types.js';

export class CreateMessageRepository {
  async execute(
    ctx: RequestContext,
    input: {
      conversationId: string;
      direction: string;
      type: string;
      templateId?: string | null;
      body?: string | null;
      providerMessageId?: string | null;
      status?: string;
      errorCode?: string | null;
      errorMessage?: string | null;
      billable?: boolean;
      relatedType?: string | null;
      relatedId?: string | null;
      sentBy?: string | null;
      idempotencyKey?: string | null;
      mediaKey?: string | null;
    },
  ): Promise<{ id: string; created: boolean }> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      if (input.providerMessageId) {
        const existing = await tx.message.findFirst({
          where: { providerMessageId: input.providerMessageId },
          select: { id: true },
        });
        if (existing) return { id: existing.id, created: false };
      }
      try {
        const row = await tx.message.create({
          data: {
            id: idGenerator.next(),
            tenantId: ctx.tenantId,
            conversationId: input.conversationId,
            direction: input.direction,
            type: input.type,
            templateId: input.templateId ?? null,
            body: input.body ?? null,
            providerMessageId: input.providerMessageId ?? null,
            status: input.status ?? 'QUEUED',
            errorCode: input.errorCode ?? null,
            errorMessage: input.errorMessage ?? null,
            billable: input.billable ?? false,
            relatedType: input.relatedType ?? null,
            relatedId: input.relatedId ?? null,
            sentBy: input.sentBy ?? null,
            idempotencyKey: input.idempotencyKey ?? null,
            mediaKey: input.mediaKey ?? null,
          },
        });
        return { id: row.id, created: true };
      } catch (err) {
        const code = String((err as { code?: string }).code ?? '');
        if (code === 'P2002' && input.providerMessageId) {
          const existing = await tx.message.findFirst({
            where: { providerMessageId: input.providerMessageId },
            select: { id: true },
          });
          if (existing) return { id: existing.id, created: false };
        }
        throw err;
      }
    });
  }
}

export class UpdateMessageByProviderIdRepository {
  async execute(
    ctx: RequestContext,
    providerMessageId: string,
    patch: { status: string; errorCode?: string | null; errorMessage?: string | null },
  ): Promise<{ id: string; billable: boolean; debited: boolean } | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.message.findFirst({
        where: { tenantId: ctx.tenantId, providerMessageId },
      });
      if (!row) return null;
      await tx.message.update({
        where: { id: row.id },
        data: patch,
      });
      const alreadyDebited = await tx.messageCreditLedger.findFirst({
        where: { tenantId: ctx.tenantId, messageId: row.id, kind: 'CONSUMPTION' },
        select: { id: true },
      });
      return { id: row.id, billable: row.billable, debited: Boolean(alreadyDebited) };
    });
  }
}

export class ListMessageLogsRepository {
  async execute(
    ctx: RequestContext,
    input: { from?: Date; to?: Date; result?: string; cursor?: string; limit: number },
  ): Promise<{ items: MessageLogItem[]; nextCursor: string | null }> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const rows = await tx.message.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.from || input.to
            ? {
                createdAt: {
                  ...(input.from ? { gte: input.from } : {}),
                  ...(input.to ? { lte: input.to } : {}),
                },
              }
            : {}),
          ...(input.result
            ? {
                OR: [{ status: input.result }, { errorCode: input.result }],
              }
            : {}),
          ...(input.cursor ? { id: { lt: input.cursor } } : {}),
        },
        include: { template: { select: { key: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: input.limit + 1,
      });
      const page = rows.slice(0, input.limit);
      const next = rows.length > input.limit ? page[page.length - 1]?.id ?? null : null;
      return { items: page.map(mapLogItem), nextCursor: next };
    });
  }
}
