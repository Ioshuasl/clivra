import type { ReactNode } from 'react';
import type { DocumentNode } from '@/packages/public/types/Document/DocumentSignatureTypes';

type Align = 'left' | 'center' | 'right' | 'justify';

function alignOf(node: DocumentNode): Align {
  const value = node.attrs?.textAlign;
  return value === 'center' || value === 'right' || value === 'justify' ? value : 'left';
}

const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

function renderInline(node: DocumentNode, key: number): ReactNode {
  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type !== 'text') return renderChildren(node.content, key);
  const marks = new Set((node.marks ?? []).map((mark) => mark.type));
  let content: ReactNode = node.text;
  if (marks.has('bold')) content = <strong>{content}</strong>;
  if (marks.has('italic')) content = <em>{content}</em>;
  if (marks.has('underline')) content = <u>{content}</u>;
  return <span key={key}>{content}</span>;
}

function renderChildren(nodes: DocumentNode[] | undefined, key: number): ReactNode {
  return <span key={key}>{(nodes ?? []).map((child, index) => renderInline(child, index))}</span>;
}

function renderBlock(node: DocumentNode, key: number): ReactNode {
  switch (node.type) {
    case 'paragraph':
      return (
        <p key={key} className={`min-h-5 ${ALIGN_CLASS[alignOf(node)]}`}>
          {(node.content ?? []).map((child, index) => renderInline(child, index))}
        </p>
      );
    case 'heading':
      return (
        <h2 key={key} className={`text-lg font-semibold ${ALIGN_CLASS[alignOf(node)]}`}>
          {(node.content ?? []).map((child, index) => renderInline(child, index))}
        </h2>
      );
    case 'bulletList':
      return (
        <ul key={key} className="list-disc pl-6">
          {(node.content ?? []).map((item, index) => renderBlock(item, index))}
        </ul>
      );
    case 'orderedList':
      return (
        <ol key={key} className="list-decimal pl-6">
          {(node.content ?? []).map((item, index) => renderBlock(item, index))}
        </ol>
      );
    case 'listItem':
      return <li key={key}>{(node.content ?? []).map((child, index) => renderBlock(child, index))}</li>;
    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-2 border-border pl-3 text-muted-foreground">
          {(node.content ?? []).map((child, index) => renderBlock(child, index))}
        </blockquote>
      );
    case 'horizontalRule':
      return <hr key={key} className="border-border" />;
    default:
      return <div key={key}>{(node.content ?? []).map((child, index) => renderBlock(child, index))}</div>;
  }
}

/** Mostra o texto do documento só para leitura (sem editor), a partir do JSON salvo na emissão. */
export function DocumentReadOnly({ nodes }: { nodes: DocumentNode[] }) {
  return (
    <div className="grid gap-2 text-sm leading-relaxed text-foreground">
      {nodes.map((node, index) => renderBlock(node, index))}
    </div>
  );
}
