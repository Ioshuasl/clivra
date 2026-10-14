import type { Prisma, PrismaClient } from '@prisma/client';
import { idGenerator } from '../../src/shared/helpers/id_generator.js';
import { spDateTime } from './helpers.js';

type SeedSlot = {
  key: string;
  patientId: string;
  professionalId: string;
  chairId: string | null;
  procedureId: string | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
  origin?: string;
  notes: string;
  cancelReason?: string | null;
};

type SeedWaitlist = {
  key: string;
  patientId: string;
  professionalId: string | null;
  procedureId: string | null;
  preferredPeriods: Array<{ weekday: number; from: string; to: string }>;
  priority: number;
  status: string;
  offeredAt?: Date | null;
  expiresAt?: Date | null;
};

/** Cancela conflitos ativos no intervalo (EXCLUDE gist) para o seed ser reentrante entre dias. */
async function releaseSeedSlot(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    professionalId: string;
    chairId: string | null;
    startsAt: Date;
    endsAt: Date;
    keepId?: string;
  },
) {
  const base = {
    tenantId: input.tenantId,
    status: { notIn: ['CANCELLED', 'NO_SHOW'] as const },
    startsAt: { lt: input.endsAt },
    endsAt: { gt: input.startsAt },
    ...(input.keepId ? { id: { not: input.keepId } } : {}),
  };
  const data = {
    status: 'CANCELLED' as const,
    cancelledAt: new Date(),
    cancelReason: '[seed] slot reservado para seed',
  };
  await prisma.appointment.updateMany({
    where: { ...base, professionalId: input.professionalId },
    data,
  });
  if (input.chairId) {
    await prisma.appointment.updateMany({
      where: { ...base, chairId: input.chairId },
      data,
    });
  }
}

function statusTimestamps(slot: SeedSlot) {
  const confirmed =
    slot.status === 'CONFIRMED' ||
    slot.status === 'IN_SERVICE' ||
    slot.status === 'COMPLETED';
  const arrived = slot.status === 'IN_SERVICE' || slot.status === 'COMPLETED';
  const cancelled = slot.status === 'CANCELLED';
  return {
    confirmedAt: confirmed ? slot.startsAt : null,
    arrivedAt: arrived ? slot.startsAt : null,
    cancelledAt: cancelled ? slot.startsAt : null,
    cancelReason: cancelled
      ? (slot.cancelReason ?? 'Paciente desmarcou')
      : slot.status === 'NO_SHOW'
        ? null
        : null,
  };
}

async function upsertAppointment(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    unitId: string;
    ownerUserId: string;
    slot: SeedSlot;
  },
) {
  const { slot } = input;
  const existing = await prisma.appointment.findFirst({
    where: { tenantId: input.tenantId, idempotencyKey: slot.key },
  });

  await releaseSeedSlot(prisma, {
    tenantId: input.tenantId,
    professionalId: slot.professionalId,
    chairId: slot.chairId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    keepId: existing?.id,
  });

  const stamps = statusTimestamps(slot);
  const payload = {
    patientId: slot.patientId,
    professionalId: slot.professionalId,
    chairId: slot.chairId,
    procedureId: slot.procedureId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    status: slot.status,
    origin: slot.origin ?? 'INTERNAL',
    notes: slot.notes,
    ...stamps,
  };

  if (existing) {
    await prisma.appointment.update({
      where: { id: existing.id },
      data: payload,
    });
    return existing.id;
  }

  const appointment = await prisma.appointment.create({
    data: {
      id: idGenerator.next(),
      tenantId: input.tenantId,
      unitId: input.unitId,
      idempotencyKey: slot.key,
      createdBy: input.ownerUserId,
      ...payload,
    },
  });

  await prisma.appointmentHistory.create({
    data: {
      id: idGenerator.next(),
      tenantId: input.tenantId,
      appointmentId: appointment.id,
      action: slot.status === 'CANCELLED' ? 'CANCELLED' : 'CREATED',
      actorId: input.ownerUserId,
      actorType: 'USER',
      toValue: { status: slot.status },
    },
  });

  return appointment.id;
}

async function upsertWaitlist(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    unitId: string;
    entry: SeedWaitlist;
  },
) {
  const { entry } = input;

  // Clínica Teste: 1 entrada seed por paciente+status (reentrante).
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      tenantId: input.tenantId,
      patientId: entry.patientId,
      status: entry.status,
    },
    orderBy: { createdAt: 'asc' },
  });

  const data = {
    professionalId: entry.professionalId,
    procedureId: entry.procedureId,
    preferredPeriods: entry.preferredPeriods as Prisma.InputJsonValue,
    priority: entry.priority,
    status: entry.status,
    offeredAt: entry.offeredAt ?? null,
    expiresAt: entry.expiresAt ?? null,
  };

  if (existing) {
    await prisma.waitlistEntry.update({
      where: { id: existing.id },
      data,
    });
    return existing.id;
  }

  const created = await prisma.waitlistEntry.create({
    data: {
      id: idGenerator.next(),
      tenantId: input.tenantId,
      unitId: input.unitId,
      patientId: entry.patientId,
      ...data,
    },
  });
  return created.id;
}

export async function seedScheduling(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    unitId: string;
    ownerProfessionalId: string;
    dentistProfessionalId: string;
    chair1Id: string;
    chair2Id: string;
    patientIds: string[];
    ownerUserId: string;
  },
) {
  const p = (i: number) => input.patientIds[i % input.patientIds.length]!;

  const consult = await prisma.procedure.findUnique({
    where: { tenantId_code: { tenantId: input.tenantId, code: 'CONS-01' } },
  });
  const prophylaxis = await prisma.procedure.findUnique({
    where: { tenantId_code: { tenantId: input.tenantId, code: 'PROF-01' } },
  });
  const restoration = await prisma.procedure.findUnique({
    where: { tenantId_code: { tenantId: input.tenantId, code: 'RES-01' } },
  });
  const urgency = await prisma.procedure.findUnique({
    where: { tenantId_code: { tenantId: input.tenantId, code: 'URG-01' } },
  });
  const radio = await prisma.procedure.findUnique({
    where: { tenantId_code: { tenantId: input.tenantId, code: 'RAD-01' } },
  });

  const slots: SeedSlot[] = [
    // —— existentes (reentrantes) ——
    {
      key: 'seed:today-0900',
      patientId: p(0),
      professionalId: input.ownerProfessionalId,
      chairId: input.chair1Id,
      procedureId: consult?.id ?? null,
      startsAt: spDateTime(0, 9),
      endsAt: spDateTime(0, 9, 30),
      status: 'SCHEDULED',
      notes: '[seed] Avaliação inicial',
    },
    {
      key: 'seed:today-1000',
      patientId: p(1),
      professionalId: input.dentistProfessionalId,
      chairId: input.chair2Id,
      procedureId: prophylaxis?.id ?? null,
      startsAt: spDateTime(0, 10),
      endsAt: spDateTime(0, 10, 40),
      status: 'CONFIRMED',
      notes: '[seed] Profilaxia',
    },
    {
      key: 'seed:today-1400',
      patientId: p(2),
      professionalId: input.ownerProfessionalId,
      chairId: input.chair1Id,
      procedureId: restoration?.id ?? null,
      startsAt: spDateTime(0, 14),
      endsAt: spDateTime(0, 15),
      status: 'IN_SERVICE',
      notes: '[seed] Restauração em andamento',
    },
    {
      key: 'seed:tomorrow-0900',
      patientId: p(3),
      professionalId: input.dentistProfessionalId,
      chairId: input.chair2Id,
      procedureId: consult?.id ?? null,
      startsAt: spDateTime(1, 9),
      endsAt: spDateTime(1, 9, 30),
      status: 'SCHEDULED',
      notes: '[seed] Retorno',
    },
    {
      key: 'seed:yesterday-1600',
      patientId: p(0),
      professionalId: input.ownerProfessionalId,
      chairId: input.chair1Id,
      procedureId: prophylaxis?.id ?? null,
      startsAt: spDateTime(-1, 16),
      endsAt: spDateTime(-1, 16, 40),
      status: 'COMPLETED',
      notes: '[seed] Concluído',
    },
    {
      key: 'seed:yesterday-1100',
      patientId: p(2),
      professionalId: input.dentistProfessionalId,
      chairId: input.chair2Id,
      procedureId: consult?.id ?? null,
      startsAt: spDateTime(-1, 11),
      endsAt: spDateTime(-1, 11, 30),
      status: 'CANCELLED',
      notes: '[seed] Paciente desmarcou',
      cancelReason: 'Paciente desmarcou',
    },

    // —— +10 novos (status / dias / profissionais espalhados) ——
    {
      key: 'seed:today-0800-requested',
      patientId: p(4),
      professionalId: input.ownerProfessionalId,
      chairId: null,
      procedureId: consult?.id ?? null,
      startsAt: spDateTime(0, 8),
      endsAt: spDateTime(0, 8, 30),
      status: 'REQUESTED',
      origin: 'PUBLIC_BOOKING',
      notes: '[seed] Solicitação online (aceitar/recusar)',
    },
    {
      key: 'seed:today-1100-scheduled',
      patientId: p(5),
      professionalId: input.dentistProfessionalId,
      chairId: input.chair2Id,
      procedureId: radio?.id ?? null,
      startsAt: spDateTime(0, 11),
      endsAt: spDateTime(0, 11, 20),
      status: 'SCHEDULED',
      notes: '[seed] Radiografia',
    },
    {
      key: 'seed:today-1530-confirmed',
      patientId: p(6),
      professionalId: input.dentistProfessionalId,
      chairId: input.chair2Id,
      procedureId: urgency?.id ?? null,
      startsAt: spDateTime(0, 15, 30),
      endsAt: spDateTime(0, 16),
      status: 'CONFIRMED',
      notes: '[seed] Urgência confirmada',
    },
    {
      key: 'seed:today-1630-scheduled',
      patientId: p(7),
      professionalId: input.ownerProfessionalId,
      chairId: input.chair1Id,
      procedureId: consult?.id ?? null,
      startsAt: spDateTime(0, 16, 30),
      endsAt: spDateTime(0, 17),
      status: 'SCHEDULED',
      notes: '[seed] Consulta fim de tarde',
    },
    {
      key: 'seed:yesterday-0900-noshow',
      patientId: p(3),
      professionalId: input.ownerProfessionalId,
      chairId: input.chair1Id,
      procedureId: consult?.id ?? null,
      startsAt: spDateTime(-1, 9),
      endsAt: spDateTime(-1, 9, 30),
      status: 'NO_SHOW',
      notes: '[seed] Falta — testar toast reagendar',
    },
    {
      key: 'seed:yesterday-1400-completed',
      patientId: p(5),
      professionalId: input.dentistProfessionalId,
      chairId: input.chair2Id,
      procedureId: restoration?.id ?? null,
      startsAt: spDateTime(-1, 14),
      endsAt: spDateTime(-1, 15),
      status: 'COMPLETED',
      notes: '[seed] Restauração concluída',
    },
    {
      key: 'seed:tomorrow-1030-confirmed',
      patientId: p(4),
      professionalId: input.ownerProfessionalId,
      chairId: input.chair1Id,
      procedureId: prophylaxis?.id ?? null,
      startsAt: spDateTime(1, 10, 30),
      endsAt: spDateTime(1, 11, 10),
      status: 'CONFIRMED',
      notes: '[seed] Profilaxia amanhã',
    },
    {
      key: 'seed:tomorrow-1400-scheduled',
      patientId: p(6),
      professionalId: input.dentistProfessionalId,
      chairId: input.chair2Id,
      procedureId: consult?.id ?? null,
      startsAt: spDateTime(1, 14),
      endsAt: spDateTime(1, 14, 30),
      status: 'SCHEDULED',
      notes: '[seed] Avaliação amanhã tarde',
    },
    {
      key: 'seed:day2-0900-scheduled',
      patientId: p(7),
      professionalId: input.ownerProfessionalId,
      chairId: input.chair1Id,
      procedureId: consult?.id ?? null,
      startsAt: spDateTime(2, 9),
      endsAt: spDateTime(2, 9, 30),
      status: 'SCHEDULED',
      notes: '[seed] Slot +2 dias',
    },
    {
      key: 'seed:day-2-1000-cancelled',
      patientId: p(1),
      professionalId: input.dentistProfessionalId,
      chairId: input.chair2Id,
      procedureId: prophylaxis?.id ?? null,
      startsAt: spDateTime(-2, 10),
      endsAt: spDateTime(-2, 10, 40),
      status: 'CANCELLED',
      notes: '[seed] Cancelado há 2 dias',
      cancelReason: 'Remarcou para outra semana',
    },
  ];

  for (const slot of slots) {
    await upsertAppointment(prisma, {
      tenantId: input.tenantId,
      unitId: input.unitId,
      ownerUserId: input.ownerUserId,
      slot,
    });
  }

  const lunchExists = await prisma.scheduleBlock.findFirst({
    where: {
      tenantId: input.tenantId,
      professionalId: input.ownerProfessionalId,
      reason: '[seed] Almoço',
    },
  });
  if (!lunchExists) {
    await prisma.scheduleBlock.create({
      data: {
        id: idGenerator.next(),
        tenantId: input.tenantId,
        unitId: input.unitId,
        professionalId: input.ownerProfessionalId,
        startsAt: spDateTime(0, 12),
        endsAt: spDateTime(0, 13),
        reason: '[seed] Almoço',
      },
    });
  }

  await seedWaitlist(prisma, {
    tenantId: input.tenantId,
    unitId: input.unitId,
    ownerProfessionalId: input.ownerProfessionalId,
    dentistProfessionalId: input.dentistProfessionalId,
    patientIds: input.patientIds,
    consultId: consult?.id ?? null,
    prophylaxisId: prophylaxis?.id ?? null,
    restorationId: restoration?.id ?? null,
    urgencyId: urgency?.id ?? null,
  });
}

async function seedWaitlist(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    unitId: string;
    ownerProfessionalId: string;
    dentistProfessionalId: string;
    patientIds: string[];
    consultId: string | null;
    prophylaxisId: string | null;
    restorationId: string | null;
    urgencyId: string | null;
  },
) {
  const p = (i: number) => input.patientIds[i % input.patientIds.length]!;
  const now = new Date();
  const in25min = new Date(now.getTime() + 25 * 60_000);
  const expiredAt = new Date(now.getTime() - 60 * 60_000);
  const offeredPast = new Date(now.getTime() - 90 * 60_000);

  const entries: SeedWaitlist[] = [
    {
      key: 'waiting-high-owner',
      patientId: p(4),
      professionalId: input.ownerProfessionalId,
      procedureId: input.consultId,
      preferredPeriods: [
        { weekday: 1, from: '08:00', to: '12:00' },
        { weekday: 3, from: '08:00', to: '12:00' },
      ],
      priority: 1,
      status: 'WAITING',
    },
    {
      key: 'waiting-any-pro',
      patientId: p(5),
      professionalId: null,
      procedureId: input.prophylaxisId,
      preferredPeriods: [
        { weekday: 2, from: '14:00', to: '18:00' },
        { weekday: 4, from: '14:00', to: '18:00' },
      ],
      priority: 0,
      status: 'WAITING',
    },
    {
      key: 'waiting-dentist-resto',
      patientId: p(6),
      professionalId: input.dentistProfessionalId,
      procedureId: input.restorationId,
      preferredPeriods: [{ weekday: 5, from: '09:00', to: '11:00' }],
      priority: 1,
      status: 'WAITING',
    },
    {
      key: 'offered-active',
      patientId: p(7),
      professionalId: input.dentistProfessionalId,
      procedureId: input.urgencyId,
      preferredPeriods: [
        { weekday: 1, from: '15:00', to: '18:00' },
        { weekday: 2, from: '15:00', to: '18:00' },
      ],
      priority: 1,
      status: 'OFFERED',
      offeredAt: now,
      expiresAt: in25min,
    },
    {
      key: 'offered-expired',
      patientId: p(0),
      professionalId: input.ownerProfessionalId,
      procedureId: input.consultId,
      preferredPeriods: [{ weekday: 3, from: '10:00', to: '12:00' }],
      priority: 0,
      status: 'EXPIRED',
      offeredAt: offeredPast,
      expiresAt: expiredAt,
    },
    {
      key: 'scheduled-from-waitlist',
      patientId: p(2),
      professionalId: input.dentistProfessionalId,
      procedureId: input.prophylaxisId,
      preferredPeriods: [{ weekday: 4, from: '08:00', to: '10:00' }],
      priority: 0,
      status: 'SCHEDULED',
      offeredAt: offeredPast,
      expiresAt: expiredAt,
    },
    {
      key: 'cancelled-waitlist',
      patientId: p(3),
      professionalId: null,
      procedureId: input.consultId,
      preferredPeriods: [{ weekday: 5, from: '14:00', to: '17:00' }],
      priority: 0,
      status: 'CANCELLED',
    },
  ];

  for (const entry of entries) {
    await upsertWaitlist(prisma, {
      tenantId: input.tenantId,
      unitId: input.unitId,
      entry,
    });
  }
}
