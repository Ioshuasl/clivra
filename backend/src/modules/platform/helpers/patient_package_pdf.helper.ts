import PDFDocument from 'pdfkit';
import type { PatientPackageSnapshot } from '../types/data_subject_request/data_subject_request.types.js';

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function textOf(value: unknown): string {
  if (value == null) return '—';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }
  return JSON.stringify(value);
}

export type PatientPackagePdfInput = {
  clinicName: string;
  legalName: string | null;
  taxId: string | null;
  phone: string | null;
  addressLine: string | null;
  generatedAt: string;
  snapshot: PatientPackageSnapshot;
};

/** PDF legível do titular — sem nome de arquivo com diagnóstico. */
export function renderPatientPackagePdf(input: PatientPackagePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const patient = input.snapshot.patient;
    doc.fontSize(16).text(input.clinicName);
    if (input.legalName) doc.fontSize(10).text(input.legalName);
    if (input.taxId) doc.fontSize(10).text(`CNPJ ${input.taxId}`);
    if (input.addressLine) doc.fontSize(10).text(input.addressLine);
    if (input.phone) doc.fontSize(10).text(input.phone);

    doc.moveDown();
    doc.fontSize(14).text('Pacote do titular (LGPD)');
    doc.fontSize(9).text(`Gerado em ${input.generatedAt}`);
    doc.fontSize(8).text('Documento confidencial. Destinado ao titular ou ao controlador.');

    doc.moveDown();
    doc.fontSize(12).text('Cadastro');
    doc.fontSize(10).text(`Nome: ${textOf(patient.name)}`);
    doc.text(`Ficha: ${textOf(patient.code)}`);
    doc.text(`CPF: ${textOf(patient.cpf)}`);
    doc.text(`Nascimento: ${textOf(patient.birthDate)}`);
    doc.text(`Telefone: ${textOf(patient.phonePrimary)}`);
    doc.text(`E-mail: ${textOf(patient.email)}`);

    doc.moveDown();
    doc.fontSize(12).text('Agenda');
    if (input.snapshot.appointments.length === 0) {
      doc.fontSize(10).text('Nenhum agendamento.');
    }
    for (const row of input.snapshot.appointments.slice(0, 40)) {
      doc.fontSize(10).text(`${textOf(row.startsAt)} — ${textOf(row.status)}`);
    }

    doc.moveDown();
    doc.fontSize(12).text('Financeiro resumido');
    if (input.snapshot.receivables.length === 0) {
      doc.fontSize(10).text('Nenhum título.');
    }
    for (const row of input.snapshot.receivables.slice(0, 40)) {
      doc
        .fontSize(10)
        .text(`${textOf(row.status)} — ${brl(Number(row.totalCents))} (${textOf(row.createdAt)})`);
    }

    doc.moveDown();
    doc.fontSize(12).text('Evoluções');
    if (input.snapshot.clinicalNotes.length === 0) {
      doc.fontSize(10).text('Nenhuma evolução.');
    }
    for (const row of input.snapshot.clinicalNotes.slice(0, 30)) {
      const body = row.decryptError ? '[falha ao descriptografar]' : textOf(row.content);
      doc.fontSize(10).text(`${textOf(row.signedAt)} (v${textOf(row.version)})`);
      doc.fontSize(9).text(body.slice(0, 1200));
      doc.moveDown(0.4);
    }

    doc.moveDown();
    doc.fontSize(12).text('Anexos');
    if (input.snapshot.attachments.length === 0) {
      doc.fontSize(10).text('Nenhum anexo.');
    }
    for (const row of input.snapshot.attachments) {
      doc.fontSize(10).text(`${row.id} — ${row.fileName} (${row.mimeType})`);
    }

    doc.end();
  });
}
