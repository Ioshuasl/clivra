import PDFDocument from 'pdfkit';
import type { TiptapDoc, TiptapNode } from '../types/document/tiptap.types.js';

export type DocumentPdfInput = {
  clinicName: string;
  legalName: string | null;
  taxId: string | null;
  phone: string | null;
  addressLine: string | null;
  title: string;
  content: TiptapDoc;
  professionalName: string;
  professionalCro: string | null;
  patientName: string;
  /** Linhas de assinatura impressas ao final (papel). */
  professionalLine: boolean;
  patientLine: boolean;
  verificationCode: string;
  /** Carimbo impresso quando o dentista assina com certificado digital. */
  signature?: DocumentPdfSignature;
  /** Carimbo do aceite do paciente (assinatura eletrônica por link). */
  patientStamp?: DocumentPdfPatientStamp;
};

export type DocumentPdfPatientStamp = {
  signedAtLabel: string;
  methodLabel: string;
};

export type DocumentPdfSignature = {
  signerName: string;
  /** Data e hora da assinatura já formatadas no fuso da clínica. */
  signedAtLabel: string;
  certificateSubject: string;
};

type Align = 'left' | 'center' | 'right' | 'justify';

type Run = { text: string; bold: boolean; italic: boolean; underline: boolean };

const HEADING_SIZE: Record<number, number> = { 1: 16, 2: 14, 3: 12 };

function fontFor(run: Run): string {
  if (run.bold && run.italic) return 'Helvetica-BoldOblique';
  if (run.bold) return 'Helvetica-Bold';
  if (run.italic) return 'Helvetica-Oblique';
  return 'Helvetica';
}

function collectRuns(nodes: TiptapNode[] | undefined, force: Partial<Run> = {}): Run[] {
  const runs: Run[] = [];
  for (const node of nodes ?? []) {
    if (node.type === 'hardBreak') {
      runs.push({ text: '\n', bold: false, italic: false, underline: false });
    } else if (node.type === 'text' && node.text) {
      const marks = new Set((node.marks ?? []).map((m) => m.type));
      runs.push({
        text: node.text,
        bold: force.bold ?? marks.has('bold'),
        italic: marks.has('italic'),
        underline: marks.has('underline'),
      });
    } else if (node.content) {
      runs.push(...collectRuns(node.content, force));
    }
  }
  return runs;
}

function alignOf(node: TiptapNode): Align {
  const value = node.attrs?.textAlign;
  return value === 'center' || value === 'right' || value === 'justify' ? value : 'left';
}

function drawRuns(doc: PDFKit.PDFDocument, runs: Run[], size: number, align: Align, indent: number): void {
  if (runs.length === 0) {
    doc.fontSize(size).text(' ', { indent });
    return;
  }
  runs.forEach((run, index) => {
    doc
      .font(fontFor(run))
      .fontSize(size)
      .text(run.text, {
        continued: index < runs.length - 1,
        underline: run.underline,
        align,
        indent: index === 0 ? indent : 0,
      });
  });
  doc.font('Helvetica');
}

type Block = { doc: PDFKit.PDFDocument; depth: number };

function drawNode({ doc, depth }: Block, node: TiptapNode, listPrefix?: string): void {
  const indent = depth * 16;
  switch (node.type) {
    case 'paragraph': {
      const runs = collectRuns(node.content);
      if (listPrefix) runs.unshift({ text: listPrefix, bold: false, italic: false, underline: false });
      drawRuns(doc, runs, 11, alignOf(node), indent);
      doc.moveDown(0.4);
      return;
    }
    case 'heading': {
      const level = Number(node.attrs?.level ?? 1);
      drawRuns(doc, collectRuns(node.content, { bold: true }), HEADING_SIZE[level] ?? 12, alignOf(node), indent);
      doc.moveDown(0.5);
      return;
    }
    case 'bulletList':
    case 'orderedList': {
      const ordered = node.type === 'orderedList';
      (node.content ?? []).forEach((item, index) => {
        const prefix = ordered ? `${index + 1}. ` : '• ';
        (item.content ?? []).forEach((child, childIndex) => {
          const isList = child.type === 'bulletList' || child.type === 'orderedList';
          drawNode({ doc, depth: isList ? depth + 1 : depth }, child, childIndex === 0 && !isList ? prefix : undefined);
        });
      });
      return;
    }
    case 'blockquote': {
      for (const child of node.content ?? []) drawNode({ doc, depth: depth + 1 }, child);
      return;
    }
    case 'horizontalRule': {
      const y = doc.y + 4;
      doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke('#999999');
      doc.moveDown(0.8);
      return;
    }
    default:
      for (const child of node.content ?? []) drawNode({ doc, depth }, child);
  }
}

function professionalLines(input: DocumentPdfInput): string[] {
  const lines = [
    input.professionalName,
    input.professionalCro ? `CRO ${input.professionalCro}` : 'Cirurgião-dentista',
  ];
  if (input.signature) {
    lines.push(`Assinado digitalmente em ${input.signature.signedAtLabel}`);
    lines.push(`Certificado: ${input.signature.certificateSubject}`);
  }
  return lines;
}

function patientLines(input: DocumentPdfInput): string[] {
  const lines = [input.patientName, 'Paciente / responsável'];
  if (input.patientStamp) {
    lines.push(`Assinado eletronicamente em ${input.patientStamp.signedAtLabel}`);
    lines.push(input.patientStamp.methodLabel);
  }
  return lines;
}

function drawSignatureLine(doc: PDFKit.PDFDocument, x: number, y: number, width: number, lines: string[]): void {
  doc.moveTo(x, y).lineTo(x + width, y).stroke('#000000');
  doc.font('Helvetica').fontSize(9);
  lines.forEach((line, i) => doc.text(line, x, y + 4 + i * 11, { width, align: 'center' }));
}

/** PDF A4 com timbrado da clínica, corpo vindo do editor e linhas de assinatura quando o modelo pede. */
export function renderDocumentPdf(input: DocumentPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: input.title } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(14).text(input.clinicName, { align: 'center' });
    doc.font('Helvetica').fontSize(9);
    const sub = [input.legalName, input.taxId ? `CNPJ ${input.taxId}` : null].filter(Boolean).join(' · ');
    if (sub) doc.text(sub, { align: 'center' });
    const contact = [input.addressLine, input.phone].filter(Boolean).join(' · ');
    if (contact) doc.text(contact, { align: 'center' });
    const rule = doc.y + 6;
    doc.moveTo(doc.page.margins.left, rule).lineTo(doc.page.width - doc.page.margins.right, rule).stroke('#bbbbbb');
    doc.y = rule + 18;

    for (const node of input.content.content) drawNode({ doc, depth: 0 }, node);

    if (input.professionalLine || input.patientLine) {
      doc.moveDown(2);
      if (doc.y > doc.page.height - 150) doc.addPage();
      const y = doc.y + 30;
      const left = doc.page.margins.left;
      const total = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      if (input.professionalLine && input.patientLine) {
        const width = total / 2 - 20;
        drawSignatureLine(doc, left, y, width, professionalLines(input));
        drawSignatureLine(doc, left + total / 2 + 20, y, width, patientLines(input));
      } else if (input.professionalLine) {
        drawSignatureLine(doc, left + total / 4, y, total / 2, professionalLines(input));
      } else {
        drawSignatureLine(doc, left + total / 4, y, total / 2, patientLines(input));
      }
    }

    // O rodapé fica dentro da margem inferior; sem zerá-la o pdfkit abre uma página só para ele.
    const footerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const footerX = doc.page.margins.left;
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#777777')
      .text(`Código de verificação: ${input.verificationCode}`, footerX, doc.page.height - 40, {
        align: 'center',
        width: footerWidth,
      });
    doc.end();
  });
}

export function documentPdfStorageKey(tenantId: string, documentId: string): string {
  return `tenants/${tenantId}/documents/${documentId}/v1.pdf`;
}

export function documentSignedPdfStorageKey(tenantId: string, documentId: string): string {
  return `tenants/${tenantId}/documents/${documentId}/v1-signed.pdf`;
}

export function documentPatientPdfStorageKey(tenantId: string, documentId: string): string {
  return `tenants/${tenantId}/documents/${documentId}/v1-patient.pdf`;
}
