import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';

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

  const dataOf = (result: Json): Doc => (result.body?.data ?? {}) as Doc;
  const listOf = (result: Json): Doc[] => (result.body?.data ?? []) as Doc[];
  const errorCode = (result: Json): string | undefined =>
    (result.body?.error as { code?: string } | undefined)?.code;
  const json = { 'content-type': 'application/json' };

  const password = 'SenhaForte!99';
  const signup = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({
      email: `qcontract-${stamp}@example.com`,
      password,
      clinicName: 'Clinica Contrato',
      ownerName: 'Dr. Contrato',
    }),
  });
  check('signup', signup.status === 201, signup.body);
  const token = dataOf(signup).accessToken as string;
  const tenantId = (dataOf(signup).tenant as { id: string }).id;
  const membershipId = (dataOf(signup).membership as { id: string }).id;
  const A = (tok = token, withIdem?: string): HeadersInit => ({
    authorization: `Bearer ${tok}`,
    'x-tenant-id': tenantId,
    'content-type': 'application/json',
    ...(withIdem ? { 'idempotency-key': withIdem } : {}),
  });

  const professional = await request('/api/v1/clinic/professionals', {
    method: 'POST',
    headers: A(),
    body: JSON.stringify({ membershipId, croNumber: '12345', croState: 'GO' }),
  });
  const professionalId = dataOf(professional).id as string;

  const patient = await request('/api/v1/patients', {
    method: 'POST',
    headers: A(),
    body: JSON.stringify({ name: 'Maria Contrato', phonePrimary: '62999994321', birthDate: '1990-01-15' }),
  });
  const patientId = (dataOf(patient).patient as { id: string }).id;

  const procedures = await request('/api/v1/procedures', { headers: A() });
  const res01 = listOf(procedures).find((row) => row.code === 'RES-01');
  await request(`/api/v1/procedures/${res01?.id as string}`, {
    method: 'PATCH',
    headers: A(),
    body: JSON.stringify({ priceCents: 35000 }),
  });

  let approveCount = 0;
  async function approvedQuote(): Promise<string> {
    const created = await request('/api/v1/quotes', {
      method: 'POST',
      headers: A(),
      body: JSON.stringify({ patientId, professionalId, items: [{ procedureId: res01?.id, toothCode: '26' }] }),
    });
    const quoteId = dataOf(created).id as string;
    await request(`/api/v1/quotes/${quoteId}/send`, {
      method: 'POST',
      headers: A(),
      body: JSON.stringify({ channel: 'COPY' }),
    });
    approveCount += 1;
    const decision = await request(`/api/v1/quotes/${quoteId}/decision`, {
      method: 'POST',
      headers: A(token, `qc-${stamp}-${approveCount}`),
      body: JSON.stringify({
        decision: 'APPROVED',
        payment: { installments: 3, firstDueDate: '2026-12-10', method: 'PIX', downPaymentCents: 5000 },
      }),
    });
    check(`aprovação ${approveCount}`, decision.status === 200, decision.body);
    return quoteId;
  }

  const contractsOf = async (quoteId: string): Promise<Doc[]> => {
    const all = await request(`/api/v1/patients/${patientId}/documents`, { headers: A() });
    return listOf(all).filter((row) => row.quoteId === quoteId);
  };

  // Sem modelo escolhido
  const q1 = await approvedQuote();
  check('sem modelo: nenhum contrato automático', (await contractsOf(q1)).length === 0);
  const noTemplate = await request(`/api/v1/quotes/${q1}/contract`, { method: 'POST', headers: A() });
  check('manual sem modelo = 422', noTemplate.status === 422 && errorCode(noTemplate) === 'QUOTE_CONTRACT_TEMPLATE_MISSING', noTemplate.body);

  // Modelo de contrato com variáveis do orçamento
  const template = await request('/api/v1/document-templates', {
    method: 'POST',
    headers: A(),
    body: JSON.stringify({
      kind: 'CONTRACT',
      name: 'Contrato do orçamento',
      content: textDoc(
        'Contrato de {{paciente.nome}}. Orçamento {{orcamento.numero}}, total {{orcamento.total}}, entrada {{orcamento.entrada}}, {{orcamento.parcelas}}. Itens: {{orcamento.itens}}.',
      ),
      professionalSignature: 'NONE',
      patientSignature: 'OPTIONAL',
    }),
  });
  check('modelo com variáveis do orçamento', template.status === 201, template.body);
  const templateId = dataOf(template).id as string;
  const anamnesisLike = await request('/api/v1/document-templates', {
    method: 'POST',
    headers: A(),
    body: JSON.stringify({ kind: 'CERTIFICATE', name: 'Atestado', content: textDoc('x'), professionalSignature: 'NONE', patientSignature: 'NONE' }),
  });
  const wrongKind = await request('/api/v1/document-settings', {
    method: 'PUT',
    headers: A(),
    body: JSON.stringify({ quoteContractTemplateId: dataOf(anamnesisLike).id }),
  });
  check('modelo que não é contrato é recusado', wrongKind.status === 422, wrongKind.body);

  const setTemplate = await request('/api/v1/document-settings', {
    method: 'PUT',
    headers: A(),
    body: JSON.stringify({ quoteContractTemplateId: templateId }),
  });
  check(
    'configura modelo (método do paciente preservado)',
    setTemplate.status === 200 &&
      dataOf(setTemplate).quoteContractTemplateId === templateId &&
      dataOf(setTemplate).quoteContractAuto === false &&
      typeof dataOf(setTemplate).patientSignatureMethod === 'string',
    setTemplate.body,
  );

  // Manual
  const manual = await request(`/api/v1/quotes/${q1}/contract`, { method: 'POST', headers: A() });
  check('manual gera contrato (201)', manual.status === 201 && dataOf(manual).created === true, manual.body);
  const docId = dataOf(manual).documentId as string;
  const again = await request(`/api/v1/quotes/${q1}/contract`, { method: 'POST', headers: A() });
  check('manual repetido devolve o mesmo (200)', again.status === 200 && dataOf(again).documentId === docId && dataOf(again).created === false, again.body);

  const doc = await request(`/api/v1/documents/${docId}`, { headers: A() });
  const rendered = JSON.stringify(dataOf(doc).content);
  check('documento ligado ao orçamento', dataOf(doc).quoteId === q1, doc.body);
  check('texto traz paciente', rendered.includes('Maria Contrato'));
  check('texto traz total', rendered.includes('R$') && rendered.includes('350,00'));
  check('texto traz entrada', rendered.includes('50,00'));
  check('texto traz parcelas', rendered.includes('3x de') && rendered.includes('10/12/2026'));
  check('texto traz itens', rendered.includes('26'));
  check('nenhuma variável sobrando', !rendered.includes('{{') && !rendered.includes('__________'), rendered);

  // Cancelado permite gerar de novo
  await request(`/api/v1/documents/${docId}/cancel`, {
    method: 'POST',
    headers: A(),
    body: JSON.stringify({ reason: 'Contrato emitido com erro' }),
  });
  const regen = await request(`/api/v1/quotes/${q1}/contract`, { method: 'POST', headers: A() });
  check('após cancelar, gera outro', regen.status === 201 && dataOf(regen).documentId !== docId, regen.body);

  // Orçamento não aprovado
  const draft = await request('/api/v1/quotes', {
    method: 'POST',
    headers: A(),
    body: JSON.stringify({ patientId, professionalId, items: [{ procedureId: res01?.id, toothCode: '11' }] }),
  });
  const notApproved = await request(`/api/v1/quotes/${dataOf(draft).id as string}/contract`, { method: 'POST', headers: A() });
  check('orçamento não aprovado = 422', notApproved.status === 422, notApproved.body);

  // Automático
  const auto = await request('/api/v1/document-settings', {
    method: 'PUT',
    headers: A(),
    body: JSON.stringify({ quoteContractAuto: true }),
  });
  check('liga automático', auto.status === 200 && dataOf(auto).quoteContractAuto === true && dataOf(auto).quoteContractTemplateId === templateId, auto.body);
  const q2 = await approvedQuote();
  const q2Docs = await contractsOf(q2);
  check('aprovar gera contrato sozinho', q2Docs.length === 1, q2Docs);
  const q2Manual = await request(`/api/v1/quotes/${q2}/contract`, { method: 'POST', headers: A() });
  check('manual depois do automático não duplica', q2Manual.status === 200 && dataOf(q2Manual).created === false, q2Manual.body);

  // Desliga: aprovar não gera
  await request('/api/v1/document-settings', { method: 'PUT', headers: A(), body: JSON.stringify({ quoteContractAuto: false }) });
  const q3 = await approvedQuote();
  check('automático desligado não gera', (await contractsOf(q3)).length === 0);

  // Modelo desativado
  await request('/api/v1/document-settings', { method: 'PUT', headers: A(), body: JSON.stringify({ quoteContractAuto: true }) });
  await request(`/api/v1/document-templates/${templateId}`, { method: 'PATCH', headers: A(), body: JSON.stringify({ active: false }) });
  const q4 = await approvedQuote();
  check('modelo desativado: aprovação segue, sem contrato', (await contractsOf(q4)).length === 0);
  const inactive = await request(`/api/v1/quotes/${q4}/contract`, { method: 'POST', headers: A() });
  check('manual com modelo desativado = 422', inactive.status === 422, inactive.body);

  // Permissões
  const clean = await request('/api/v1/document-settings', { method: 'PUT', headers: A(), body: JSON.stringify({}) });
  check('PUT vazio = 400', clean.status === 400, clean.body);

  server.close();
  if (failed) {
    console.error('\nSMOKE FALHOU');
    process.exit(1);
  }
  console.log('\nSMOKE OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
