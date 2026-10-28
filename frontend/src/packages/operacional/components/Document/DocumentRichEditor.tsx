'use client';

import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  Heading1Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  Redo2Icon,
  UnderlineIcon,
  Undo2Icon,
} from 'lucide-react';
import TextAlign from '@tiptap/extension-text-align';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { DOCUMENT_VARIABLES, QUOTE_DOCUMENT_VARIABLES } from '@/packages/operacional/helpers/DocumentVariables';
import type { DocumentRichEditorProps } from '@/packages/operacional/types/Document/DocumentFormDialogTypes';
import type { TiptapDoc } from '@/packages/operacional/types/Document/DocumentTypes';
import { cn } from '@/shared/helpers/utils';
import { Button } from '@/shared/ui/button';

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      className="cursor-pointer"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      heading: current.isActive('heading', { level: 1 }),
      bullet: current.isActive('bulletList'),
      ordered: current.isActive('orderedList'),
      left: current.isActive({ textAlign: 'left' }),
      center: current.isActive({ textAlign: 'center' }),
      right: current.isActive({ textAlign: 'right' }),
      justify: current.isActive({ textAlign: 'justify' }),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatação do texto"
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5"
    >
      <ToolbarButton label="Desfazer" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2Icon />
      </ToolbarButton>
      <ToolbarButton label="Refazer" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2Icon />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <ToolbarButton label="Negrito" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton label="Itálico" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Sublinhado"
        active={state.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <UnderlineIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Título"
        active={state.heading}
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
      >
        <Heading1Icon />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <ToolbarButton
        label="Lista com marcadores"
        active={state.bullet}
        onClick={() => chain().toggleBulletList().run()}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Lista numerada"
        active={state.ordered}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrderedIcon />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <ToolbarButton
        label="Alinhar à esquerda"
        active={state.left}
        onClick={() => chain().setTextAlign('left').run()}
      >
        <AlignLeftIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Centralizar"
        active={state.center}
        onClick={() => chain().setTextAlign('center').run()}
      >
        <AlignCenterIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Alinhar à direita"
        active={state.right}
        onClick={() => chain().setTextAlign('right').run()}
      >
        <AlignRightIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Justificar"
        active={state.justify}
        onClick={() => chain().setTextAlign('justify').run()}
      >
        <AlignJustifyIcon />
      </ToolbarButton>
    </div>
  );
}

/**
 * Editor de texto do documento (Tiptap). `initialValue` só vale na montagem:
 * para trocar o texto de fora, remonte o componente com outra `key`.
 */
export function DocumentRichEditor({
  initialValue,
  onChange,
  showVariables = false,
  showQuoteVariables = false,
  ariaLabel,
}: DocumentRichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
    content: initialValue,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': ariaLabel,
        class: cn(
          'min-h-56 px-4 py-3 text-sm leading-relaxed text-foreground outline-none',
          '[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold',
          '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
          '[&_p]:my-1 [&_p:empty]:min-h-5',
        ),
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as TiptapDoc),
  });

  if (!editor) {
    return <div className="h-64 animate-pulse rounded-lg border border-border bg-muted/40" />;
  }

  return (
    <div className="grid gap-2">
      <div className="overflow-hidden rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
      {showVariables ? (
        <div className="grid gap-1.5">
          <p className="text-xs text-muted-foreground">
            Clique para colocar no texto um dado que o sistema preenche sozinho ao emitir:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(showQuoteVariables ? [...DOCUMENT_VARIABLES, ...QUOTE_DOCUMENT_VARIABLES] : DOCUMENT_VARIABLES).map((variable) => (
              <Button
                key={variable.key}
                type="button"
                variant="outline"
                size="xs"
                className="cursor-pointer"
                onClick={() => editor.chain().focus().insertContent(`{{${variable.key}}}`).run()}
              >
                {variable.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
