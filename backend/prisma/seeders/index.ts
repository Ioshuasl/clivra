import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../src/shared/helpers/password.js';
import { seedBilling } from './billing.js';
import { seedClinic, seedClinicChairs, seedClinicTeam } from './clinic.js';
import { seedClinicalRecords } from './clinical_records.js';
import {
  ASSISTANT_EMAIL,
  DENTIST_EMAIL,
  FINANCE_EMAIL,
  INVITE_EMAIL,
  INVITE_RAW_TOKEN,
  OWNER_EMAIL,
  OWNER_PASSWORD,
  RECEPTION_EMAIL,
  SEED_PASSWORD,
} from './constants.js';
import { seedIdentity, seedIdentityTeam } from './identity.js';
import { seedMessaging } from './messaging.js';
import { seedPatients } from './patients.js';
import { seedScheduling } from './scheduling.js';
import { seedSubscription } from './subscription.js';
import { seedTreatments } from './treatments.js';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_MIGRATION_URL ou DATABASE_URL é obrigatório para seed.');
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const passwordHash = await hashPassword(SEED_PASSWORD);

  try {
    const { tenant, owner, ownerMembership } = await seedIdentity(prisma, passwordHash);
    await seedSubscription(prisma, tenant);
    const unit = await seedClinic(prisma, tenant.id);
    await prisma.membership.update({
      where: { id: ownerMembership.id },
      data: { defaultUnitId: unit.id },
    });

    const { dentistMembership } = await seedIdentityTeam(prisma, {
      tenantId: tenant.id,
      unitId: unit.id,
      ownerMembershipId: ownerMembership.id,
      passwordHash,
    });
    const { ownerProfessional, dentistProfessional } = await seedClinicTeam(prisma, {
      tenantId: tenant.id,
      ownerMembershipId: ownerMembership.id,
      dentistMembershipId: dentistMembership.id,
    });
    const chairs = await seedClinicChairs(prisma, tenant.id, unit.id);
    const patients = await seedPatients(prisma, tenant.id, unit.id);
    await seedClinicalRecords(
      prisma,
      tenant.id,
      patients.map((p) => p.id),
    );
    await seedBilling(prisma, tenant.id);
    await seedTreatments(prisma, {
      tenantId: tenant.id,
      unitId: unit.id,
      patientId: patients[0]!.id,
      professionalId: dentistProfessional.id,
    });
    await seedScheduling(prisma, {
      tenantId: tenant.id,
      unitId: unit.id,
      ownerProfessionalId: ownerProfessional.id,
      dentistProfessionalId: dentistProfessional.id,
      chair1Id: chairs[0]!.id,
      chair2Id: chairs[1]!.id,
      patientIds: patients.map((patient) => patient.id),
      ownerUserId: owner.id,
    });
    await seedMessaging(prisma, tenant.id, {
      id: patients[0]!.id,
      name: patients[0]!.name,
      phone: patients[0]!.phonePrimary,
    });

    console.info('seed: ok');
    console.info(`  login owner     ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
    console.info(`  login dentista  ${DENTIST_EMAIL} / ${SEED_PASSWORD}`);
    console.info(`  login recepção  ${RECEPTION_EMAIL} / ${SEED_PASSWORD}`);
    console.info(`  login ASB       ${ASSISTANT_EMAIL} / ${SEED_PASSWORD}`);
    console.info(`  login financeiro ${FINANCE_EMAIL} / ${SEED_PASSWORD}`);
    console.info(`  convite pendente ${INVITE_EMAIL} (token dev: ${INVITE_RAW_TOKEN})`);
    console.info('  S5: categoria Procedimentos + orçamento DRAFT da Maria (3 itens)');
    console.info('  S7: inbox seed — conversa PENDING da Maria (Oi, quero remarcar)');
    console.info('  S7: subscription TRIAL no plano Essencial (se ainda não existia)');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
