import { createHash } from 'node:crypto';
import type { TiptapDoc, TiptapNode } from '../../types/document/tiptap.types.js';

/** Campos automáticos que o usuário pode inserir no texto como `{{chave}}`. */
export const DOCUMENT_VARIABLE_KEYS = [
  'paciente.nome',
  'paciente.cpf',
  'paciente.data_nascimento',
  'clinica.nome',
  'clinica.cnpj',
  'profissional.nome',
  'profissional.cro',
  'data.hoje',
  'data.hoje_extenso',
  'orcamento.numero',
  'orcamento.total',
  'orcamento.entrada',
  'orcamento.parcelas',
  'orcamento.itens',
] as const;

export type DocumentVariableKey = (typeof DOCUMENT_VARIABLE_KEYS)[number];

export type DocumentVariables = Partial<Record<DocumentVariableKey, string | null>>;

const PLACEHOLDER = /\{\{\s*([a-z_.]+)\s*\}\}/g;
const BLANK = '__________';

const KNOWN = new Set<string>(DOCUMENT_VARIABLE_KEYS);

function walk(nodes: TiptapNode[], visit: (node: TiptapNode) => void): void {
  for (const node of nodes) {
    visit(node);
    if (node.content) walk(node.content, visit);
  }
}

/** Chaves `{{...}}` usadas no conteúdo que não existem na lista de campos automáticos. */
export function findUnknownVariables(doc: TiptapDoc): string[] {
  const unknown = new Set<string>();
  walk(doc.content, (node) => {
    if (node.type !== 'text' || !node.text) return;
    for (const match of node.text.matchAll(PLACEHOLDER)) {
      const key = match[1];
      if (key && !KNOWN.has(key)) unknown.add(key);
    }
  });
  return [...unknown];
}

function renderNode(node: TiptapNode, variables: DocumentVariables): TiptapNode {
  const next: TiptapNode = { ...node };
  if (node.type === 'text' && node.text) {
    next.text = node.text.replace(PLACEHOLDER, (_all, key: string) => {
      const value = variables[key as DocumentVariableKey];
      return value && value.length > 0 ? value : BLANK;
    });
  }
  if (node.content) next.content = node.content.map((child) => renderNode(child, variables));
  return next;
}

/** Substitui os campos automáticos; valor ausente vira linha em branco para preencher à mão. */
export function renderDocumentContent(doc: TiptapDoc, variables: DocumentVariables): TiptapDoc {
  return { type: 'doc', content: doc.content.map((node) => renderNode(node, variables)) };
}

export function hashDocumentContent(doc: TiptapDoc): string {
  return createHash('sha256').update(JSON.stringify(doc)).digest('hex');
}
