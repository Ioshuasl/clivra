import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { UnitOfWork } from '../../../../shared/database/unit_of_work.js';
import { getEmailProvider } from '../../../../shared/integrations/email/index.js';
import { getPublicClinicCatalog } from '../../../clinic/clinic_public.js';
import { getWhatsappAccountStatus } from '../../../messaging/messaging_public.js';
import {
  CODE_TTL_MS,
  destinationHint,
  generateSignatureCode,
  hashSignatureCode,
} from '../../helpers/signature_code.helper.js';
import { SignatureNoChannelError } from '../../models/errors/documents.errors.js';
import { SetCodeRepository } from '../../repositories/signature_request/signature_request_set_code.repository.js';
import type { PublicSendCodeResult } from '../../types/signature_request/signature_request.types.js';

type CodeTarget = {
  requestId: string;
  patient: { id: string; email: string | null; phonePrimary: string };
};

/** Gera o código de 6 dígitos (só o hash fica no banco) e envia por WhatsApp ou, se não der, por e-mail. */
export class SendCodeAction {
  constructor(
    private readonly uow = new UnitOfWork(),
    private readonly setCode = new SetCodeRepository(),
    private readonly email = getEmailProvider(),
  ) {}

  async execute(ctx: RequestContext, target: CodeTarget): Promise<PublicSendCodeResult> {
    const waba = await getWhatsappAccountStatus(ctx);
    const wabaConnected = waba?.status === 'CONNECTED' && !waba.killSwitch;
    const sentVia: 'WHATSAPP' | 'EMAIL' | null = wabaConnected
      ? 'WHATSAPP'
      : target.patient.email
        ? 'EMAIL'
        : null;
    if (!sentVia) throw new SignatureNoChannelError();

    const code = generateSignatureCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.uow.run(ctx, async ({ tx, publish }) => {
      await this.setCode.executeInTx(tx, ctx, target.requestId, {
        hash: hashSignatureCode(target.requestId, code),
        expiresAt,
        sentVia,
      });
      if (sentVia === 'WHATSAPP') {
        publish([
          {
            name: 'documents.signature_code_requested',
            payload: {
              patientId: target.patient.id,
              templateKey: 'document_signature_code',
              code,
              requestId: ctx.requestId,
            },
          },
        ]);
      }
    });

    if (sentVia === 'EMAIL' && target.patient.email) {
      const catalog = await getPublicClinicCatalog(ctx);
      await this.email.send({
        to: target.patient.email,
        subject: `Seu código de assinatura — ${catalog?.name ?? 'Clínica'}`,
        text: `Seu código para assinar o documento é ${code}. Ele vale por 10 minutos. Não compartilhe.`,
      });
    }

    return {
      sentVia,
      destinationHint: destinationHint(sentVia === 'EMAIL' ? (target.patient.email ?? '') : target.patient.phonePrimary),
      expiresAt: expiresAt.toISOString(),
    };
  }
}
