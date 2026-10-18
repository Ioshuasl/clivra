import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import { getPrismaClient, getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import type {
  PublicBookingTokenMeta,
  PublicBookingTokenRow,
} from '../../types/public_booking.types.js';

function mapMeta(value: unknown): PublicBookingTokenMeta {
  if (!value || typeof value !== 'object') return {};
  return value;
}

export class CreateTokenRepository {
  async executeInTx(
    tx: DbTransaction,
    ctx: RequestContext,
    input: {
      purpose: string;
      tokenHash: string;
      expiresAt: Date;
      targetId?: string | null;
      meta?: PublicBookingTokenMeta;
    },
  ): Promise<string> {
    const id = idGenerator.next();
    await tx.publicBookingToken.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        purpose: input.purpose,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        targetId: input.targetId ?? null,
        meta: (input.meta ?? {}),
      },
    });
    return id;
  }

  async execute(
    ctx: RequestContext,
    input: {
      purpose: string;
      tokenHash: string;
      expiresAt: Date;
      targetId?: string | null;
      meta?: PublicBookingTokenMeta;
    },
  ): Promise<string> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, (tx) => this.executeInTx(tx, ctx, input));
  }
}

export class GetTokenByHashRepository {
  async execute(ctx: RequestContext, tokenHash: string): Promise<PublicBookingTokenRow | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.publicBookingToken.findFirst({
        where: { tenantId: ctx.tenantId, tokenHash },
      });
      if (!row) return null;
      return {
        id: row.id,
        tenantId: row.tenantId,
        purpose: row.purpose,
        targetId: row.targetId,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
        meta: mapMeta(row.meta),
      };
    });
  }
}

export class UpdateTokenRepository {
  async executeInTx(
    tx: DbTransaction,
    tokenId: string,
    patch: { usedAt?: Date | null; meta?: PublicBookingTokenMeta; targetId?: string | null },
  ): Promise<void> {
    await tx.publicBookingToken.update({
      where: { id: tokenId },
      data: {
        ...(patch.usedAt !== undefined ? { usedAt: patch.usedAt } : {}),
        ...(patch.targetId !== undefined ? { targetId: patch.targetId } : {}),
        ...(patch.meta !== undefined ? { meta: patch.meta } : {}),
      },
    });
  }

  async execute(
    ctx: RequestContext,
    tokenId: string,
    patch: { usedAt?: Date | null; meta?: PublicBookingTokenMeta; targetId?: string | null },
  ): Promise<void> {
    const tenantPrisma = getTenantPrisma();
    await tenantPrisma.runInTenantContext(ctx, (tx) => this.executeInTx(tx, tokenId, patch));
  }
}

export class GetOfferTokenByTargetRepository {
  async execute(ctx: RequestContext, waitlistEntryId: string): Promise<PublicBookingTokenRow | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.publicBookingToken.findFirst({
        where: {
          tenantId: ctx.tenantId,
          purpose: 'WAITLIST_OFFER',
          targetId: waitlistEntryId,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!row) return null;
      return {
        id: row.id,
        tenantId: row.tenantId,
        purpose: row.purpose,
        targetId: row.targetId,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
        meta: mapMeta(row.meta),
      };
    });
  }
}

export class FindOfferTokenByIdempotencyRepository {
  async execute(ctx: RequestContext, idempotencyKey: string): Promise<PublicBookingTokenRow | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.publicBookingToken.findFirst({
        where: {
          tenantId: ctx.tenantId,
          purpose: 'WAITLIST_OFFER',
          meta: { path: ['idempotencyKey'], equals: idempotencyKey },
        },
      });
      if (!row) return null;
      return {
        id: row.id,
        tenantId: row.tenantId,
        purpose: row.purpose,
        targetId: row.targetId,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
        meta: mapMeta(row.meta),
      };
    });
  }
}

export class ListOfferTokensBySlotRepository {
  async execute(ctx: RequestContext, cancelledAppointmentId: string): Promise<PublicBookingTokenRow[]> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const rows = await tx.publicBookingToken.findMany({
        where: {
          tenantId: ctx.tenantId,
          purpose: 'WAITLIST_OFFER',
          meta: { path: ['cancelledAppointmentId'], equals: cancelledAppointmentId },
        },
        orderBy: { createdAt: 'asc' },
      });
      return rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        purpose: row.purpose,
        targetId: row.targetId,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
        meta: mapMeta(row.meta),
      }));
    });
  }
}

export class GetActiveTokenByTargetRepository {
  async execute(
    ctx: RequestContext,
    purpose: string,
    targetId: string,
  ): Promise<PublicBookingTokenRow | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.publicBookingToken.findFirst({
        where: {
          tenantId: ctx.tenantId,
          purpose,
          targetId,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!row) return null;
      return {
        id: row.id,
        tenantId: row.tenantId,
        purpose: row.purpose,
        targetId: row.targetId,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
        meta: mapMeta(row.meta),
      };
    });
  }
}

export class ResolveTokenByHashGlobalRepository {
  async execute(tokenHash: string): Promise<PublicBookingTokenRow | null> {
    const rows = await getPrismaClient().$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        purpose: string;
        target_id: string | null;
        expires_at: Date;
        used_at: Date | null;
        meta: unknown;
      }>
    >`
      SELECT * FROM platform.resolve_public_booking_token(${tokenHash})
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      tenantId: row.tenant_id,
      purpose: row.purpose,
      targetId: row.target_id,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      meta: mapMeta(row.meta),
    };
  }
}
