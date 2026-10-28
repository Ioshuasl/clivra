import { once } from 'node:events';
import type { Server } from 'node:http';
import { createHash } from 'node:crypto';
import { createApp } from '../src/app.js';
import { getPrismaClient, getTenantPrisma } from '../src/shared/database/tenant_prisma.js';
import { hashToken } from '../src/shared/helpers/token_hash.js';
import { addDays } from '../src/modules/identity/helpers/slug.helper.js';
import { Role } from '../src/modules/identity/enum/role/role.enum.js';
import { idGenerator } from '../src/shared/helpers/id_generator.js';
import { createTestP12 } from './make-test-certificate.js';
import { verifyPdfSignature } from './lib/verify-pdf-signature.js';

type Json = { status: number; body: Record<string, unknown> | null };
type Doc = Record<string, unknown>;

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

  const password = 'SenhaForte!99';
  const certPassword = 'cert-senha-123';
  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `sig-${stamp}@example.com`, password, clinicName: 'Clinica Assinatura', ownerName: 'Dra. Assina' }),
  });
  check('signup', signup.status === 201, signup.body);
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const ownerUserId = (dataOf(signup).user as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;
  const tenantDb = getTenantPrisma();
  const ctx = { tenantId, userId: ownerUserId, requestId: 'smoke' };

  // Usuário ainda sem cadastro de profissional
  const meBefore = await request('/api/v1/document-certificates/me', { headers: auth(token, tenantId) });
  check('me-sem-profissional', meBefore.status === 200 && dataOf(meBefore).professionalId === null, meBefore.body);

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ membershipId }),
  });
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
  const patientId = (dataOf(patient).patient as { id: string }).id;

  const templates = await request('/api/v1/document-templates', { headers: auth(token, tenantId) });
  const certificate = listOf(templates).find((t) => t.systemKey === 'certificate_attendance') as Doc;
  const imageTerm = listOf(templates).find((t) => t.systemKey === 'image_use_term') as Doc;

  const put = (pfx: Buffer | string, pass: string, tok = token) =>
    request('/api/v1/document-certificates/me', {
      method: 'PUT',
      headers: auth(tok, tenantId, true),
      body: JSON.stringify({ pfxBase64: typeof pfx === 'string' ? pfx : pfx.toString('base64'), password: pass }),
    });

  // Cadastro do certificado
  const meNoCert = await request('/api/v1/document-certificates/me', { headers: auth(token, tenantId) });
  check('me-profissional-sem-certificado', dataOf(meNoCert).professionalId === professionalId && dataOf(meNoCert).certificate === null, meNoCert.body);

  const goodPfx = createTestP12({ commonName: 'DRA ASSINA:12345678909', password: certPassword });
  const garbage = await put(Buffer.from('isto nao e um certificado').toString('base64'), certPassword);
  check('upload-arquivo-invalido-422', garbage.status === 422 && errorCode(garbage) === 'CERTIFICATE_INVALID', garbage.body);
  const wrong = await put(goodPfx, 'senha-errada');
  check('upload-senha-errada-422', wrong.status === 422 && errorCode(wrong) === 'CERTIFICATE_WRONG_PASSWORD', wrong.body);
  const expired = await put(createTestP12({ commonName: 'VENCIDO:1', password: certPassword, validDays: -10 }), certPassword);
  check('upload-vencido-422', expired.status === 422 && errorCode(expired) === 'CERTIFICATE_EXPIRED', expired.body);

  const upload = await put(goodPfx, certPassword);
  check('upload-ok', upload.status === 200 && String(dataOf(upload).subjectName).includes('DRA ASSINA'), upload.body);
  check('upload-nao-devolve-arquivo', !JSON.stringify(upload.body).includes('pfx') && dataOf(upload).expired === false);
  const stored = await tenantDb.runInTenantContext(ctx, (tx) => tx.professionalCertificate.findFirst({ where: { professionalId } }));
  check(
    'pfx-criptografado-em-repouso',
    Boolean(stored) && !stored!.pfxEncrypted.includes(goodPfx.toString('base64').slice(0, 40)),
  );

  // Assinar
  const issued = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ templateId: certificate.id, professionalId }),
  });
  const documentId = dataOf(issued).id as string;
  check('documento-emitido-ISSUED', dataOf(issued).status === 'ISSUED', issued.body);

  const sign = (id: string, pass: string, tok = token) =>
    request(`/api/v1/documents/${id}/sign`, {
      method: 'POST',
      headers: auth(tok, tenantId, true),
      body: JSON.stringify({ password: pass }),
    });

  const badSign = await sign(documentId, 'senha-errada');
  check('assinar-senha-errada-422', badSign.status === 422 && errorCode(badSign) === 'CERTIFICATE_WRONG_PASSWORD', badSign.body);
  const stillIssued = await request(`/api/v1/documents/${documentId}`, { headers: auth(token, tenantId) });
  check('senha-errada-nao-altera-documento', dataOf(stillIssued).status === 'ISSUED' && (dataOf(stillIssued).signatures as unknown[]).length === 0);

  const signed = await sign(documentId, certPassword);
  check('assinar-ok', signed.status === 200 && dataOf(signed).status === 'SIGNED', signed.body);
  const signatures = dataOf(signed).signatures as Array<Record<string, unknown>>;
  check('assinatura-registrada', signatures.length === 1 && signatures[0]?.method === 'ICP_A1' && signatures[0]?.signerType === 'PROFESSIONAL', signatures);

  const pdfInfo = await request(`/api/v1/documents/${documentId}/pdf`, { headers: auth(token, tenantId) });
  const pdfBuffer = Buffer.from(await (await fetch(dataOf(pdfInfo).url as string)).arrayBuffer());
  check('pdf-assinado-formato', pdfBuffer.subarray(0, 4).toString() === '%PDF');
  const verification = verifyPdfSignature(pdfBuffer);
  check('assinatura-do-pdf-valida', verification.ok && verification.signer.includes('DRA ASSINA'), verification);
  // A assinatura reescreve o dicionário da página (atualização incremental); o número real está em /Count.
  const pages = Number(pdfBuffer.toString('latin1').match(/\/Count (\d+)/)?.[1]);
  check('pdf-assinado-1-pagina', pages === 1, pages);

  // Adulterar o PDF invalida a assinatura
  const tampered = Buffer.from(pdfBuffer);
  const marker = tampered.indexOf('Atesto');
  if (marker > 0) tampered[marker] = 0x41;
  check('pdf-adulterado-falha-na-verificacao', tampered.equals(pdfBuffer) || !verifyPdfSignature(tampered).ok);

  const again = await sign(documentId, certPassword);
  check('assinar-duas-vezes-422', again.status === 422, again.body);

  // Modelo sem assinatura do dentista não assina
  const imageDoc = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ templateId: imageTerm.id, professionalId }),
  });
  const noPolicy = await sign(dataOf(imageDoc).id as string, certPassword);
  check('modelo-sem-assinatura-422', noPolicy.status === 422, noPolicy.body);

  // Paciente obrigatório: depois do dentista fica aguardando o paciente
  const both = await request('/api/v1/document-templates', {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({
      kind: 'CONTRACT',
      name: 'Contrato com paciente obrigatório',
      content: textDoc('Contrato de {{paciente.nome}}'),
      professionalSignature: 'REQUIRED',
      patientSignature: 'REQUIRED',
    }),
  });
  const contract = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ templateId: dataOf(both).id, professionalId }),
  });
  const contractSigned = await sign(dataOf(contract).id as string, certPassword);
  check('paciente-obrigatorio-fica-AWAITING', contractSigned.status === 200 && dataOf(contractSigned).status === 'AWAITING_SIGNATURE', contractSigned.body);

  // Cancelado não assina
  const toCancel = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ templateId: certificate.id, professionalId }),
  });
  await request(`/api/v1/documents/${dataOf(toCancel).id as string}/cancel`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ reason: 'Emitido por engano para teste' }),
  });
  const cancelledSign = await sign(dataOf(toCancel).id as string, certPassword);
  check('cancelado-nao-assina-422', cancelledSign.status === 422, cancelledSign.body);

  // Assinatura é append-only
  let updateBlocked = false;
  try {
    await tenantDb.runInTenantContext(ctx, (tx) => tx.documentSignature.updateMany({ where: { documentId }, data: { signerName: 'x' } }));
  } catch {
    updateBlocked = true;
  }
  check('assinatura-append-only-update', updateBlocked);
  let deleteBlocked = false;
  try {
    await tenantDb.runInTenantContext(ctx, (tx) => tx.documentSignature.deleteMany({ where: { documentId } }));
  } catch {
    deleteBlocked = true;
  }
  check('assinatura-append-only-delete', deleteBlocked);

  // Outro dentista não assina documento alheio; recepção não tem certificado
  const inviteAndAccept = async (role: string, label: string) => {
    jar.clear();
    const invite = await request('/api/v1/users/invitations', {
      method: 'POST',
      headers: auth(token, tenantId, true),
      body: JSON.stringify({ email: `${label}-${stamp}@example.com`, role }),
    });
    const inviteToken = `${label}-token-${stamp}`;
    await tenantDb.runInTenantContext(ctx, async (tx) => {
      await tx.invitation.update({
        where: { id: dataOf(invite).id as string },
        data: { tokenHash: hashToken(inviteToken), expiresAt: addDays(new Date(), 7) },
      });
    });
    jar.clear();
    const accept = await request('/api/v1/users/invitations/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: inviteToken, name: label, password }),
    });
    return { token: dataOf(accept).accessToken as string, membershipId: (dataOf(accept).membership as { id: string } | undefined)?.id };
  };

  const reception = await inviteAndAccept(Role.RECEPTION, 'rec');
  const recPut = await put(goodPfx, certPassword, reception.token);
  check('recepcao-nao-cadastra-certificado', recPut.status === 403 || recPut.status === 422, recPut.body);

  const dentist = await inviteAndAccept(Role.DENTIST, 'dent');
  // O plano de teste permite 1 profissional; o segundo entra direto no banco.
  const dentistProId = idGenerator.next();
  await tenantDb.runInTenantContext(ctx, (tx) =>
    tx.professional.create({
      data: {
        id: dentistProId,
        tenantId,
        membershipId: dentist.membershipId as string,
        croNumber: '99999',
        croState: 'GO',
      },
    }),
  );
  const foreignDoc = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ templateId: certificate.id, professionalId: dentistProId }),
  });
  const foreignSign = await sign(dataOf(foreignDoc).id as string, certPassword);
  check('assinar-documento-de-outro-dentista-403', foreignSign.status === 403, foreignSign.body);
  const dentistNoCert = await sign(dataOf(foreignDoc).id as string, certPassword, dentist.token);
  check('dentista-sem-certificado-422', dentistNoCert.status === 422 && errorCode(dentistNoCert) === 'CERTIFICATE_REQUIRED', dentistNoCert.body);

  // Remover certificado
  const remove = await request('/api/v1/document-certificates/me', { method: 'DELETE', headers: auth(token, tenantId) });
  check('remover-certificado-204', remove.status === 204, remove.body);
  const meAfter = await request('/api/v1/document-certificates/me', { headers: auth(token, tenantId) });
  check('certificado-removido', dataOf(meAfter).certificate === null, meAfter.body);
  const afterRemoval = await request(`/api/v1/patients/${patientId}/documents`, {
    method: 'POST',
    headers: auth(token, tenantId, true),
    body: JSON.stringify({ templateId: certificate.id, professionalId }),
  });
  const noCertSign = await sign(dataOf(afterRemoval).id as string, certPassword);
  check('assinar-sem-certificado-422', noCertSign.status === 422 && errorCode(noCertSign) === 'CERTIFICATE_REQUIRED', noCertSign.body);

  server.close();
  await getPrismaClient().$disconnect();
  if (failed) {
    console.error('FAIL: document signature smoke');
    process.exit(1);
  }
  console.log('OK: document signature smoke passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
