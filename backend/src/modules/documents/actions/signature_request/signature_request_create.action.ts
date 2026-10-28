import { randomBytes } from 'node:crypto';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { env } from '../../../../shared/config/env.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { AuditAction, writeAuditLogSafe } from '../../../../shared/database/write_audit.js';
import { idGenerator } from '../../../../shared/helpers/id_generator.js';
import { hashToken } from '../../../../shared/helpers/token_hash.js';
import { getEmailProvider } from '../../../../shared/integrations/email/index.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { getWhatsappAccountStatus } from '../../../messaging/messaging_public.js';
import type { PatientSignatureMethod } from '../../enum/signature/patient_signature_method.enum.js';
import { CreateRepository } from '../../repositories/signature_request/signature_request_create.repository.js';
import type {
  SignatureDeliveryChannel,
  SignatureRequestCreateResult,
} from '../../types/signature_request/signature_request.types.js';

const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type RequestTarget = {
  documentId: string;
  documentTitle: string;
  patient: { id: string; name: string; email: string | null };
};

/** Cria o link de assinatura e entrega ao paciente (WhatsApp, e-mail ou link para copiar). */
export class CreateAction {
  constructor(
    private readonly uow = new UnitOfWork(),
    private readonly createRequest = new CreateRepository(),
    private readonly email = getEmailProvider(),
  ) {}

  async execute(
    ctx: RequestContext,
    target: RequestTarget,
    method: PatientSignatureMethod,
    channel: SignatureDeliveryChannel,
    extra?: { ip?: string },
  ): Promise<SignatureRequestCreateResult> {
    const catalog = await getPublicClinicCatalog(ctx);
    const clinicName = catalog?.name ?? 'Clínica';
    const firstName = target.patient.name.split(/\s+/)[0] ?? target.patient.name;

    const rawToken = randomBytes(24).toString('base64url');
    const publicUrl = `${env.APP_PUBLIC_URL.replace(/\/$/, '')}/assinar/${rawToken}`;
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);

    const waba = await getWhatsappAccountStatus(ctx);
    const wabaConnected = waba?.status === 'CONNECTED' && !waba.killSwitch;
    let sentVia: SignatureDeliveryChannel = channel;
    if (channel === 'WHATSAPP' && !wabaConnected) sentVia = target.patient.email ? 'EMAIL' : 'COPY';
    if (sentVia === 'EMAIL' && !target.patient.email) sentVia = 'COPY';

    await this.uow.run(ctx, async ({ tx, publish }) => {
      await this.createRequest.executeInTx(tx, ctx, {
        id: idGenerator.next(),
        documentId: target.documentId,
        tokenHash: hashToken(rawToken),
        method,
        expiresAt,
      });
      if (sentVia === 'WHATSAPP') {
        publish([
          {
            name: 'documents.signature_link_sent',
            payload: {
              patientId: target.patient.id,
              templateKey: 'document_signature_request',
              publicUrl,
              requestId: ctx.requestId,
            },
          },
        ]);
      }
    });

    if (sentVia === 'EMAIL' && target.patient.email) {
      await this.email.send({
        to: target.patient.email,
        subject: `Documento para assinar — ${clinicName}`,
        text: `Olá ${firstName}, a ${clinicName} enviou o documento "${target.documentTitle}" para você assinar: ${publicUrl}\nO link vale por 7 dias.`,
      });
    }

    await writeAuditLogSafe({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: AuditAction.DOCUMENT_SIGNATURE_REQUESTED,
      resourceType: 'document',
      resourceId: target.documentId,
      patientId: target.patient.id,
      ipAddress: extra?.ip,
      metadata: { method, sentVia },
    });

    return {
      method,
      sentVia,
      expiresAt: expiresAt.toISOString(),
      ...(sentVia === 'COPY' ? { publicUrl } : {}),
    };
  }
}
