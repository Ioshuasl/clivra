import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  conversationIdParamSchema,
  conversationListQuerySchema,
  conversationMediaPresignSchema,
  conversationMessageCreateSchema,
  conversationMessageListQuerySchema,
  conversationUpdateSchema,
  patientMessageListQuerySchema,
} from '../schemas/conversation.schema.js';
import { ListService as ConversationListService } from '../services/conversation/conversation_list.service.js';
import { GetService as ConversationGetService } from '../services/conversation/conversation_get.service.js';
import { UpdateService as ConversationUpdateService } from '../services/conversation/conversation_update.service.js';
import { ReadService as ConversationReadService } from '../services/conversation/conversation_read.service.js';
import { ListService as MessageListService } from '../services/message/message_list.service.js';
import { ListByPatientService } from '../services/message/message_list_by_patient.service.js';
import { PresignService as MessageMediaPresignService } from '../services/message/message_media_presign.service.js';
import { CreateService as MessageCreateService } from '../services/message/message_create.service.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class ConversationController {
  constructor(
    private readonly conversationList = new ConversationListService(),
    private readonly conversationGet = new ConversationGetService(),
    private readonly conversationUpdate = new ConversationUpdateService(),
    private readonly conversationRead = new ConversationReadService(),
    private readonly messageList = new MessageListService(),
    private readonly messageListByPatient = new ListByPatientService(),
    private readonly messageMediaPresign = new MessageMediaPresignService(),
    private readonly messageCreate = new MessageCreateService(),
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const parsed = conversationListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.conversationList.execute(requireCtx(req), parsed.data);
    res.status(200).json({ data: result.items, meta: { nextCursor: result.nextCursor } });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const data = await this.conversationGet.execute(requireCtx(req), params.data.id);
    res.status(200).json({ data });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    const body = conversationUpdateSchema.safeParse(req.body);
    if (!params.success || !body.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, {
        params: params.success ? undefined : params.error,
        body: body.success ? undefined : body.error,
      });
    }
    const data = await this.conversationUpdate.execute(requireCtx(req), params.data.id, body.data);
    res.status(200).json({ data });
  };

  read = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const data = await this.conversationRead.execute(requireCtx(req), params.data.id);
    res.status(200).json({ data });
  };

  listMessages = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    const query = conversationMessageListQuerySchema.safeParse(req.query);
    if (!params.success || !query.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, {
        params: params.success ? undefined : params.error,
        query: query.success ? undefined : query.error,
      });
    }
    const result = await this.messageList.execute(requireCtx(req), params.data.id, query.data);
    res.status(200).json({ data: result.items, meta: { nextCursor: result.nextCursor } });
  };

  createMessage = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    const body = conversationMessageCreateSchema.safeParse(req.body);
    if (!params.success || !body.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, {
        params: params.success ? undefined : params.error,
        body: body.success ? undefined : body.error,
      });
    }
    const idempotencyKey = req.header('idempotency-key') ?? req.header('Idempotency-Key');
    const data = await this.messageCreate.execute(
      requireCtx(req),
      params.data.id,
      body.data,
      idempotencyKey,
    );
    res.status(201).json({ data });
  };

  listPatientMessages = async (req: Request, res: Response): Promise<void> => {
    const parsed = patientMessageListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.messageListByPatient.execute(requireCtx(req), parsed.data);
    res.status(200).json({ data: result.items, meta: { nextCursor: result.nextCursor } });
  };

  presignMedia = async (req: Request, res: Response): Promise<void> => {
    const params = conversationIdParamSchema.safeParse(req.params);
    const body = conversationMediaPresignSchema.safeParse(req.body);
    if (!params.success || !body.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, {
        params: params.success ? undefined : params.error,
        body: body.success ? undefined : body.error,
      });
    }
    const data = await this.messageMediaPresign.execute(requireCtx(req), params.data.id, body.data);
    res.status(200).json({ data });
  };
}
