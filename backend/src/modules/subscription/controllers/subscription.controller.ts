import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  cancelBodySchema,
  checkoutBodySchema,
  opsStatusBodySchema,
  paymentIdParamsSchema,
  paymentListQuerySchema,
} from '../schemas/subscription.schema.js';
import { ListService as PaymentListService } from '../services/payment/payment_list.service.js';
import { PayService as PaymentPayService } from '../services/payment/payment_pay.service.js';
import { ListService as PlanListService } from '../services/plan/plan_list.service.js';
import { CancelService } from '../services/subscription/subscription_cancel.service.js';
import { CheckoutService } from '../services/subscription/subscription_checkout.service.js';
import { GetService as SubscriptionGetService } from '../services/subscription/subscription_get.service.js';
import { UpdateStatusService } from '../services/subscription/subscription_update_status.service.js';
import { GetService as UsageGetService } from '../services/usage/usage_get.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

function validation(error: unknown): AppError {
  return new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, error);
}

export class SubscriptionController {
  constructor(
    private readonly subscriptionGet = new SubscriptionGetService(),
    private readonly planList = new PlanListService(),
    private readonly usageGet = new UsageGetService(),
    private readonly updateStatus = new UpdateStatusService(),
    private readonly checkoutService = new CheckoutService(),
    private readonly cancelService = new CancelService(),
    private readonly paymentList = new PaymentListService(),
    private readonly paymentPay = new PaymentPayService(),
  ) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const data = await this.subscriptionGet.execute(requireCtx(req));
    res.status(200).json({ data });
  };

  listPlans = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.planList.execute();
    res.status(200).json({ data });
  };

  getUsage = async (req: Request, res: Response): Promise<void> => {
    const data = await this.usageGet.execute(requireCtx(req));
    res.status(200).json({ data });
  };

  /** ADR-0017: Pix/boleto na página do app; cartão redireciona ao Asaas Checkout. */
  checkout = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = checkoutBodySchema.safeParse(req.body);
    if (!parsed.success) throw validation(parsed.error);
    const data = await this.checkoutService.execute(ctx, parsed.data, req.header('idempotency-key'));
    res.status(201).json({ data });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = cancelBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) throw validation(parsed.error);
    const data = await this.cancelService.execute(ctx, parsed.data);
    res.status(200).json({ data });
  };

  listPayments = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = paymentListQuerySchema.safeParse(req.query);
    if (!parsed.success) throw validation(parsed.error);
    const page = await this.paymentList.execute(ctx, parsed.data);
    res.status(200).json({ data: page.items, meta: { nextCursor: page.nextCursor } });
  };

  payPayment = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = paymentIdParamsSchema.safeParse(req.params);
    if (!params.success) throw validation(params.error);
    const data = await this.paymentPay.execute(ctx, params.data.id);
    res.status(200).json({ data });
  };

  /** Ops: muda status ACTIVE/SUSPENDED etc. (contingência manual — ADR-0010/0017). */
  opsUpdateStatus = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = opsStatusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const data = await this.updateStatus.execute(ctx, parsed.data);
    res.status(200).json({ data });
  };
}
