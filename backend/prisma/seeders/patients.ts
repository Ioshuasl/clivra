import type { PrismaClient } from '@prisma/client';
import { idGenerator } from '../../src/shared/helpers/id_generator.js';

export async function seedPatients(prisma: PrismaClient, tenantId: string, unitId: string) {
  const specs = [
    {
      phone: '11988880001',
      name: 'Maria Silva',
      socialName: null as string | null,
      cpf: '39053344705',
      birthDate: '1988-03-12',
      sex: 'F',
      email: 'maria.silva@teste.local',
      howFoundUs: 'Indicação',
      notes: 'Paciente regular — profilaxia semestral.',
      guardian: null as null | {
        name: string;
        relationship: string;
        phone: string;
        cpf: string;
      },
    },
    {
      phone: '11988880002',
      name: 'João Pedro Almeida',
      socialName: null,
      cpf: '52998224725',
      birthDate: '2014-07-22',
      sex: 'M',
      email: null,
      howFoundUs: 'Instagram',
      notes: 'Menor — responsável acompanha.',
      guardian: {
        name: 'Ana Almeida',
        relationship: 'Mãe',
        phone: '11988880020',
        cpf: '15350946056',
      },
    },
    {
      phone: '11988880003',
      name: 'Carla Mendes',
      socialName: 'Carla M.',
      cpf: '84716938008',
      birthDate: '1995-11-03',
      sex: 'F',
      email: 'carla.mendes@teste.local',
      howFoundUs: 'Google',
      notes: 'Sensibilidade em molares superiores.',
      guardian: null,
    },
    {
      phone: '11988880004',
      name: 'Pedro Oliveira',
      socialName: null,
      cpf: '07312960735',
      birthDate: '1976-01-30',
      sex: 'M',
      email: 'pedro.oliveira@teste.local',
      howFoundUs: 'WhatsApp',
      notes: null,
      guardian: null,
    },
  ];

  const patients = [];
  for (const spec of specs) {
    let patient = await prisma.patient.findFirst({
      where: { tenantId, phonePrimary: spec.phone },
    });
    if (!patient) {
      const counter = await prisma.patientCodeCounter.upsert({
        where: { tenantId },
        create: { tenantId, lastCode: 1n },
        update: { lastCode: { increment: 1 } },
      });
      patient = await prisma.patient.create({
        data: {
          id: idGenerator.next(),
          tenantId,
          unitId,
          code: counter.lastCode,
          name: spec.name,
          socialName: spec.socialName,
          cpf: spec.cpf,
          birthDate: spec.birthDate ? new Date(`${spec.birthDate}T00:00:00.000Z`) : null,
          sex: spec.sex,
          phonePrimary: spec.phone,
          email: spec.email,
          howFoundUs: spec.howFoundUs,
          notes: spec.notes,
          address: {
            street: 'Rua das Acácias',
            number: '120',
            city: 'São Paulo',
            state: 'SP',
            postalCode: '01415000',
          },
          active: true,
        },
      });
    }
    patients.push(patient);

    if (spec.guardian) {
      const guardianExists = await prisma.legalGuardian.findFirst({
        where: { tenantId, patientId: patient.id, cpf: spec.guardian.cpf },
      });
      if (!guardianExists) {
        await prisma.legalGuardian.create({
          data: {
            id: idGenerator.next(),
            tenantId,
            patientId: patient.id,
            name: spec.guardian.name,
            cpf: spec.guardian.cpf,
            relationship: spec.guardian.relationship,
            phone: spec.guardian.phone,
          },
        });
      }
    }

    for (const type of ['DATA_PROCESSING', 'TERMS'] as const) {
      const consentExists = await prisma.consent.findFirst({
        where: { tenantId, patientId: patient.id, type, revokedAt: null },
      });
      if (!consentExists) {
        await prisma.consent.create({
          data: {
            id: idGenerator.next(),
            tenantId,
            patientId: patient.id,
            type,
            granted: true,
            documentVersion: 'v1',
            channel: 'IN_PERSON',
          },
        });
      }
    }
  }

  return patients;
}
