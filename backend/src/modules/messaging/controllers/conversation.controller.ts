import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  conversationIdParamSchema,
  conversationListQuerySchema,
  conversationMessagesQuerySchema,
  conversationPatchSchema,
  mediaPresignSchema,
  messageSendSchema,
} from '../schemas/messaging.schema.js';
import { ListService as ConversationListService } from '../services/conversation/conversation_list.service.js';
import { GetService as ConversationGetService } from '../services/conversation/conversation_get.service.js';
import { UpdateService as ConversationUpdateService } from '../services/conversation/conversation_update.service.js';
import { MarkReadService } from '../services/conversation/conversation_mark_read.service.js';
import { PresignService as MediaPresignService } from '../services/media/media_presign.service.js';
import { ListService as MessageListService } from '../services/message/message_list.service.js';
import { SendService as MessageSendService } from '../services/message/message_send.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class ConversationController {
  constructor(
    private readonly listConversations = new ConversationListService(),
    private readonly getConversation = new ConversationGetService(),
    private readonly updateConversation = new ConversationUpdateService(),
    private readonly markRead = new MarkReadService(),
    private readonly messageList = new MessageListService(),
    private readonly messageSend = new MessageSendService(),
    private readonly mediaPresign = new MediaPresignService(),
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const parsed = conversationListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Filtros inválidos.', 400, parsed.error);
    }
    const result = await this.listConversations.execute(requireCtx(req), parsed.data);
    res.status(200).json({ data: result.items, meta: { nextCursor: result.nextCursor } });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'ID inválido.', 400, params.error);
    }
    const data = await this.getConversation.execute(requireCtx(req), params.data.id);
    res.status(200).json({ data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    const body = conversationPatchSchema.safeParse(req.body);
    if (!params.success || !body.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, {
        params: params.success ? undefined : params.error,
        body: body.success ? undefined : body.error,
      });
    }
    const data = await this.updateConversation.execute(
      requireCtx(req),
      params.data.id,
      body.data,
    );
    res.status(200).json({ data });
  };

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'ID inválido.', 400, params.error);
    }
    const data = await this.markRead.execute(requireCtx(req), params.data.id);
    res.status(200).json({ data });
  };

  listMessages = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    const query = conversationMessagesQuerySchema.safeParse(req.query);
    if (!params.success || !query.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, {
        params: params.success ? undefined : params.error,
        query: query.success ? undefined : query.error,
      });
    }
    const result = await this.messageList.execute(requireCtx(req), params.data.id, query.data);
    res.status(200).json({ data: result.items, meta: { nextCursor: result.nextCursor } });
  };

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    const body = messageSendSchema.safeParse(req.body ?? {});
    if (!params.success || !body.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, {
        params: params.success ? undefined : params.error,
        body: body.success ? undefined : body.error,
      });
    }
    const idempotencyKey = req.header('idempotency-key') ?? req.header('Idempotency-Key');
    const data = await this.messageSend.execute(
      requireCtx(req),
      params.data.id,
      body.data,
      idempotencyKey ?? undefined,
    );
    res.status(201).json({ data });
  };

  presignMedia = async (req: Request, res: Response): Promise<void> => {
    const body = mediaPresignSchema.safeParse(req.body ?? {});
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, body.error);
    }
    const data = await this.mediaPresign.execute(requireCtx(req), body.data);
    res.status(200).json({ data });
  };
}
