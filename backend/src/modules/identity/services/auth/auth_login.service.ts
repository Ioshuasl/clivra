import { verifyPasswordConstantTime } from '../../../../shared/helpers/password.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { InvalidCredentialsError } from '../../models/errors/invalid_credentials.error.js';
import {
  clearLoginFailures,
  isLoginBlocked,
  registerLoginFailure,
} from '../../helpers/login_throttle.helper.js';
import {
  GetByEmailRepository,
  UpdateLastLoginRepository,
} from '../../repositories/user/user.repository.js';
import { ListActiveByUserRepository } from '../../repositories/membership/membership.repository.js';
import type { LoginSchema } from '../../schemas/auth.schema.js';
import type { AuthSessionResult } from '../../types/auth.types.js';
import { IssueTokensService, pickPreferredMembership } from './auth_session.service.js';
import { AppError } from '../../../../shared/middlewares/error_handler.middleware.js';

export class LoginService {
  constructor(
    private readonly getByEmail = new GetByEmailRepository(),
    private readonly updateLastLogin = new UpdateLastLoginRepository(),
    private readonly listMemberships = new ListActiveByUserRepository(),
    private readonly issueTokens = new IssueTokensService(),
  ) {}

  async execute(
    loginSchema: LoginSchema,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthSessionResult> {
    const email = loginSchema.email.toLowerCase();
    // O bloqueio vale para e-mail + IP (e para e-mails que nem existem): quem erra só tranca a si
    // mesmo, e um terceiro não consegue deixar o dono da clínica sem acesso.
    const ip = meta?.ipAddress ?? 'unknown';
    if (await isLoginBlocked(email, ip)) {
      throw new AppError(
        'RATE_LIMITED',
        'Muitas tentativas. Aguarde alguns minutos ou use "Esqueci minha senha".',
        429,
      );
    }

    const user = await this.getByEmail.execute(email);
    const valid = await verifyPasswordConstantTime(
      loginSchema.password,
      user?.passwordHash,
    );

    if (!user || !valid) {
      await registerLoginFailure(email, ip);
      if (user) await this.auditFailed(user.id, meta);
      throw new InvalidCredentialsError();
    }

    await clearLoginFailures(email, ip);

    const memberships = await this.listMemberships.execute(user.id);
    const membership = pickPreferredMembership(memberships);

    if (!membership) {
      throw new AppError('UNAUTHENTICATED', 'Credenciais inválidas.', 401);
    }

    await this.updateLastLogin.execute(user.id);

    const session = await this.issueTokens.execute({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      membership,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    await writeAuditLogSafe({
      tenantId: membership.tenantId,
      actorId: user.id,
      action: AuditAction.LOGIN,
      resourceType: 'session',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return session;
  }

  private async auditFailed(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const memberships = await this.listMemberships.execute(userId);
    const tenantId = memberships[0]?.tenantId;
    if (!tenantId) return;
    await writeAuditLogSafe({
      tenantId,
      actorId: userId,
      action: AuditAction.LOGIN_FAILED,
      resourceType: 'session',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }
}
