import { Router } from 'express';
import { buildCertificateRoutes } from './routes/v1/certificate.routes.js';
import { buildDocumentRoutes } from './routes/v1/document.routes.js';
import { buildDocumentTemplateRoutes } from './routes/v1/document_template.routes.js';
import {
  buildDocumentSettingRoutes,
  buildPublicSignatureRoutes,
  buildSignatureRequestRoutes,
} from './routes/v1/signature_request.routes.js';

export function buildDocumentsRouter(): Router {
  const router = Router();
  router.use('/document-templates', buildDocumentTemplateRoutes());
  router.use('/document-certificates', buildCertificateRoutes());
  router.use('/document-settings', buildDocumentSettingRoutes());
  router.use('/', buildSignatureRequestRoutes());
  router.use('/', buildDocumentRoutes());
  return router;
}

/** Rotas sem login: link de assinatura do paciente. */
export function buildPublicDocumentsRouter(): Router {
  return buildPublicSignatureRoutes();
}
