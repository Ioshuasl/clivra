import { Prisma } from '@prisma/client';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import { getTenantPrisma } from '../../../../shared/database/tenant_prisma.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import { listFutureAppointmentIds } from '../../../scheduling/scheduling_public.js';
import {
  mapConsent,
  mapGuardian,
  mapPatientDetail,
  mapPatientSummary,
} from '../../helpers/patient_mapper.helper.js';
import { toDateOnly } from '../../helpers/patient.helper.js';
import type {
  CheckDuplicateResult,
  ConsentSummary,
  LegalGuardianSummary,
  PatientDetail,
  PatientDuplicateMatch,
  PatientListResult,
  PatientSummary,
  PatientWarning,
} from '../../types/patients.types.js';

const patientSelect = {
  id: true,
  unitId: true,
  code: true,
  name: true,
  socialName: true,
  cpf: true,
  birthDate: true,
  sex: true,
  phonePrimary: true,
  phoneSecondary: true,
  email: true,
  address: true,
  howFoundUs: true,
  notes: true,
  origin: true,
  active: true,
  hasOverdue: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PatientSelect;

export type CreatePatientInput = {
  unitId: string;
  name: string;
  socialName?: string | null;
  cpf?: string | null;
  birthDate?: string | null;
  sex?: string | null;
  phonePrimary: string;
  phoneSecondary?: string | null;
  email?: string | null;
  address?: Prisma.InputJsonValue | null;
  howFoundUs?: string | null;
  notes?: string | null;
  origin?: string;
  guardians?: Array<{
    name: string;
    cpf?: string | null;
    relationship?: string | null;
    phone?: string | null;
    email?: string | null;
  }>;
};

export class NextCodeRepository {
  async execute(ctx: RequestContext, tx: Prisma.TransactionClient): Promise<number> {
    const rows = await tx.$queryRaw<Array<{ last_code: bigint }>>`
      INSERT INTO patient_code_counter (tenant_id, last_code)
      VALUES (${ctx.tenantId}::uuid, 1)
      ON CONFLICT (tenant_id) DO UPDATE
      SET last_code = patient_code_counter.last_code + 1
      RETURNING last_code
    `;
    return Number(rows[0]?.last_code ?? 1);
  }
}

export class FindByCpfRepository {
  async execute(ctx: RequestContext, cpf: string): Promise<PatientDuplicateMatch | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.patient.findFirst({
        where: { tenantId: ctx.tenantId, cpf, deletedAt: null },
        select: { id: true, code: true, name: true, phonePrimary: true, cpf: true },
      });
      if (!row) return null;
      return {
        id: row.id,
        code: Number(row.code),
        name: row.name,
        phonePrimary: row.phonePrimary,
        cpf: row.cpf,
      };
    });
  }
}

export class FindByPhoneRepository {
  async execute(ctx: RequestContext, phone: string): Promise<PatientDuplicateMatch[]> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const rows = await tx.patient.findMany({
        where: {
          tenantId: ctx.tenantId,
          deletedAt: null,
          OR: [{ phonePrimary: phone }, { phoneSecondary: phone }],
        },
        select: { id: true, code: true, name: true, phonePrimary: true, cpf: true },
        take: 10,
        orderBy: { code: 'asc' },
      });
      return rows.map((row) => ({
        id: row.id,
        code: Number(row.code),
        name: row.name,
        phonePrimary: row.phonePrimary,
        cpf: row.cpf,
      }));
    });
  }
}

export class CheckDuplicateRepository {
  async execute(
    ctx: RequestContext,
    input: { cpf?: string | null; phone?: string | null },
  ): Promise<CheckDuplicateResult> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      let cpfMatch: PatientDuplicateMatch | null = null;
      if (input.cpf) {
        const row = await tx.patient.findFirst({
          where: { tenantId: ctx.tenantId, cpf: input.cpf, deletedAt: null },
          select: { id: true, code: true, name: true, phonePrimary: true, cpf: true },
        });
        if (row) {
          cpfMatch = {
            id: row.id,
            code: Number(row.code),
            name: row.name,
            phonePrimary: row.phonePrimary,
            cpf: row.cpf,
          };
        }
      }

      let phoneMatches: PatientDuplicateMatch[] = [];
      if (input.phone) {
        const rows = await tx.patient.findMany({
          where: {
            tenantId: ctx.tenantId,
            deletedAt: null,
            OR: [{ phonePrimary: input.phone }, { phoneSecondary: input.phone }],
          },
          select: { id: true, code: true, name: true, phonePrimary: true, cpf: true },
          take: 10,
        });
        phoneMatches = rows.map((row) => ({
          id: row.id,
          code: Number(row.code),
          name: row.name,
          phonePrimary: row.phonePrimary,
          cpf: row.cpf,
        }));
      }

      return { cpfMatch, phoneMatches };
    });
  }
}

export class CreatePatientRepository {
  constructor(private readonly nextCode = new NextCodeRepository()) {}

  async executeInTx(
    tx: DbTransaction,
    ctx: RequestContext,
    input: CreatePatientInput,
    warnings: PatientWarning[],
  ): Promise<PatientDetail> {
    const code = await this.nextCode.execute(ctx, tx);
    const patientId = idGenerator.next();
    const row = await tx.patient.create({
      data: {
        id: patientId,
        tenantId: ctx.tenantId,
        unitId: input.unitId,
        code,
        name: input.name,
        socialName: input.socialName ?? null,
        cpf: input.cpf ?? null,
        birthDate: input.birthDate ? toDateOnly(input.birthDate) : null,
        sex: input.sex ?? null,
        phonePrimary: input.phonePrimary,
        phoneSecondary: input.phoneSecondary ?? null,
        email: input.email ?? null,
        address: input.address === null ? Prisma.JsonNull : input.address,
        howFoundUs: input.howFoundUs ?? null,
        notes: input.notes ?? null,
        origin: input.origin ?? 'INTERNAL',
      },
      select: patientSelect,
    });

    const guardians = [];
    for (const g of input.guardians ?? []) {
      const created = await tx.legalGuardian.create({
        data: {
          id: idGenerator.next(),
          tenantId: ctx.tenantId,
          patientId,
          name: g.name,
          cpf: g.cpf ?? null,
          relationship: g.relationship ?? null,
          phone: g.phone ?? null,
          email: g.email ?? null,
        },
      });
      guardians.push(created);
    }

    return mapPatientDetail(row, guardians, [], warnings);
  }

  async execute(
    ctx: RequestContext,
    input: CreatePatientInput,
    warnings: PatientWarning[],
  ): Promise<PatientDetail> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, (tx) =>
      this.executeInTx(tx, ctx, input, warnings),
    );
  }
}

export class GetPatientRepository {
  async execute(ctx: RequestContext, patientId: string): Promise<PatientDetail | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.patient.findFirst({
        where: { id: patientId, tenantId: ctx.tenantId, deletedAt: null },
        select: patientSelect,
      });
      if (!row) return null;

      const guardians = await tx.legalGuardian.findMany({
        where: { tenantId: ctx.tenantId, patientId },
        orderBy: { name: 'asc' },
      });
      const consents = await tx.consent.findMany({
        where: { tenantId: ctx.tenantId, patientId },
        orderBy: { grantedAt: 'desc' },
      });

      return mapPatientDetail(row, guardians, consents, []);
    });
  }
}

export class ListPatientsRepository {
  async execute(
    ctx: RequestContext,
    input: {
      search?: string;
      cursor?: string;
      limit: number;
      active?: boolean;
    },
  ): Promise<PatientListResult> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const search = input.search?.trim();
      if (search) {
        const digits = search.replace(/\D/g, '');
        const last4 = digits.slice(-4);
        const activeFilter = input.active;
        const rows = await tx.$queryRaw<
          Array<{
            id: string;
            unit_id: string;
            code: bigint;
            name: string;
            social_name: string | null;
            cpf: string | null;
            birth_date: Date | null;
            sex: string | null;
            phone_primary: string;
            phone_secondary: string | null;
            email: string | null;
            address: unknown;
            how_found_us: string | null;
            notes: string | null;
            active: boolean;
            created_at: Date;
            updated_at: Date;
          }>
        >`
          SELECT id, unit_id, code, name, social_name, cpf, birth_date, sex,
                 phone_primary, phone_secondary, email, address, how_found_us, notes,
                 active, created_at, updated_at
          FROM patient
          WHERE tenant_id = ${ctx.tenantId}::uuid
            AND deleted_at IS NULL
            AND (${activeFilter === undefined ? null : activeFilter}::boolean IS NULL
                 OR active = ${activeFilter === undefined ? null : activeFilter}::boolean)
            AND (
              CAST(code AS TEXT) = ${search}
              OR (${digits.length === 11} AND cpf = ${digits})
              OR (${digits.length >= 4} AND (
                    phone_primary LIKE ${'%' + digits}
                    OR right(regexp_replace(coalesce(phone_primary, ''), '\\D', '', 'g'), 4) = ${last4}
                  ))
              OR unaccent(lower(name)) LIKE '%' || unaccent(lower(${search})) || '%'
            )
          ORDER BY active DESC, name ASC
          LIMIT ${input.limit + 1}
        `;

        const page = rows.slice(0, input.limit);
        const items = page.map((row) =>
          mapPatientSummary({
            id: row.id,
            unitId: row.unit_id,
            code: row.code,
            name: row.name,
            socialName: row.social_name,
            cpf: row.cpf,
            birthDate: row.birth_date,
            sex: row.sex,
            phonePrimary: row.phone_primary,
            phoneSecondary: row.phone_secondary,
            email: row.email,
            address: row.address,
            howFoundUs: row.how_found_us,
            notes: row.notes,
            active: row.active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }),
        );
        const nextCursor =
          rows.length > input.limit ? (page[page.length - 1]?.id ?? null) : null;
        return { items, nextCursor };
      }

      const rows = await tx.patient.findMany({
        where: {
          tenantId: ctx.tenantId,
          deletedAt: null,
          ...(input.active === undefined ? {} : { active: input.active }),
          ...(input.cursor ? { id: { lt: input.cursor } } : {}),
        },
        orderBy: [{ active: 'desc' }, { name: 'asc' }, { id: 'desc' }],
        take: input.limit + 1,
        select: patientSelect,
      });
      const page = rows.slice(0, input.limit);
      return {
        items: page.map(mapPatientSummary),
        nextCursor: rows.length > input.limit ? (page[page.length - 1]?.id ?? null) : null,
      };
    });
  }
}

export class UpdatePatientRepository {
  async execute(
    ctx: RequestContext,
    patientId: string,
    patch: {
      name?: string;
      socialName?: string | null;
      cpf?: string | null;
      birthDate?: string | null;
      sex?: string | null;
      phonePrimary?: string;
      phoneSecondary?: string | null;
      email?: string | null;
      address?: Prisma.InputJsonValue | null;
      howFoundUs?: string | null;
      notes?: string | null;
      active?: boolean;
    },
  ): Promise<PatientSummary | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const existing = await tx.patient.findFirst({
        where: { id: patientId, tenantId: ctx.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!existing) return null;

      const row = await tx.patient.update({
        where: { id: patientId },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.socialName !== undefined ? { socialName: patch.socialName } : {}),
          ...(patch.cpf !== undefined ? { cpf: patch.cpf } : {}),
          ...(patch.birthDate !== undefined
            ? { birthDate: patch.birthDate ? toDateOnly(patch.birthDate) : null }
            : {}),
          ...(patch.sex !== undefined ? { sex: patch.sex } : {}),
          ...(patch.phonePrimary !== undefined ? { phonePrimary: patch.phonePrimary } : {}),
          ...(patch.phoneSecondary !== undefined
            ? { phoneSecondary: patch.phoneSecondary }
            : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.address !== undefined
            ? { address: patch.address === null ? Prisma.JsonNull : patch.address }
            : {}),
          ...(patch.howFoundUs !== undefined ? { howFoundUs: patch.howFoundUs } : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
          ...(patch.active !== undefined ? { active: patch.active } : {}),
        },
        select: patientSelect,
      });
      return mapPatientSummary(row);
    });
  }
}

export class DeactivatePatientRepository {
  async execute(ctx: RequestContext, patientId: string): Promise<PatientSummary | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const existing = await tx.patient.findFirst({
        where: { id: patientId, tenantId: ctx.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!existing) return null;

      const row = await tx.patient.update({
        where: { id: patientId },
        data: { active: false, deletedAt: new Date() },
        select: patientSelect,
      });
      return mapPatientSummary(row);
    });
  }
}

export class CreateGuardianRepository {
  async execute(
    ctx: RequestContext,
    patientId: string,
    input: {
      name: string;
      cpf?: string | null;
      relationship?: string | null;
      phone?: string | null;
      email?: string | null;
    },
  ): Promise<LegalGuardianSummary> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const row = await tx.legalGuardian.create({
        data: {
          id: idGenerator.next(),
          tenantId: ctx.tenantId,
          patientId,
          name: input.name,
          cpf: input.cpf ?? null,
          relationship: input.relationship ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
        },
      });
      return mapGuardian(row);
    });
  }
}

export class ListConsentsRepository {
  async execute(ctx: RequestContext, patientId: string): Promise<ConsentSummary[]> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const rows = await tx.consent.findMany({
        where: { tenantId: ctx.tenantId, patientId },
        orderBy: { grantedAt: 'desc' },
      });
      return rows.map(mapConsent);
    });
  }
}

export class CreateConsentRepository {
  async execute(
    ctx: RequestContext,
    patientId: string,
    input: {
      type: string;
      granted: boolean;
      documentVersion: string;
      channel: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
  ): Promise<ConsentSummary> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      await tx.consent.updateMany({
        where: {
          tenantId: ctx.tenantId,
          patientId,
          type: input.type,
          granted: true,
          revokedAt: null,
        },
        data: { revokedAt: new Date(), granted: false },
      });

      const row = await tx.consent.create({
        data: {
          id: idGenerator.next(),
          tenantId: ctx.tenantId,
          patientId,
          type: input.type,
          granted: input.granted,
          documentVersion: input.documentVersion,
          channel: input.channel,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          revokedAt: input.granted ? null : new Date(),
        },
      });
      return mapConsent(row);
    });
  }
}

/** Lista agendamentos futuros via scheduling_public (RF-E3-12). */
export class ListFutureAppointmentsRepository {
  async execute(ctx: RequestContext, patientId: string): Promise<string[]> {
    return listFutureAppointmentIds(ctx, patientId);
  }
}

export class GetDefaultUnitRepository {
  async execute(ctx: RequestContext): Promise<string | null> {
    const tenantPrisma = getTenantPrisma();
    return tenantPrisma.runInTenantContext(ctx, async (tx) => {
      const unit = await tx.unit.findFirst({
        where: { tenantId: ctx.tenantId, isDefault: true },
        select: { id: true },
      });
      return unit?.id ?? null;
    });
  }
}
