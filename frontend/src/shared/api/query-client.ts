import { MutationCache, QueryClient } from '@tanstack/react-query';
import { friendlyApiError, friendlyApiErrorTitle } from '@/shared/helpers/FriendlyApiError';
import '@/shared/helpers/ZodPtBr';
import { toast } from '@/shared/ui/toast';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** `true` quando a própria tela já explica o erro (ex.: erro no campo) e o aviso seria repetido. */
      silent?: boolean;
    };
  }
}

export function createQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      // Toda ação que falha na API vira um aviso (toast) em português, em qualquer tela.
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.silent) return;
        toast.add({
          type: 'error',
          title: friendlyApiErrorTitle(error),
          description: friendlyApiError(error),
          timeout: 8000,
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: 1,
        // Sem internet a consulta falha na hora (com mensagem) em vez de ficar carregando para sempre.
        networkMode: 'always',
      },
      mutations: {
        // Sem internet o salvar falha na hora (com mensagem) em vez de ficar "Salvando…" pausado.
        networkMode: 'always',
      },
    },
  });
}
