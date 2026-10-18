'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import { Settings2Icon } from 'lucide-react';
import { InboxConversationList } from '@/packages/messaging/components/Inbox/InboxConversationList';
import { InboxPatientPanel } from '@/packages/messaging/components/Inbox/InboxPatientPanel';
import { InboxThread } from '@/packages/messaging/components/Inbox/InboxThread';
import type { ConversationStatus } from '@/packages/messaging/enum/Conversation/ConversationStatusEnum';
import { messagingErrorMessage } from '@/packages/messaging/helpers/MessagingErrorMessage';
import { useConversationListHook } from '@/packages/messaging/hooks/Conversation/useConversationListHook';
import { useConversationMarkReadHook } from '@/packages/messaging/hooks/Conversation/useConversationMarkReadHook';
import { useConversationUpdateHook } from '@/packages/messaging/hooks/Conversation/useConversationUpdateHook';
import { useMessageListHook } from '@/packages/messaging/hooks/Message/useMessageListHook';
import { cn } from '@/shared/helpers/utils';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

export function InboxIndex() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const listQuery = useConversationListHook({
    q: deferredSearch.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 50,
  });
  const messagesQuery = useMessageListHook(selectedId);
  const markRead = useConversationMarkReadHook();
  const updateConversation = useConversationUpdateHook();

  const items = listQuery.data?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
      setMobileShowThread(false);
    }
  }, [items, selectedId]);

  useEffect(() => {
    if (!selected || selected.unreadCount <= 0 || markRead.isPending) return;
    void markRead.mutateAsync(selected.id);
  }, [selected?.id, selected?.unreadCount]);

  if (listQuery.isLoading) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col gap-4"
        aria-busy="true"
        aria-label="Carregando WhatsApp"
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="min-h-0 w-full flex-1 rounded-[14px]" />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription>{messagingErrorMessage(listQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-[1.375rem] font-semibold tracking-tight text-foreground">
            WhatsApp
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Conversas da clínica. Responda a qualquer momento — sem janela de 24h.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          nativeButton={false}
          render={<Link href="/app/configuracoes/whatsapp" prefetch={false} />}
        >
          <Settings2Icon className="size-3.5" aria-hidden />
          Configurar
        </Button>
      </header>

      <div
        className={cn(
          'grid min-h-0 flex-1 overflow-hidden rounded-[14px] border border-border bg-card shadow-clivra-sm',
          'md:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]',
          '2xl:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)_minmax(15rem,17rem)]',
        )}
      >
        <div
          className={cn(
            'min-h-0 min-w-0',
            mobileShowThread && selectedId ? 'hidden md:block' : 'block',
          )}
        >
          <InboxConversationList
            items={items}
            selectedId={selectedId}
            search={search}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onSelect={(id) => {
              setSelectedId(id);
              setMobileShowThread(true);
            }}
          />
        </div>

        <div
          className={cn(
            'min-h-0 min-w-0 border-border md:border-l',
            !mobileShowThread || !selectedId ? 'hidden md:block' : 'block',
          )}
        >
          <InboxThread
            conversation={selected}
            messages={messagesQuery.data?.items ?? []}
            isLoading={Boolean(selectedId) && messagesQuery.isLoading}
            resolvePending={updateConversation.isPending}
            onBack={() => setMobileShowThread(false)}
            onResolve={() => {
              if (!selectedId) return;
              void updateConversation.mutateAsync({
                conversationId: selectedId,
                conversationSchema: { status: 'CLOSED' },
              });
            }}
          />
        </div>

        <div className="hidden min-h-0 min-w-0 border-l border-border 2xl:block">
          <InboxPatientPanel conversation={selected} />
        </div>
      </div>
    </div>
  );
}
