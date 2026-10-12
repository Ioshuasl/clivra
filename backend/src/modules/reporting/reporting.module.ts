import { Router } from 'express';
import { buildExportRoutes } from './routes/v1/export.routes.js';
import { buildReportRoutes } from './routes/v1/report.routes.js';

/** Bounded context reporting (E9) — dashboard + GETs + export assíncrono. */
export function buildReportingRouter(): Router {
  const router = Router();
  router.use('/reports', buildReportRoutes());
  router.use('/exports', buildExportRoutes());
  return router;
}
