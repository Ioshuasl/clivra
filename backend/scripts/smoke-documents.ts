import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { renderDocumentPdf } from '../src/modules/documents/helpers/document_pdf.helper.js';
import type { TiptapDoc } from '../src/modules/documents/types/document/tiptap.types.js';

type Json = { status: number; body: Record<string, unknown> | null };
type Doc = Record<string, unknown>;

function textDoc(text: string) {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

async function main() {
  const app = createApp();
  const server = app.listen(0) as Server;
  await once(server, 'listening');
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  const origin = `http://127.0.0.1:${addr.port}`;
  const stamp = Date.now();
  let failed = false;
  const jar = new Map<string, string>();

  function check(label: string, ok: boolean, detail?: unknown): void {
    console.log(ok ? 'ok  ' : 'FAIL', label);
    if (!ok) {
      failed = true;
      if (detail !== undefined) console.error('    ', JSON.stringify(detail));
    }
  }

  async function request(path: string, init: RequestInit = {}): Promise<Json> {
    const headers = new Headers(init.headers);
    if (jar.size > 0) {
      headers.set('cookie', [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '));
    }
    const res = await fetch(`${origin}${path}`, { ...init, headers });
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    const text = await res.text();
    return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
  }

  const dataOf = (json: Json): Doc => (json.body?.data ?? {}) as Doc;
  const listOf = (json: Json): Doc[] => (json.body?.data ?? []) as Doc[];
  const errorCode = (json: Json): string | undefined =>
    (json.body?.error as { code?: string } | undefined)?.code;
  const auth = (token: string, tenantId: string, json = false): HeadersInit => ({
    authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
    ...(json ? { 'content-type': 'application/json' } : {}),
  });

  const password = 'SenhaForte!99';
  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `docs-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Documentos',
      ownerName: 'Dra. Documentos',
    }),
  });
  check('signup', signup.status === 201, signup.body);
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ membershipId }),
  });
  check('professional-create', professional.status === 201, professional.body);
  const professionalId = dataOf(professional).id as string;
  await request(`/api/v1/clinic/professionals/${professionalId}`, {
    method: 'PATCH',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ croNumber: '12345', croState: 'GO' }),
  });

  const patient = await request('/api/v1/patients', {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ name: 'Maria Silva', phonePrimary: '62999990001', cpf: '52998224725' }),
  });
  check('patient-create', patient.status === 201, patient.body);
  const patientId = (dataOf(patient).patient as { id: string }).id;

  // Modelos iniciais (seed na primeira listagem)
  const templates = await request('/api/v1/document-templates', { headers: auth(token, tenantId) });
  check('templates-list', templates.status === 200, templates.body);
  const seeded = listOf(templates);
  check('seed-5-modelos', seeded.length === 5, seeded.map((t) => t.name));
  const again = await request('/api/v1/document-templates', { headers: auth(token, tenantId) });
  check('seed-idempotente', listOf(again).length === 5);
  const byKey = (key: string) => seeded.find((t) => t.systemKey === key) as Doc;
  const certificate = byKey('certificate_attendance');
  const contract = byKey('contract_services');
  const prescription = byKey('prescription_simple');

  // Validação de campo automático
  const unknownVar = await request('/api/v1/document-templates', {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({
      kind: 'OTHER',
      name: 'Com campo inexistente',
      content: textDoc('Olá {{paciente.apelido}}'),
    }),
  });
  check('template-campo-desconhecido-422', unknownVar.status === 422, unknownVar.body);

  const custom = await request('/api/v1/document-templates', {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({
      kind: 'CERTIFICATE',
      name: 'Atestado de afastamento',
      content: textDoc('Paciente {{paciente.nome}}, CRO {{profissional.cro}} em {{data.hoje}}.'),
      professionalSignature: 'REQUIRED',
      patientSignature: 'NONE',
    }),
  });
  check('template-create', custom.status === 201, custom.body);
  const customId = dataOf(custom).id as string;

  const preview = await request(`/api/v1/document-templates/${customId}/preview`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ patientId, professionalId }),
  });
  check('template-preview', preview.status === 200, preview.body);
  const previewText = JSON.stringify(dataOf(preview).content);
  check(
    'preview-substitui-campos',
    previewText.includes('Maria Silva') && previewText.includes('12345/GO') && !previewText.includes('{{'),
    previewText,
  );

  // Emissão
  const issued = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ templateId: certificate.id, professionalId }),
  });
  check('document-issue', issued.status === 201, issued.body);
  const doc = dataOf(issued);
  const documentId = doc.id as string;
  check('status-ISSUED', doc.status === 'ISSUED', doc.status);
  check('hasPdf', doc.hasPdf === true);
  check('hash-presente', typeof doc.contentHash === 'string' && (doc.contentHash as string).length === 64);
  check('sem-pdfKey-na-api', !('pdfKey' in doc));
  check('texto-renderizado', JSON.stringify(doc.content).includes('Maria Silva'));

  // PDF curto cabe em 1 página (rodapé não pode abrir página extra)
  const shortPdf = await renderDocumentPdf({
    clinicName: 'Clinica',
    legalName: null,
    taxId: null,
    phone: null,
    addressLine: null,
    title: 'Atestado',
    content: textDoc('Texto curto.') as unknown as TiptapDoc,
    professionalName: 'Dra. Teste',
    professionalCro: '123/GO',
    patientName: 'Maria',
    professionalLine: true,
    patientLine: true,
    verificationCode: 'abc123abc123',
  });
  const pageCount = (shortPdf.toString('latin1').match(/\/Type \/Page\b(?!s)/g) ?? []).length;
  check('pdf-curto-1-pagina', pageCount === 1, pageCount);

  // Modelo com assinatura obrigatória => aguardando assinatura
  const awaiting = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ templateId: customId, professionalId }),
  });
  check('assinatura-obrigatoria-AWAITING', dataOf(awaiting).status === 'AWAITING_SIGNATURE', awaiting.body);

  // Texto ajustado só neste documento (ex.: receita)
  const rx = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({
      templateId: prescription.id,
      professionalId,
      content: textDoc('Amoxicilina 500mg, 8/8h por 7 dias.'),
    }),
  });
  check('document-content-override', rx.status === 201 && JSON.stringify(dataOf(rx).content).includes('Amoxicilina'), rx.body);

  const pdf = await request(`/api/v1/documents/${documentId}/pdf`, { headers: auth(token, tenantId) });
  check('document-pdf-url', pdf.status === 200 && typeof dataOf(pdf).url === 'string', pdf.body);

  const list = await request(`/api/v1/patients/${patientId}/documents`, { headers: auth(token, tenantId) });
  check('document-list', list.status === 200 && listOf(list).length === 3, list.body);

  // Correção (nova versão) cancela o anterior
  const shortReason = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ templateId: certificate.id, professionalId, supersedesId: documentId, amendReason: 'curto' }),
  });
  check('correcao-motivo-curto-422', shortReason.status === 422, shortReason.body);
  const amended = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({
      templateId: certificate.id,
      professionalId,
      supersedesId: documentId,
      amendReason: 'Horário de atendimento corrigido',
    }),
  });
  check('correcao-v2', amended.status === 201 && dataOf(amended).version === 2, amended.body);
  const old = await request(`/api/v1/documents/${documentId}`, { headers: auth(token, tenantId) });
  check('anterior-CANCELLED', dataOf(old).status === 'CANCELLED', old.body);

  // Cancelamento
  const shortCancel = await request(`/api/v1/documents/${dataOf(rx).id as string}/cancel`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ reason: 'x' }),
  });
  check('cancel-motivo-curto-400', shortCancel.status === 400, shortCancel.body);
  const cancel = await request(`/api/v1/documents/${dataOf(rx).id as string}/cancel`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ reason: 'Emitido para o paciente errado' }),
  });
  check('cancel-ok', cancel.status === 200 && dataOf(cancel).status === 'CANCELLED', cancel.body);
  const cancelAgain = await request(`/api/v1/documents/${dataOf(rx).id as string}/cancel`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ reason: 'Emitido para o paciente errado' }),
  });
  check('cancel-duas-vezes-422', cancelAgain.status === 422, cancelAgain.body);

  // Imutabilidade no banco (trigger)
  const tenantDb = getTenantPrisma();
  const ctx = { tenantId, userId: ownerUserId, requestId: 'smoke' };
  let updateBlocked = false;
  try {
    await tenantDb.runInTenantContext(ctx, (tx) =>
      tx.document.update({ where: { id: documentId }, data: { title: 'adulterado' } }),
    );
  } catch {
    updateBlocked = true;
  }
  check('trigger-bloqueia-update-de-conteudo', updateBlocked);
  let deleteBlocked = false;
  try {
    await tenantDb.runInTenantContext(ctx, (tx) => tx.document.delete({ where: { id: documentId } }));
  } catch {
    deleteBlocked = true;
  }
  check('trigger-bloqueia-delete', deleteBlocked);

  // Permissões: recepção emite contrato, não receita; não gerencia modelos
  const invite = await request('/api/v1/users/invitations', {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ email: `docs-rec-${stamp}@example.com`, role: Role.RECEPTION }),
  });
  check('invite-reception', invite.status === 201, invite.body);
  const inviteId = dataOf(invite).id as string;
  const recToken = `docs-rec-token-${stamp}`;
  await tenantDb.runInTenantContext(ctx, async (tx) => {
    await tx.invitation.update({
      where: { id: inviteId },
      data: { tokenHash: hashToken(recToken), expiresAt: addDays(new Date(), 7) },
    });
  });
  jar.clear();
  const accept = await request('/api/v1/users/invitations/accept', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: recToken, name: 'Recepcionista', password }),
  });
  check('accept-reception', accept.status === 200, accept.body);
  const recAccess = dataOf(accept).accessToken as string;

  const recContract = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(recAccess, tenantId, true),
    body: JSON.stringify({ templateId: contract.id, professionalId }),
  });
  check('recepcao-emite-contrato', recContract.status === 201, recContract.body);
  const recRx = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(recAccess, tenantId, true),
    body: JSON.stringify({ templateId: prescription.id, professionalId }),
  });
  check('recepcao-nao-emite-receita-403', recRx.status === 403, recRx.body);
  const recList = await request(`/api/v1/patients/${patientId}/documents`, { headers: auth(recAccess, tenantId) });
  const recKinds = new Set(listOf(recList).map((d) => d.kind));
  check(
    'recepcao-so-ve-contrato-e-termo',
    recList.status === 200 && !recKinds.has('PRESCRIPTION') && !recKinds.has('CERTIFICATE') && recKinds.has('CONTRACT'),
    [...recKinds],
  );
  const recGetClinical = await request(`/api/v1/documents/${documentId}`, { headers: auth(recAccess, tenantId) });
  check('recepcao-nao-le-atestado-403', recGetClinical.status === 403, recGetClinical.body);
  const recCreateTemplate = await request('/api/v1/document-templates', {
    method: 'POST',
    headers: auth(recAccess, tenantId, true),
    body: JSON.stringify({ kind: 'OTHER', name: 'x', content: textDoc('x') }),
  });
  check('recepcao-nao-cria-modelo-403', recCreateTemplate.status === 403, recCreateTemplate.body);

  // Modelo desativado não emite
  const deactivate = await request(`/api/v1/document-templates/${customId}`, {
    method: 'DELETE',
    headers: auth(token, tenantId),
  });
  check('template-desativar-204', deactivate.status === 204, deactivate.body);
  const inactive = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ templateId: customId, professionalId }),
  });
  check('modelo-inativo-422', inactive.status === 422, inactive.body);

  // Isolamento entre clínicas
  jar.clear();
  const other = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `docs-other-${stamp}@example.com`,
      password,
      clinicName: 'Outra Clinica',
      ownerName: 'Outro Owner',
    }),
  });
  const otherToken = dataOf(other).accessToken as string;
  const otherTenant = (dataOf(other).tenant as { id: string }).id;
  const cross = await request(`/api/v1/documents/${documentId}`, { headers: auth(otherToken, otherTenant) });
  check('outra-clinica-404', cross.status === 404, cross.body);

  server.close();
  await getPrismaClient().$disconnect();
  if (failed) {
    console.error('FAIL: documents smoke');
    process.exit(1);
  }
  console.log('OK: documents smoke passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
