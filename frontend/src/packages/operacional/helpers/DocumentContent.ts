import type { TiptapDoc, TiptapNode } from '@/packages/operacional/types/Document/DocumentTypes';

export const EMPTY_DOCUMENT: TiptapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

function hasText(nodes: TiptapNode[] | undefined): boolean {
  return (nodes ?? []).some(
    (node) => (node.type === 'text' && Boolean(node.text?.trim())) || hasText(node.content),
  );
}

/** O editor sempre devolve ao menos um parágrafo; "vazio" é não ter nenhuma letra escrita. */
export function documentHasText(doc: TiptapDoc | undefined): boolean {
  return doc?.type === 'doc' && hasText(doc.content);
}
