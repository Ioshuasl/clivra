import type { Request, Response } from 'express';
import { AppError } from '../../../shared/middlewares/error_handler.middleware.js';
import {
  checkDuplicateQuerySchema,
  consentCreateSchema,
  guardianCreateSchema,
  patientCreateSchema,
  patientDeleteQuerySchema,
  patientIdParamSchema,
  patientListQuerySchema,
  patientUpdateSchema,
} from '../schemas/patients.schema.js';
import { CreateService as PatientCreateService } from '../services/patient/patient_create.service.js';
import { ListService as PatientListService } from '../services/patient/patient_list.service.js';
import { GetService as PatientGetService } from '../services/patient/patient_get.service.js';
import { UpdateService as PatientUpdateService } from '../services/patient/patient_update.service.js';
import { DeleteService as PatientDeleteService } from '../services/patient/patient_delete.service.js';
import { CheckDuplicateService } from '../services/patient/patient_check_duplicate.service.js';
import { CreateService as GuardianCreateService } from '../services/guardian/guardian_create.service.js';
import { ListService as ConsentListService } from '../services/consent/consent_list.service.js';
import { CreateService as ConsentCreateService } from '../services/consent/consent_create.service.js';
import { GetService as TimelineGetService } from '../services/timeline/patient_timeline.service.js';
import { PatientNotFoundError } from '../models/errors/patients.errors.js';

function requireCtx(req: Request) {
  if (!req.ctx) {
    throw new AppError('UNAUTHENTICATED', 'Token de acesso ausente.', 401);
  }
  return req.ctx;
}

export class PatientController {
  constructor(
    private readonly patientCreate = new PatientCreateService(),
    private readonly patientList = new PatientListService(),
    private readonly patientGet = new PatientGetService(),
    private readonly patientUpdate = new PatientUpdateService(),
    private readonly patientDelete = new PatientDeleteService(),
    private readonly patientCheckDuplicate = new CheckDuplicateService(),
    private readonly guardianCreate = new GuardianCreateService(),
    private readonly consentList = new ConsentListService(),
    private readonly consentCreate = new ConsentCreateService(),
    private readonly timelineGet = new TimelineGetService(),
  ) {}

  listPatients = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = patientListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.patientList.execute(ctx, parsed.data);
    res.status(200).json({
      data: result.items,
      meta: { nextCursor: result.nextCursor },
    });
  };

  createPatient = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = patientCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.patientCreate.execute(ctx, parsed.data);
    res.status(201).json({ data: result });
  };

  checkDuplicatePatient = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const parsed = checkDuplicateQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.patientCheckDuplicate.execute(ctx, parsed.data);
    res.status(200).json({ data: result });
  };

  getPatient = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = patientIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const result = await this.patientGet.execute(ctx, params.data.id);
    if (!result) throw new PatientNotFoundError();
    res.status(200).json({ data: result });
  };

  updatePatient = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = patientIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = patientUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.patientUpdate.execute(ctx, params.data.id, parsed.data);
    res.status(200).json({ data: result });
  };

  deletePatient = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = patientIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const query = patientDeleteQuerySchema.safeParse(req.query);
    if (!query.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, query.error);
    }
    const result = await this.patientDelete.execute(
      ctx,
      params.data.id,
      query.data.confirmFutureAppointments ?? false,
    );
    res.status(200).json({ data: result });
  };

  createGuardian = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = patientIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = guardianCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.guardianCreate.execute(ctx, params.data.id, parsed.data);
    res.status(201).json({ data: result });
  };

  listConsents = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = patientIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const result = await this.consentList.execute(ctx, params.data.id);
    res.status(200).json({ data: result });
  };

  createConsent = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = patientIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const parsed = consentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, parsed.error);
    }
    const result = await this.consentCreate.execute(ctx, params.data.id, parsed.data, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.status(201).json({ data: result });
  };

  getTimeline = async (req: Request, res: Response): Promise<void> => {
    const ctx = requireCtx(req);
    const params = patientIdParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados inválidos.', 400, params.error);
    }
    const result = await this.timelineGet.execute(ctx, params.data.id);
    res.status(200).json({ data: result });
  };
}
