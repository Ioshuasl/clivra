import { randomBytes } from 'node:crypto';
import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { env } from '../../../../shared/config/env.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { hashToken } from '../../../../shared/helpers/token_hash.js';
import { getEmailProvider } from '../../../../shared/integrations/email/index.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { getWhatsappAccountStatus } from '../../../messaging/messaging_public.js';
import { createPublicToken } from '../../../scheduling/scheduling_public.js';
import { AnamnesisFormNotFoundError } from '../../models/errors/clinical_records.errors.js';
import { ResolveRepository } from '../../repositories/anamnesis_form/anamnesis_form_resolve.repository.js';
import type { PatientSnapshot } from '../../repositories/patient_snapshot/patient_snapshot_get.repository.js';
import type { AnamnesisSendLinkSchema } from '../../schemas/anamnesis.schema.js';
import type { AnamnesisSendLinkResult } from '../../types/anamnesis/anamnesis_send_link.types.js';
import type { SendLinkChannel } from '../../enum/anamnesis/send_link_channel.enum.js';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class SendLinkAction {
  constructor(
    private readonly uow = new UnitOfWork(),
    private readonly resolveForm = new ResolveRepository(),
    private readonly email = getEmailProvider(),
  ) {}

  async execute(
    ctx: RequestContext,
    patient: PatientSnapshot,
    sendLinkSchema: AnamnesisSendLinkSchema,
  ): Promise<AnamnesisSendLinkResult> {
    const form = await this.resolveForm.execute(ctx, sendLinkSchema.professionalId);
    if (!form) throw new AnamnesisFormNotFoundError();

    const catalog = await getPublicClinicCatalog(ctx);
    const clinicName = catalog?.name ?? 'Clínica';
    const firstName = patient.name.split(/\s+/)[0] ?? patient.name;

    const rawToken = randomBytes(24).toString('base64url');
    const publicUrl = `${env.APP_PUBLIC_URL.replace(/\/$/, '')}/anamnese/${rawToken}`;
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    const waba = await getWhatsappAccountStatus(ctx);
    const wabaConnected = waba?.status === 'CONNECTED' && !waba.killSwitch;

    let sentVia: SendLinkChannel = sendLinkSchema.channel;
    if (sendLinkSchema.channel === 'WHATSAPP' && !wabaConnected) {
      sentVia = patient.email ? 'EMAIL' : 'COPY';
    }
    if (sendLinkSchema.channel === 'EMAIL' && !patient.email) {
      sentVia = 'COPY';
    }

    await this.uow.run(ctx, async ({ tx, publish }) => {
      await createPublicToken(
        ctx,
        {
          purpose: 'ANAMNESIS',
          tokenHash: hashToken(rawToken),
          expiresAt,
          targetId: patient.id,
          meta: { formId: form.id, formVersion: form.version, patientId: patient.id },
        },
        tx,
      );

      if (sentVia === 'WHATSAPP') {
        publish([
          {
            name: 'clinical_records.anamnesis_request_sent',
            payload: {
              patientId: patient.id,
              templateKey: 'anamnesis_request',
              publicUrl,
              requestId: ctx.requestId,
            },
          },
        ]);
      }
    });

    if (sentVia === 'EMAIL' && patient.email) {
      await this.email.send({
        to: patient.email,
        subject: `Anamnese — ${clinicName}`,
        text: `Olá ${firstName}, preencha sua anamnese da ${clinicName}: ${publicUrl}\nO link expira em 7 dias.`,
      });
    }

    return {
      expiresAt: expiresAt.toISOString(),
      sentVia,
      ...(sentVia === 'COPY' ? { publicUrl } : {}),
    };
  }
}
