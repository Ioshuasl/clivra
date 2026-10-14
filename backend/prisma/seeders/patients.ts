import type { PrismaClient } from '@prisma/client';
import { idGenerator } from '../../src/shared/helpers/id_generator.js';

type PatientSpec = {
  phone: string;
  name: string;
  socialName: string | null;
  cpf: string;
  birthDate: string;
  sex: string;
  email: string | null;
  howFoundUs: string;
  notes: string | null;
  guardian: null | {
    name: string;
    relationship: string;
    phone: string;
    cpf: string;
  };
};

const SPECS: PatientSpec[] = [
  {
    phone: '11988880001',
    name: 'Maria Silva',
    socialName: null,
    cpf: '39053344705',
    birthDate: '1988-03-12',
    sex: 'F',
    email: 'maria.silva@teste.local',
    howFoundUs: 'Indicação',
    notes: 'Paciente regular — profilaxia semestral.',
    guardian: null,
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
  {
    phone: '11988880005',
    name: 'Fernanda Costa',
    socialName: null,
    cpf: '11144477735',
    birthDate: '1990-05-18',
    sex: 'F',
    email: 'fernanda.costa@teste.local',
    howFoundUs: 'Indicação',
    notes: '[seed] Candidata a fila de espera.',
    guardian: null,
  },
  {
    phone: '11988880006',
    name: 'Rafael Souza',
    socialName: null,
    cpf: '88641577947',
    birthDate: '1982-09-08',
    sex: 'M',
    email: 'rafael.souza@teste.local',
    howFoundUs: 'Google',
    notes: '[seed] Preferência manhã.',
    guardian: null,
  },
  {
    phone: '11988880007',
    name: 'Beatriz Lima',
    socialName: null,
    cpf: '71428793860',
    birthDate: '2001-12-01',
    sex: 'F',
    email: 'beatriz.lima@teste.local',
    howFoundUs: 'Instagram',
    notes: '[seed] Urgência leve.',
    guardian: null,
  },
  {
    phone: '11988880008',
    name: 'Lucas Ferreira',
    socialName: null,
    cpf: '45317828791',
    birthDate: '1998-04-25',
    sex: 'M',
    email: 'lucas.ferreira@teste.local',
    howFoundUs: 'WhatsApp',
    notes: '[seed] Retorno ortodontia.',
    guardian: null,
  },
];

export async function seedPatients(prisma: PrismaClient, tenantId: string, unitId: string) {
  const patients = [];
  for (const spec of SPECS) {
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
