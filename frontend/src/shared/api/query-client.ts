import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
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
