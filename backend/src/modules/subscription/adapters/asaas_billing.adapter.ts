import { AsaasClient, AsaasRequestError } from '../../../shared/integrations/asaas/asaas.client.js';
import {
  asaasCheckoutSchema,
  asaasCustomerSchema,
  asaasIdentificationFieldSchema,
  asaasListSchema,
  asaasPaymentSchema,
  asaasPixQrCodeSchema,
  asaasSubscriptionSchema,
  type AsaasPayment,
  type AsaasSubscription,
} from '../../../shared/integrations/asaas/asaas.types.js';
import { asaasConfig } from '../../../shared/config/env.js';
import { logger } from '../../../shared/config/logger.js';
import { BillingProvider } from '../enum/billing/billing_provider.enum.js';
import { BillingGatewayError, CpfCnpjRequiredError } from '../models/errors/subscription.errors.js';
import type {
  BillingCustomerInput,
  BillingPayment,
  BillingSubscription,
  BoletoInfo,
  CardCheckoutResult,
  CreateBillingSubscriptionInput,
  CreateCardCheckoutInput,
  PixQrCode,
} from '../types/billing/billing.types.js';
import type { SubscriptionBillingPort } from '../types/ports/subscription_billing.port.js';

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

function toReais(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function toCents(reais: number): number {
  return Math.round(reais * 100);
}

export function mapAsaasPayment(row: AsaasPayment): BillingPayment {
  const paidDay = row.confirmedDate ?? row.paymentDate ?? row.clientPaymentDate ?? null;
  return {
    id: row.id,
    subscriptionId: row.subscription ?? null,
    status: row.status,
    valueCents: toCents(row.value),
    dueDate: row.dueDate,
    paidAt: paidDay ? new Date(`${paidDay.slice(0, 10)}T12:00:00.000Z`) : null,
    billingType: row.billingType ?? null,
    invoiceUrl: row.invoiceUrl ?? null,
    bankSlipUrl: row.bankSlipUrl ?? null,
    deleted: row.deleted === true,
  };
}

function mapAsaasSubscription(row: AsaasSubscription): BillingSubscription {
  return {
    id: row.id,
    customerId: row.customer ?? null,
    billingType: row.billingType ?? null,
    status: row.status ?? null,
    nextDueDate: row.nextDueDate ?? null,
    deleted: row.deleted === true,
  };
}

/** Traduz falha do cliente HTTP em erro de API (502) sem vazar detalhes do gateway. */
async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AsaasRequestError) {
      // Só metadados do erro (nunca corpo da requisição): é o que permite diagnosticar uma recusa do gateway.
      logger.warn(
        { asaas: { kind: err.kind, status: err.status, code: err.code, description: err.message } },
        'asaas_gateway_error',
      );
      throw new BillingGatewayError(err.inconclusive);
    }
    throw err;
  }
}

export class AsaasBillingAdapter implements SubscriptionBillingPort {
  readonly provider = BillingProvider.ASAAS;

  constructor(private readonly client = new AsaasClient()) {}

  async ensureCustomer(
    input: BillingCustomerInput,
  ): Promise<{ customerId: string; created: boolean }> {
    return guarded(async () => {
      // Timeout não é falha: antes de criar, procura o cliente já criado para este tenant.
      const found = await this.client.request<unknown>('GET', '/customers', {
        query: { externalReference: input.tenantId, limit: 1 },
      });
      const existing = asaasListSchema(asaasCustomerSchema).parse(found).data[0];
      if (existing) return { customerId: existing.id, created: false };

      if (!input.cpfCnpj) throw new CpfCnpjRequiredError();
      const created = await this.client.request<unknown>('POST', '/customers', {
        body: {
          name: input.name,
          email: input.email,
          cpfCnpj: input.cpfCnpj,
          mobilePhone: input.mobilePhone ?? undefined,
          externalReference: input.tenantId,
        },
      });
      return { customerId: asaasCustomerSchema.parse(created).id, created: true };
    });
  }

  async createSubscription(
    input: CreateBillingSubscriptionInput,
  ): Promise<{ subscriptionId: string }> {
    return guarded(async () => {
      const res = await this.client.request<unknown>('POST', '/subscriptions', {
        body: {
          customer: input.customerId,
          billingType: input.billingMethod,
          value: toReais(input.valueCents),
          nextDueDate: input.nextDueDate,
          cycle: 'MONTHLY',
          description: input.description,
          externalReference: input.externalReference,
        },
      });
      return { subscriptionId: asaasSubscriptionSchema.parse(res).id };
    });
  }

  async createCardCheckout(input: CreateCardCheckoutInput): Promise<CardCheckoutResult> {
    return guarded(async () => {
      const res = await this.client.request<unknown>('POST', '/checkouts', {
        body: {
          billingTypes: ['CREDIT_CARD'],
          chargeTypes: ['RECURRENT'],
          minutesToExpire: input.minutesToExpire,
          externalReference: input.externalReference,
          callback: input.callback,
          items: [
            {
              name: input.itemName,
              description: input.description,
              quantity: 1,
              value: toReais(input.valueCents),
            },
          ],
          subscription: { cycle: 'MONTHLY', nextDueDate: `${input.nextDueDate} 12:00:00` },
        },
      });
      const parsed = asaasCheckoutSchema.parse(res);
      const url =
        parsed.link ??
        `${asaasConfig().checkoutBaseUrl}/checkoutSession/show?id=${encodeURIComponent(parsed.id)}`;
      return { checkoutId: parsed.id, url };
    });
  }

  async getSubscription(subscriptionId: string): Promise<BillingSubscription> {
    return guarded(async () => {
      const res = await this.client.request<unknown>('GET', `/subscriptions/${subscriptionId}`);
      return mapAsaasSubscription(asaasSubscriptionSchema.parse(res));
    });
  }

  async findSubscriptionByReference(
    customerId: string,
    externalReference: string,
  ): Promise<BillingSubscription | null> {
    return guarded(async () => {
      const res = await this.client.request<unknown>('GET', '/subscriptions', {
        query: { customer: customerId, externalReference, limit: 1 },
      });
      const found = asaasListSchema(asaasSubscriptionSchema).parse(res).data[0];
      return found && found.deleted !== true ? mapAsaasSubscription(found) : null;
    });
  }

  async listSubscriptionPayments(subscriptionId: string): Promise<BillingPayment[]> {
    return guarded(async () => {
      const out: BillingPayment[] = [];
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const res = await this.client.request<unknown>(
          'GET',
          `/subscriptions/${subscriptionId}/payments`,
          { query: { limit: PAGE_SIZE, offset: page * PAGE_SIZE } },
        );
        const parsed = asaasListSchema(asaasPaymentSchema).parse(res);
        out.push(...parsed.data.map(mapAsaasPayment));
        if (!parsed.hasMore) break;
      }
      return out;
    });
  }

  async getPixQrCode(paymentId: string): Promise<PixQrCode> {
    return guarded(async () => {
      const res = await this.client.request<unknown>('GET', `/payments/${paymentId}/pixQrCode`);
      const row = asaasPixQrCodeSchema.parse(res);
      return {
        encodedImage: row.encodedImage,
        payload: row.payload,
        expirationDate: row.expirationDate ?? null,
      };
    });
  }

  async getBoleto(paymentId: string): Promise<BoletoInfo> {
    return guarded(async () => {
      const payment = await this.client.request<unknown>('GET', `/payments/${paymentId}`);
      const bankSlipUrl = asaasPaymentSchema.parse(payment).bankSlipUrl ?? null;
      let identificationField: string | null = null;
      try {
        const field = await this.client.request<unknown>(
          'GET',
          `/payments/${paymentId}/identificationField`,
        );
        identificationField = asaasIdentificationFieldSchema.parse(field).identificationField ?? null;
      } catch {
        // linha digitável é conveniência; o link do boleto basta para pagar
      }
      return { identificationField, bankSlipUrl };
    });
  }

  async updateSubscriptionValue(
    subscriptionId: string,
    valueCents: number,
    updatePendingPayments = false,
  ): Promise<void> {
    await guarded(async () => {
      await this.client.request('PUT', `/subscriptions/${subscriptionId}`, {
        body: { value: toReais(valueCents), updatePendingPayments },
      });
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await guarded(async () => {
      try {
        await this.client.request('DELETE', `/subscriptions/${subscriptionId}`);
      } catch (err) {
        // 404 = já removida no Asaas: o cancelamento local pode prosseguir.
        if (!(err instanceof AsaasRequestError && err.status === 404)) throw err;
      }
    });
  }
}
