import { Router } from 'express';
import { buildReportRoutes } from './routes/v1/report.routes.js';
import { buildExportRoutes } from './routes/v1/export.routes.js';

export function buildReportingRouter(): Router {
  const router = Router();
  router.use('/reports', buildReportRoutes());
  router.use('/exports', buildExportRoutes());
  return router;
}
