import type { JobPayload } from '../../../shared/queue/job_payload.js';
import { logger } from '../../../shared/config/logger.js';
import { getObjectStorage, ObjectStorageError } from '../../../shared/storage/index.js';
import { CompleteAction } from '../actions/tenant_export/tenant_export_complete.action.js';
import { buildCsv, jsonFile } from '../helpers/tenant_export_csv.helper.js';
import { buildTenantExportStorageKey } from '../helpers/tenant_export_storage.helper.js';
import { buildZipStore, type ZipStoreEntry } from '../helpers/zip_store.helper.js';
import {
  CollectRepository,
  type TenantExportSnapshot,
} from '../repositories/tenant_export/tenant_export_collect.repository.js';
import { GetRepository } from '../repositories/tenant_export/tenant_export_get.repository.js';
import { UpdateStatusRepository } from '../repositories/tenant_export/tenant_export_update_status.repository.js';

function jobCtx(payload: JobPayload, userId: string) {
  return {
    tenantId: payload.tenantId,
    userId,
    requestId: payload.requestId,
  };
}

function snapshotFiles(snapshot: TenantExportSnapshot): ZipStoreEntry[] {
  return [
    {
      name: 'manifest.json',
      data: jsonFile({
        kind: 'tenant-export',
        generatedAt: new Date().toISOString(),
        files: [
          'json/patients.json',
          'json/appointments.json',
          'json/clinical_notes.json',
          'json/anamnesis_responses.json',
          'json/clinical_alerts.json',
          'json/odontogram.json',
          'json/receivables.json',
          'json/payments.json',
          'json/attachments.json',
          'csv/patients.csv',
          'csv/appointments.csv',
          'csv/receivables.csv',
          'csv/payments.csv',
        ],
      }),
    },
    { name: 'json/patients.json', data: jsonFile(snapshot.patients) },
    { name: 'json/appointments.json', data: jsonFile(snapshot.appointments) },
    { name: 'json/clinical_notes.json', data: jsonFile(snapshot.clinicalNotes) },
    { name: 'json/anamnesis_responses.json', data: jsonFile(snapshot.anamnesisResponses) },
    { name: 'json/clinical_alerts.json', data: jsonFile(snapshot.clinicalAlerts) },
    { name: 'json/odontogram.json', data: jsonFile(snapshot.odontogram) },
    { name: 'json/receivables.json', data: jsonFile(snapshot.receivables) },
    { name: 'json/payments.json', data: jsonFile(snapshot.payments) },
    {
      name: 'json/attachments.json',
      data: jsonFile(snapshot.attachments.map(({ storageKey: _key, ...meta }) => meta)),
    },
    {
      name: 'csv/patients.csv',
      data: buildCsv(
        ['id', 'code', 'name', 'cpf', 'phonePrimary', 'email', 'active'],
        snapshot.patients.map((row) => [
          cell(row.id),
          cell(row.code),
          cell(row.name),
          cell(row.cpf),
          cell(row.phonePrimary),
          cell(row.email),
          row.active === true ? 'true' : 'false',
        ]),
      ),
    },
    {
      name: 'csv/appointments.csv',
      data: buildCsv(
        ['id', 'patientId', 'startsAt', 'endsAt', 'status'],
        snapshot.appointments.map((row) => [
          String(row.id),
          String(row.patientId),
          String(row.startsAt),
          String(row.endsAt),
          String(row.status),
        ]),
      ),
    },
    {
      name: 'csv/receivables.csv',
      data: buildCsv(
        ['id', 'patientId', 'totalCents', 'status'],
        snapshot.receivables.map((row) => [
          String(row.id),
          String(row.patientId),
          Number(row.totalCents),
          String(row.status),
        ]),
      ),
    },
    {
      name: 'csv/payments.csv',
      data: buildCsv(
        ['id', 'receivableId', 'amountCents', 'receivedAt'],
        snapshot.payments.map((row) => [
          String(row.id),
          String(row.receivableId),
          Number(row.amountCents),
          String(row.receivedAt),
        ]),
      ),
    },
  ];
}

export async function tenantExportJob(payload: JobPayload): Promise<void> {
  const exportId = typeof payload.exportId === 'string' ? payload.exportId : '';
  if (!exportId) return;

  const getExport = new GetRepository();
  const updateStatus = new UpdateStatusRepository();
  const collect = new CollectRepository();
  const complete = new CompleteAction();

  const probeCtx = jobCtx(payload, payload.tenantId);
  const probe = await getExport.execute(probeCtx, exportId);
  if (!probe) return;
  if (probe.status === 'READY' && probe.storageKey) return;

  const ctx = jobCtx(payload, probe.requestedBy);
  await updateStatus.execute(ctx, exportId, { status: 'RUNNING', error: null });

  try {
    const snapshot = await collect.execute(ctx);
    const storage = getObjectStorage();
    const attachmentFiles: ZipStoreEntry[] = [];

    for (const attachment of snapshot.attachments) {
      try {
        const body = await storage.getObject(attachment.storageKey);
        if (!body) {
          attachment.missing = true;
          continue;
        }
        attachmentFiles.push({ name: attachment.zipPath, data: body });
      } catch {
        attachment.missing = true;
      }
    }

    const zip = buildZipStore([...snapshotFiles(snapshot), ...attachmentFiles]);
    const storageKey = buildTenantExportStorageKey(ctx.tenantId, exportId);
    await storage.putObject(storageKey, zip, 'application/zip');
    await complete.execute(ctx, exportId, storageKey);
    logger.info({ tenantId: ctx.tenantId, exportId, requestId: ctx.requestId }, 'tenant_export_ready');
  } catch (err) {
    const message =
      err instanceof ObjectStorageError
        ? 'Armazenamento indisponível.'
        : err instanceof Error
          ? err.message
          : 'Falha ao gerar exportação.';
    await updateStatus.execute(ctx, exportId, { status: 'FAILED', error: message });
    logger.warn({ tenantId: ctx.tenantId, exportId, requestId: ctx.requestId }, 'tenant_export_failed');
    if (!(err instanceof ObjectStorageError)) throw err;
  }
}

function cell(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }
  return JSON.stringify(value);
}
