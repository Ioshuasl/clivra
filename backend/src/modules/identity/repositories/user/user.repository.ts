import type { DbTransaction } from '../../../../shared/database/db_transaction.js';
import { getPrismaClient } from '../../../../shared/database/tenant_prisma.js';

export type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  lastLoginAt: Date | null;
  failedAttempts: number;
  lockedUntil: Date | null;
  platformRole: string | null;
};

const userSelect = {
  id: true,
  email: true,
  passwordHash: true,
  name: true,
  lastLoginAt: true,
  failedAttempts: true,
  lockedUntil: true,
  platformRole: true,
} as const;

export class GetByEmailRepository {
  async execute(email: string): Promise<UserRow | null> {
    const prisma = getPrismaClient();
    return prisma.user.findUnique({
      where: { email },
      select: userSelect,
    });
  }
}

export class GetByIdRepository {
  async execute(userId: string): Promise<UserRow | null> {
    const prisma = getPrismaClient();
    return prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
  }
}

export class CreateRepository {
  async execute(
    input: {
      id: string;
      email: string;
      passwordHash: string;
      name: string;
    },
    tx?: DbTransaction,
  ): Promise<void> {
    const client = tx ?? getPrismaClient();
    await client.user.create({
      data: {
        id: input.id,
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
      },
    });
  }
}

export class UpdateLastLoginRepository {
  async execute(userId: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), failedAttempts: 0, lockedUntil: null },
    });
  }
}

export class UpdatePasswordRepository {
  async execute(userId: string, passwordHash: string, tx?: DbTransaction): Promise<void> {
    const client = tx ?? getPrismaClient();
    await client.user.update({
      where: { id: userId },
      data: { passwordHash, failedAttempts: 0, lockedUntil: null },
    });
  }
}
