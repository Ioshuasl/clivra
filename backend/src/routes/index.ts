import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { buildIdentityRouter } from '../modules/identity/identity.module.js';
import { buildClinicRouter } from '../modules/clinic/clinic.module.js';
import { buildPatientsRouter } from '../modules/patients/patients.module.js';
import {
  buildClinicalRecordsRouter,
  buildPublicAnamnesisRouter,
} from '../modules/clinical_records/clinical_records.module.js';
import {
  buildPublicRouter,
  buildSchedulingRouter,
} from '../modules/scheduling/scheduling.module.js';
import {
  buildMessagingRouter,
  buildStreamRouter,
  buildWhatsappWebhookRouter,
} from '../modules/messaging/messaging.module.js';
import { buildTreatmentsRouter, buildPublicQuotesRouter } from '../modules/treatments/treatments.module.js';
import { buildBillingRouter } from '../modules/billing/billing.module.js';
import { buildReportingRouter } from '../modules/reporting/reporting.module.js';
import {
  buildAsaasWebhookRouter,
  buildSubscriptionRouter,
} from '../modules/subscription/subscription.module.js';
import { buildPlatformRouter } from '../modules/platform/platform.module.js';

/** Monta rotas versionadas em `/api/v1`. Módulos de domínio entram aqui. */
export function buildApiRouter(): Router {
  const api = Router();
  api.use(healthRoutes);
  api.use(buildIdentityRouter());
  api.use(buildClinicRouter());
  api.use(buildPatientsRouter());
  api.use(buildClinicalRecordsRouter());
  api.use(buildSchedulingRouter());
  api.use(buildMessagingRouter());
  api.use(buildStreamRouter());
  api.use('/webhooks/whatsapp', buildWhatsappWebhookRouter());
  api.use('/webhooks/asaas', buildAsaasWebhookRouter());
  api.use(buildTreatmentsRouter());
  api.use(buildBillingRouter());
  api.use(buildReportingRouter());
  api.use(buildSubscriptionRouter());
  api.use(buildPlatformRouter());
  api.use('/public', buildPublicRouter());
  api.use('/public', buildPublicAnamnesisRouter());
  api.use('/public', buildPublicQuotesRouter());
  return api;
}
