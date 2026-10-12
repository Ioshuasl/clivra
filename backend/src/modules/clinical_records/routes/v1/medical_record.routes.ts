import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { authenticateMiddleware } from '../../../../shared/middlewares/authenticate.middleware.js';
import { authorize } from '../../../../shared/middlewares/authorize.middleware.js';
import { auditRead } from '../../../../shared/middlewares/audit_read.middleware.js';
import { tenantContextMiddleware } from '../../../../shared/middlewares/tenant_context.middleware.js';
import { MedicalRecordController } from '../../controllers/medical_record.controller.js';
import { AnamnesisController } from '../../controllers/anamnesis.controller.js';
import { ClinicalAlertController } from '../../controllers/clinical_alert.controller.js';
import { OdontogramController } from '../../controllers/odontogram.controller.js';
import { ClinicalNoteController } from '../../controllers/clinical_note.controller.js';
import { AttachmentController } from '../../controllers/attachment.controller.js';

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

const clinicalReadStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('clinical_records.read'),
];

const clinicalWriteStack: RequestHandler[] = [
  asyncHandler(authenticateMiddleware),
  tenantContextMiddleware,
  authorize('clinical_records.write'),
];

export function buildMedicalRecordRoutes(): Router {
  const router = Router({ mergeParams: true });
  const record = new MedicalRecordController();
  const anamnesis = new AnamnesisController();
  const alerts = new ClinicalAlertController();
  const odontogram = new OdontogramController();
  const notes = new ClinicalNoteController();
  const attachments = new AttachmentController();

  router.get(
    '/:patientId/record',
    ...clinicalReadStack,
    auditRead({ resourceType: 'medical_record' }),
    asyncHandler(record.get),
  );

  router.get(
    '/:patientId/record/odontogram',
    ...clinicalReadStack,
    auditRead({ resourceType: 'odontogram' }),
    asyncHandler(odontogram.get),
  );
  router.put(
    '/:patientId/record/odontogram/teeth/:toothCode',
    ...clinicalWriteStack,
    asyncHandler(odontogram.update),
  );

  router.get(
    '/:patientId/record/notes',
    ...clinicalReadStack,
    auditRead({ resourceType: 'clinical_note' }),
    asyncHandler(notes.list),
  );
  router.post('/:patientId/record/notes', ...clinicalWriteStack, asyncHandler(notes.create));
  router.post(
    '/:patientId/record/notes/:id/amend',
    ...clinicalWriteStack,
    asyncHandler(notes.amend),
  );
  router.patch('/:patientId/record/notes/:id', ...clinicalWriteStack, asyncHandler(notes.immutable));
  router.delete('/:patientId/record/notes/:id', ...clinicalWriteStack, asyncHandler(notes.immutable));

  router.get(
    '/:patientId/record/anamnesis',
    ...clinicalReadStack,
    auditRead({ resourceType: 'anamnesis' }),
    asyncHandler(anamnesis.list),
  );
  router.post('/:patientId/record/anamnesis', ...clinicalWriteStack, asyncHandler(anamnesis.create));
  router.post(
    '/:patientId/record/anamnesis/send-link',
    ...clinicalWriteStack,
    asyncHandler(anamnesis.sendLink),
  );

  router.get(
    '/:patientId/record/alerts',
    ...clinicalReadStack,
    auditRead({ resourceType: 'clinical_alert' }),
    asyncHandler(alerts.list),
  );
  router.post('/:patientId/record/alerts', ...clinicalWriteStack, asyncHandler(alerts.create));
  router.patch('/:patientId/record/alerts/:id', ...clinicalWriteStack, asyncHandler(alerts.update));

  router.get(
    '/:patientId/attachments',
    ...clinicalReadStack,
    auditRead({ resourceType: 'attachment' }),
    asyncHandler(attachments.list),
  );
  router.post(
    '/:patientId/attachments/presign',
    ...clinicalReadStack,
    asyncHandler(attachments.presign),
  );
  router.post('/:patientId/attachments', ...clinicalReadStack, asyncHandler(attachments.confirm));

  return router;
}
