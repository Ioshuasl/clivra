import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { getBillingAdapter } from '../../adapters/billing_adapter.factory.js';
import { BillingMethod } from '../../enum/billing/billing_method.enum.js';
import { BillingProvider } from '../../enum/billing/billing_provider.enum.js';
import { PAID_PAYMENT_STATUSES } from '../../enum/billing/payment_status.enum.js';
import { PaymentNotFoundError } from '../../models/errors/subscription.errors.js';
import { GetPaymentRepository } from '../../repositories/payment/payment_get.repository.js';
import type { PaymentPayView } from '../../types/billing/checkout.types.js';

/** Dados para pagar uma cobrança em aberto na própria página (QR Pix atualizado ou boleto). */
export class PayService {
  constructor(private readonly getPayment = new GetPaymentRepository()) {}

  async execute(ctx: RequestContext, paymentId: string): Promise<PaymentPayView> {
    const payment = await this.getPayment.execute(ctx, paymentId);
    if (!payment || payment.deleted) throw new PaymentNotFoundError();

    const view: PaymentPayView = {
      paymentId: payment.id,
      billingType: payment.billingType,
      invoiceUrl: payment.invoiceUrl,
    };
    const billing = getBillingAdapter();
    if (billing.provider !== BillingProvider.ASAAS || PAID_PAYMENT_STATUSES.has(payment.status)) {
      return view;
    }

    if (payment.billingType === BillingMethod.PIX) {
      const qr = await billing.getPixQrCode(payment.externalPaymentId);
      view.pix = { qrCodeBase64: qr.encodedImage, payload: qr.payload, expiresAt: qr.expirationDate };
    } else if (payment.billingType === BillingMethod.BOLETO) {
      const boleto = await billing.getBoleto(payment.externalPaymentId);
      view.boleto = { digitableLine: boleto.identificationField, url: boleto.bankSlipUrl };
    }
    return view;
  }
}
