'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, CheckCircle2Icon, MessageCircleIcon, SendHorizontalIcon } from 'lucide-react';
import {
  CONVERSATION_STATUS_LABELS,
  type ConversationStatus,
} from '@/packages/messaging/enum/Conversation/ConversationStatusEnum';
import { useMessageSendHook } from '@/packages/messaging/hooks/Message/useMessageSendHook';
import type { ConversationSummary } from '@/packages/messaging/types/Conversation/ConversationTypes';
import type { InboxMessage } from '@/packages/messaging/types/Message/MessageTypes';
import { Can } from '@/shared/auth/Can';
import { cn } from '@/shared/helpers/utils';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Textarea } from '@/shared/ui/textarea';

type InboxThreadProps = {
  conversation: ConversationSummary | null;
  messages: InboxMessage[];
  isLoading: boolean;
  onResolve: () => void;
  onBack?: () => void;
  resolvePending: boolean;
};

function statusLabel(status: string): string {
  if (status in CONVERSATION_STATUS_LABELS) {
    return CONVERSATION_STATUS_LABELS[status as ConversationStatus];
  }
  return status;
}

function formatMessageTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (parts[0] ?? '?').slice(0, 2).toUpperCase();
}

export function InboxThread({
  conversation,
  messages,
  isLoading,
  onResolve,
  onBack,
  resolvePending,
}: InboxThreadProps) {
  const send = useMessageSendHook();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraft('');
  }, [conversation?.id]);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-3 bg-muted/30 px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted text-primary">
          <MessageCircleIcon className="size-6" strokeWidth={1.6} aria-hidden />
        </span>
        <div className="grid max-w-sm gap-1">
          <p className="text-[15px] font-semibold text-foreground">Selecione uma conversa</p>
          <p className="text-sm text-muted-foreground">
            Escolha um contato à esquerda para ler e responder pelo WhatsApp da clínica.
          </p>
        </div>
      </div>
    );
  }

  const title = conversation.contactName?.trim() || conversation.contactPhone;

  const onSend = async () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    await send.mutateAsync({
      conversationId: conversation.id,
      messageSchema: { text },
      idempotencyKey: crypto.randomUUID(),
    });
    setDraft('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/25">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2.5 sm:px-4">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer md:hidden"
            aria-label="Voltar para lista de conversas"
            onClick={onBack}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
        ) : null}

        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
          aria-hidden
        >
          {initials(title)}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-foreground">{title}</h2>
          <p className="truncate text-[12px] text-muted-foreground">{conversation.contactPhone}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">
            {statusLabel(conversation.status)}
          </Badge>
          {conversation.status !== 'CLOSED' ? (
            <Can permission="messaging.write">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="cursor-pointer"
                disabled={resolvePending}
                onClick={onResolve}
              >
                <CheckCircle2Icon className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">Resolver</span>
                <span className="sr-only sm:hidden">Resolver conversa</span>
              </Button>
            </Can>
          ) : null}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-4 sm:px-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando mensagens…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Ainda não há mensagens nesta conversa.
          </p>
        ) : (
          <ul className="grid gap-2" aria-label="Mensagens da conversa">
            {messages.map((message) => {
              const outbound = message.direction === 'OUTBOUND';
              return (
                <li
                  key={message.id}
                  className={cn('flex', outbound ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[min(85%,28rem)] rounded-2xl px-3 py-2 text-[14px] leading-snug shadow-clivra-sm',
                      outbound
                        ? 'rounded-br-md bg-success/20 text-foreground'
                        : 'rounded-bl-md border border-border bg-card text-foreground',
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.body?.trim() ||
                        (message.mediaKey ? '[Mídia]' : '[Sem conteúdo]')}
                    </p>
                    <p
                      className={cn(
                        'mt-1 text-right text-[10px] tabular-nums',
                        'text-muted-foreground',
                      )}
                    >
                      <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="shrink-0 border-t border-border bg-card p-3">
        <Can
          permission="messaging.write"
          fallback={
            <p className="text-sm text-muted-foreground">
              Você pode ler a conversa, mas não tem permissão para responder.
            </p>
          }
        >
          <div className="flex items-end gap-2">
            <label htmlFor="inbox-composer" className="sr-only">
              Escrever mensagem
            </label>
            <Textarea
              id="inbox-composer"
              placeholder="Escreva uma mensagem…"
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void onSend();
                }
              }}
              className="min-h-10 max-h-32 flex-1 resize-none py-2.5"
            />
            <Button
              type="button"
              size="icon"
              className="size-10 shrink-0 cursor-pointer"
              disabled={!draft.trim() || send.isPending}
              aria-label={send.isPending ? 'Enviando mensagem' : 'Enviar mensagem'}
              onClick={() => void onSend()}
            >
              <SendHorizontalIcon className="size-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Enter envia · Shift+Enter quebra linha
          </p>
        </Can>
      </div>
    </div>
  );
}
