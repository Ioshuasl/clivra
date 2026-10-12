import type { PrismaClient } from '@prisma/client';
import { idGenerator } from '../../src/shared/helpers/id_generator.js';
import { spDateTime } from './helpers.js';

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
  const consult = await prisma.procedure.findUnique({
    where: { tenantId_code: { tenantId: input.tenantId, code: 'CONS-01' } },
  });
  const prophylaxis = await prisma.procedure.findUnique({
    where: { tenantId_code: { tenantId: input.tenantId, code: 'PROF-01' } },
  });
  const restoration = await prisma.procedure.findUnique({
    where: { tenantId_code: { tenantId: input.tenantId, code: 'RES-01' } },
  });

  const slots = [
    {
      key: 'seed:today-0900',
      patientId: input.patientIds[0]!,
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
      patientId: input.patientIds[1]!,
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
      patientId: input.patientIds[2]!,
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
      patientId: input.patientIds[3]!,
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
      patientId: input.patientIds[0]!,
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
      patientId: input.patientIds[2]!,
      professionalId: input.dentistProfessionalId,
      chairId: input.chair2Id,
      procedureId: consult?.id ?? null,
      startsAt: spDateTime(-1, 11),
      endsAt: spDateTime(-1, 11, 30),
      status: 'CANCELLED',
      notes: '[seed] Paciente desmarcou',
    },
  ];

  for (const slot of slots) {
    const existing = await prisma.appointment.findFirst({
      where: { tenantId: input.tenantId, idempotencyKey: slot.key },
    });
    if (existing) {
      await prisma.appointment.update({
        where: { id: existing.id },
        data: {
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          status: slot.status,
          confirmedAt: slot.status === 'CONFIRMED' || slot.status === 'IN_SERVICE' ? slot.startsAt : null,
          arrivedAt: slot.status === 'IN_SERVICE' ? slot.startsAt : null,
          cancelledAt: slot.status === 'CANCELLED' ? slot.startsAt : null,
        },
      });
      continue;
    }

    const appointment = await prisma.appointment.create({
      data: {
        id: idGenerator.next(),
        tenantId: input.tenantId,
        unitId: input.unitId,
        patientId: slot.patientId,
        professionalId: slot.professionalId,
        chairId: slot.chairId,
        procedureId: slot.procedureId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: slot.status,
        origin: 'INTERNAL',
        notes: slot.notes,
        idempotencyKey: slot.key,
        createdBy: input.ownerUserId,
        confirmedAt: slot.status === 'CONFIRMED' || slot.status === 'IN_SERVICE' ? slot.startsAt : null,
        arrivedAt: slot.status === 'IN_SERVICE' ? slot.startsAt : null,
        cancelledAt: slot.status === 'CANCELLED' ? slot.startsAt : null,
        cancelReason: slot.status === 'CANCELLED' ? 'Paciente desmarcou' : null,
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
}
