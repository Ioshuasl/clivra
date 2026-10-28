import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { createTestP12 } from './make-test-certificate.js';
import { verifyPdfSignature } from './lib/verify-pdf-signature.js';

type Json = { status: number; body: Record<string, unknown> | null };
type Doc = Record<string, unknown>;

const MAILPIT = 'http://localhost:8025/api/v1';

/** Lê o e-mail mais recente enviado ao destinatário (Mailpit local) e devolve o texto. */
async function latestMailText(to: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const search = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:${to}`)}`);
    const list = (await search.json()) as { messages?: Array<{ ID: string }> };
    const id = list.messages?.[0]?.ID;
    if (id) {
      const message = (await (await fetch(`${MAILPIT}/message/${id}`)).json()) as { Text?: string };
      return message.Text ?? '';
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return '';
}

function textDoc(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
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
    if (jar.size > 0) headers.set('cookie', [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '));
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
  const errorCode = (json: Json): string | undefined => (json.body?.error as { code?: string } | undefined)?.code;
  const auth = (token: string, tenantId: string, json = false): HeadersInit => ({
    authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
    ...(json ? { 'content-type': 'application/json' } : {}),
  });
  const json = { 'content-type': 'application/json' };

  const password = 'SenhaForte!99';
  const certPassword = 'cert-senha-123';
  const patientEmail = `paciente-${stamp}@example.com`;

  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email: `psig-${stamp}@example.com`, password, clinicName: 'Clinica Paciente', ownerName: 'Dra. Paciente' }),
  });
  check('signup', signup.status === 201, signup.body);
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;
  const tenantDb = getTenantPrisma();
  const ctx = { tenantId, userId: ownerUserId, requestId: 'smoke' };
  const A = (tok = token) => auth(tok, tenantId, true);

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: A(),
    body: JSON.stringify({ membershipId }),
  });
  const professionalId = dataOf(professional).id as string;
  await request(`/api/v1/clinic/professionals/${professionalId}`, {
    method: 'PATCH',
    headers: A(),
    body: JSON.stringify({ croNumber: '12345', croState: 'GO' }),
  });

  const patient = await request('/api/v1/patients', {
    method: 'POST',
    headers: A(),
    body: JSON.stringify({ name: 'Maria Silva', phonePrimary: '62999994321', cpf: '52998224725', email: patientEmail }),
  });
  const patientId = (dataOf(patient).patient as { id: string }).id;
  const patientNoEmail = await request('/api/v1/patients', {
    method: 'POST',
    headers: A(),
    body: JSON.stringify({ name: 'Joao Sem Email', phonePrimary: '62999990002' }),
  });
  const patientNoEmailId = (dataOf(patientNoEmail).patient as { id: string }).id;

  const template = async (name: string, professionalSignature: string, patientSignature: string) => {
    const created = await request('/api/v1/document-templates', {
      method: 'POST',
      headers: A(),
      body: JSON.stringify({
        kind: 'CONTRACT',
        name,
        content: textDoc('Contrato de {{paciente.nome}}.'),
        professionalSignature,
        patientSignature,
      }),
    });
    return dataOf(created).id as string;
  };
  const issue = async (templateId: string, forPatient = patientId) => {
    const created = await request(`/api/v1/patients/${forPatient}/documents`, {
      method: 'POST',
      headers: A(),
      body: JSON.stringify({ templateId, professionalId }),
    });
    return dataOf(created);
  };
  const askLink = (documentId: string, channel = 'COPY') =>
    request(`/api/v1/documents/${documentId}/signature-requests`, {
      method: 'POST',
      headers: A(),
      body: JSON.stringify({ channel }),
    });
  const tokenOf = (result: Json) => String(dataOf(result).publicUrl).split('/assinar/')[1] as string;
  const pub = (tok: string, path = '', init: RequestInit = {}) =>
    request(`/api/v1/public/document-signatures/${tok}${path}`, {
      ...init,
      headers: { ...json, 'user-agent': 'smoke-agent/1.0' },
    });
  const getDoc = async (id: string) => dataOf(await request(`/api/v1/documents/${id}`, { headers: auth(token, tenantId) }));
  const setMethod = (method: string, tok = token) =>
    request('/api/v1/document-settings', { method: 'PUT', headers: A(tok), body: JSON.stringify({ patientSignatureMethod: method }) });

  // Configuração da clínica
  const settingsDefault = await request('/api/v1/document-settings', { headers: auth(token, tenantId) });
  check('configuracao-padrao-ACCEPT', dataOf(settingsDefault).patientSignatureMethod === 'ACCEPT', settingsDefault.body);
  const invalidMethod = await setMethod('QUALQUER');
  check('configuracao-metodo-invalido-400', invalidMethod.status === 400, invalidMethod.body);

  // ---- Aceite simples ----
  const tplAccept = await template('Contrato paciente obrigatório', 'OPTIONAL', 'REQUIRED');
  const doc1 = await issue(tplAccept);
  check('documento-aguardando-paciente', doc1.status === 'AWAITING_SIGNATURE', doc1.status);

  const link1 = await askLink(doc1.id as string);
  check('pedido-gera-link', link1.status === 201 && dataOf(link1).method === 'ACCEPT' && typeof dataOf(link1).publicUrl === 'string', link1.body);
  const token1 = tokenOf(link1);

  const view = await pub(token1);
  check('link-publico-mostra-documento', view.status === 200 && dataOf(view).clinicName === 'Clinica Paciente' && dataOf(view).patientFirstName === 'Maria', view.body);
  check('link-publico-texto-renderizado', JSON.stringify(dataOf(view).document).includes('Maria Silva'));
  const badLink = await pub('token-que-nao-existe-123456');
  check('link-invalido-404', badLink.status === 404, badLink.body);

  const noAgree = await pub(token1, '/sign', { method: 'POST', body: JSON.stringify({}) });
  check('assinar-sem-concordar-400', noAgree.status === 400, noAgree.body);
  const signed1 = await pub(token1, '/sign', { method: 'POST', body: JSON.stringify({ agree: true }) });
  check('paciente-assina-aceite', signed1.status === 200 && typeof dataOf(signed1).signedAt === 'string', signed1.body);

  const doc1After = await getDoc(doc1.id as string);
  const sigs1 = doc1After.signatures as Array<Doc>;
  check('documento-vira-SIGNED', doc1After.status === 'SIGNED', doc1After.status);
  check('assinatura-do-paciente-registrada', sigs1.length === 1 && sigs1[0]?.signerType === 'PATIENT' && sigs1[0]?.method === 'PATIENT_ACCEPT' && sigs1[0]?.signerName === 'Maria Silva', sigs1);
  const evidence = await tenantDb.runInTenantContext(ctx, (tx) => tx.documentSignature.findFirst({ where: { documentId: doc1.id as string } }));
  const ev = evidence?.evidence as Record<string, unknown> | null;
  check('prova-do-aceite-guardada', ev?.contentHash === doc1After.contentHash && typeof ev?.ip === 'string' && ev?.userAgent === 'smoke-agent/1.0', ev);

  const reuse = await pub(token1);
  check('link-usado-404', reuse.status === 404, reuse.body);
  const again = await askLink(doc1.id as string);
  check('paciente-ja-assinou-422', again.status === 422, again.body);

  const pdfInfo = await request(`/api/v1/documents/${doc1.id as string}/pdf`, { headers: auth(token, tenantId) });
  const pdf1 = Buffer.from(await (await fetch(dataOf(pdfInfo).url as string)).arrayBuffer());
  check('pdf-com-carimbo-1-pagina', pdf1.subarray(0, 4).toString() === '%PDF' && Number(pdf1.toString('latin1').match(/\/Count (\d+)/)?.[1]) === 1);

  // Documento que não pede assinatura do paciente
  const tplNone = await template('Sem assinatura do paciente', 'OPTIONAL', 'NONE');
  const docNone = await issue(tplNone);
  const noRequest = await askLink(docNone.id as string);
  check('modelo-sem-paciente-422', noRequest.status === 422, noRequest.body);

  // Novo pedido invalida o anterior
  const doc2 = await issue(tplAccept);
  const linkA = await askLink(doc2.id as string);
  const linkB = await askLink(doc2.id as string);
  check('novo-pedido-invalida-anterior', (await pub(tokenOf(linkA))).status === 404 && (await pub(tokenOf(linkB))).status === 200);

  // Cancelado não assina
  await request(`/api/v1/documents/${doc2.id as string}/cancel`, { method: 'POST', headers: A(), body: JSON.stringify({ reason: 'Cancelado para teste do link' }) });
  check('documento-cancelado-link-404', (await pub(tokenOf(linkB))).status === 404);

  // ---- Código de confirmação ----
  const recepToken = await (async () => {
    jar.clear();
    const invite = await request('/api/v1/users/invitations', { method: 'POST', headers: A(), body: JSON.stringify({ email: `rec-${stamp}@example.com`, role: Role.RECEPTION }) });
    const inviteToken = `rec-token-${stamp}`;
    await tenantDb.runInTenantContext(ctx, async (tx) => {
      await tx.invitation.update({ where: { id: dataOf(invite).id as string }, data: { tokenHash: hashToken(inviteToken), expiresAt: addDays(new Date(), 7) } });
    });
    jar.clear();
    const accept = await request('/api/v1/users/invitations/accept', { method: 'POST', headers: json, body: JSON.stringify({ token: inviteToken, name: 'Recepcao', password }) });
    return dataOf(accept).accessToken as string;
  })();
  const recSetting = await setMethod('WHATSAPP_CODE', recepToken);
  check('recepcao-nao-muda-configuracao-403', recSetting.status === 403, recSetting.body);
  const setCode = await setMethod('WHATSAPP_CODE');
  check('clinica-escolhe-codigo', setCode.status === 200 && dataOf(setCode).patientSignatureMethod === 'WHATSAPP_CODE', setCode.body);

  const docForReception = await issue(tplAccept);
  const recLink = await request(`/api/v1/documents/${docForReception.id as string}/signature-requests`, { method: 'POST', headers: auth(recepToken, tenantId, true), body: JSON.stringify({ channel: 'COPY' }) });
  check('recepcao-pede-assinatura-de-contrato-201', recLink.status === 201, recLink.body);
  const clinicalTpl = await request('/api/v1/document-templates', {
    method: 'POST',
    headers: A(),
    body: JSON.stringify({ kind: 'CERTIFICATE', name: 'Atestado com paciente', content: textDoc('Atestado.'), professionalSignature: 'OPTIONAL', patientSignature: 'REQUIRED' }),
  });
  const clinicalDoc = await issue(dataOf(clinicalTpl).id as string);
  const recClinical = await request(`/api/v1/documents/${clinicalDoc.id as string}/signature-requests`, { method: 'POST', headers: auth(recepToken, tenantId, true), body: JSON.stringify({ channel: 'COPY' }) });
  check('recepcao-nao-pede-assinatura-de-atestado-403', recClinical.status === 403, recClinical.body);

  const doc3 = await issue(tplAccept);
  const link3 = await askLink(doc3.id as string);
  check('pedido-usa-metodo-da-clinica', dataOf(link3).method === 'WHATSAPP_CODE', link3.body);
  const token3 = tokenOf(link3);
  check('link-informa-metodo-codigo', dataOf(await pub(token3)).method === 'WHATSAPP_CODE');

  const noCode = await pub(token3, '/sign', { method: 'POST', body: JSON.stringify({ agree: true }) });
  check('sem-codigo-422', noCode.status === 422 && errorCode(noCode) === 'CODE_REQUIRED', noCode.body);

  const sent = await pub(token3, '/code', { method: 'POST', body: '{}' });
  check('codigo-enviado-por-email-sem-whatsapp', sent.status === 200 && dataOf(sent).sentVia === 'EMAIL' && String(dataOf(sent).destinationHint).includes('***@'), sent.body);
  const mail = await latestMailText(patientEmail);
  const code = mail.match(/\b(\d{6})\b/)?.[1] ?? '';
  check('email-com-codigo-de-6-digitos', code.length === 6, mail);

  const wrongCode = code === '000000' ? '111111' : '000000';
  const bad = await pub(token3, '/sign', { method: 'POST', body: JSON.stringify({ agree: true, code: wrongCode }) });
  check('codigo-errado-422', bad.status === 422 && errorCode(bad) === 'CODE_INVALID', bad.body);
  check('codigo-errado-informa-tentativas', (((bad.body?.error as { details?: { attemptsLeft?: number } })?.details?.attemptsLeft) ?? -1) === 4, bad.body);
  const badFormat = await pub(token3, '/sign', { method: 'POST', body: JSON.stringify({ agree: true, code: '12ab' }) });
  check('codigo-formato-invalido-400', badFormat.status === 400, badFormat.body);

  const ok3 = await pub(token3, '/sign', { method: 'POST', body: JSON.stringify({ agree: true, code }) });
  check('codigo-correto-assina', ok3.status === 200, ok3.body);
  const doc3After = await getDoc(doc3.id as string);
  check('assinatura-por-codigo-registrada', doc3After.status === 'SIGNED' && (doc3After.signatures as Array<Doc>)[0]?.method === 'PATIENT_WHATSAPP_CODE', doc3After);
  const ev3 = (await tenantDb.runInTenantContext(ctx, (tx) => tx.documentSignature.findFirst({ where: { documentId: doc3.id as string } })))?.evidence as Record<string, unknown> | null;
  check('prova-do-codigo-guardada', ev3?.codeVerified === true && ev3?.codeSentVia === 'EMAIL', ev3);

  // Tentativas esgotadas
  const doc4 = await issue(tplAccept);
  const token4 = tokenOf(await askLink(doc4.id as string));
  await pub(token4, '/code', { method: 'POST', body: '{}' });
  let last: Json | null = null;
  for (let i = 0; i < 5; i += 1) {
    last = await pub(token4, '/sign', { method: 'POST', body: JSON.stringify({ agree: true, code: '999999' }) });
  }
  check('cinco-erros-bloqueiam-429', last?.status === 429 && errorCode(last) === 'TOO_MANY_ATTEMPTS', last?.body);
  const mail4 = await latestMailText(patientEmail);
  const code4 = mail4.match(/\b(\d{6})\b/)?.[1] ?? '';
  const blocked = await pub(token4, '/sign', { method: 'POST', body: JSON.stringify({ agree: true, code: code4 }) });
  check('codigo-certo-depois-de-bloqueio-429', blocked.status === 429, blocked.body);
  const resent = await pub(token4, '/code', { method: 'POST', body: '{}' });
  check('novo-codigo-zera-tentativas', resent.status === 200);
  const code4b = (await latestMailText(patientEmail)).match(/\b(\d{6})\b/)?.[1] ?? '';
  const afterResend = await pub(token4, '/sign', { method: 'POST', body: JSON.stringify({ agree: true, code: code4b }) });
  check('assina-com-codigo-novo', afterResend.status === 200, afterResend.body);

  // Código vencido
  const doc5 = await issue(tplAccept);
  const token5 = tokenOf(await askLink(doc5.id as string));
  await pub(token5, '/code', { method: 'POST', body: '{}' });
  const code5 = (await latestMailText(patientEmail)).match(/\b(\d{6})\b/)?.[1] ?? '';
  await tenantDb.runInTenantContext(ctx, (tx) =>
    tx.documentSignatureRequest.updateMany({ where: { documentId: doc5.id as string }, data: { codeExpiresAt: new Date(Date.now() - 60_000) } }),
  );
  const expired = await pub(token5, '/sign', { method: 'POST', body: JSON.stringify({ agree: true, code: code5 }) });
  check('codigo-vencido-422', expired.status === 422 && errorCode(expired) === 'CODE_EXPIRED', expired.body);

  // Sem canal para o código (sem e-mail e sem WhatsApp conectado)
  const docNoMail = await issue(tplAccept, patientNoEmailId);
  const tokenNoMail = tokenOf(await askLink(docNoMail.id as string));
  const noChannel = await pub(tokenNoMail, '/code', { method: 'POST', body: '{}' });
  check('sem-canal-para-codigo-422', noChannel.status === 422 && errorCode(noChannel) === 'NO_CHANNEL', noChannel.body);

  // Código só vale no método por código
  await setMethod('ACCEPT');
  const doc6 = await issue(tplAccept);
  const token6 = tokenOf(await askLink(doc6.id as string));
  const codeOnAccept = await pub(token6, '/code', { method: 'POST', body: '{}' });
  check('codigo-nao-existe-no-aceite-simples-422', codeOnAccept.status === 422, codeOnAccept.body);

  // ---- Dentista e paciente (ordem inversa e A1) ----
  const tplBoth = await template('Contrato dentista e paciente obrigatórios', 'REQUIRED', 'REQUIRED');
  await request('/api/v1/document-certificates/me', {
    method: 'PUT',
    headers: A(),
    body: JSON.stringify({ pfxBase64: createTestP12({ commonName: 'DRA PACIENTE:12345678909', password: certPassword }).toString('base64'), password: certPassword }),
  });

  // paciente primeiro, dentista depois
  const docPf = await issue(tplBoth);
  await pub(tokenOf(await askLink(docPf.id as string)), '/sign', { method: 'POST', body: JSON.stringify({ agree: true }) });
  const afterPatientFirst = await getDoc(docPf.id as string);
  check('paciente-primeiro-fica-aguardando-dentista', afterPatientFirst.status === 'AWAITING_SIGNATURE', afterPatientFirst.status);
  const proSign = await request(`/api/v1/documents/${docPf.id as string}/sign`, { method: 'POST', headers: A(), body: JSON.stringify({ password: certPassword }) });
  check('dentista-assina-depois-do-paciente-SIGNED', proSign.status === 200 && dataOf(proSign).status === 'SIGNED', proSign.body);
  const pdfPf = Buffer.from(await (await fetch(dataOf(await request(`/api/v1/documents/${docPf.id as string}/pdf`, { headers: auth(token, tenantId) })).url as string)).arrayBuffer());
  check('pdf-com-as-duas-assinaturas-valido', verifyPdfSignature(pdfPf).ok);

  // dentista primeiro, paciente depois (o PDF assinado não pode ser alterado)
  const docDf = await issue(tplBoth);
  await request(`/api/v1/documents/${docDf.id as string}/sign`, { method: 'POST', headers: A(), body: JSON.stringify({ password: certPassword }) });
  const pdfBefore = Buffer.from(await (await fetch(dataOf(await request(`/api/v1/documents/${docDf.id as string}/pdf`, { headers: auth(token, tenantId) })).url as string)).arrayBuffer());
  const afterProFirst = await getDoc(docDf.id as string);
  check('dentista-primeiro-fica-aguardando-paciente', afterProFirst.status === 'AWAITING_SIGNATURE', afterProFirst.status);
  await pub(tokenOf(await askLink(docDf.id as string)), '/sign', { method: 'POST', body: JSON.stringify({ agree: true }) });
  const afterBoth = await getDoc(docDf.id as string);
  check('paciente-depois-do-dentista-SIGNED', afterBoth.status === 'SIGNED', afterBoth.status);
  const pdfAfter = Buffer.from(await (await fetch(dataOf(await request(`/api/v1/documents/${docDf.id as string}/pdf`, { headers: auth(token, tenantId) })).url as string)).arrayBuffer());
  check('pdf-assinado-do-dentista-nao-e-alterado', pdfBefore.equals(pdfAfter) && verifyPdfSignature(pdfAfter).ok);

  // ---- Isolamento entre clínicas ----
  jar.clear();
  const other = await request('/api/v1/auth/signup', { method: 'POST', headers: json, body: JSON.stringify({ email: `psig-other-${stamp}@example.com`, password, clinicName: 'Outra', ownerName: 'Outro' }) });
  const otherToken = dataOf(other).accessToken as string;
  const otherTenant = (dataOf(other).tenant as { id: string }).id;
  const cross = await request(`/api/v1/documents/${doc1.id as string}/signature-requests`, { method: 'POST', headers: auth(otherToken, otherTenant, true), body: JSON.stringify({ channel: 'COPY' }) });
  check('outra-clinica-nao-pede-assinatura-404', cross.status === 404, cross.body);
  check('lista-de-documentos-mostra-assinaturas', listOf(await request(`/api/v1/patients/${patientId}/documents`, { headers: auth(token, tenantId) })).length > 3);

  server.close();
  await getPrismaClient().$disconnect();
  if (failed) {
    console.error('FAIL: document patient signature smoke');
    process.exit(1);
  }
  console.log('OK: document patient signature smoke passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
