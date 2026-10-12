import type { Request, Response } from 'express';
import { ReceiveWebhookService } from '../services/asaas_event/asaas_webhook_receive.service.js';

export class AsaasWebhookController {
  constructor(private readonly receive = new ReceiveWebhookService()) {}

  /** O Asaas só considera entregue o HTTP 200 exato. */
  handle = async (req: Request, res: Response): Promise<void> => {
    await this.receive.execute(req.header('asaas-access-token'), req.body);
    res.status(200).json({ received: true });
  };
}
