import type { ApiResponse } from '@repo/contracts';
import { isApiError } from '@repo/contracts';
import { tokenStore } from '@/shared/auth/token-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type RequestOptions = RequestInit & {
  tenantId?: string;
  skipAuth?: boolean;
  /** Interno: já renovamos a sessão e repetimos esta chamada uma vez. */
  retried?: boolean;
};

type Envelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

class ApiClient {
  private refreshing: Promise<string | null> | null = null;

  async request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const envelope = await this.requestEnvelope<T>(path, init);
    return envelope.data;
  }

  async requestEnvelope<T>(path: string, init: RequestOptions = {}): Promise<Envelope<T>> {
    const { tenantId, skipAuth, retried, headers, ...rest } = init;
    const activeTenant = tenantId ?? tokenStore.getTenantId();
    const token = skipAuth ? null : tokenStore.getAccessToken();

    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/v1${path}`, {
        ...rest,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(activeTenant ? { 'X-Tenant-Id': activeTenant } : {}),
          ...(headers ?? {}),
        },
      });
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[api] sem conexão com ${API_URL} — confirme se o backend está rodando (pnpm dev:api).`);
      }
      throw new ApiClientError(
        'NETWORK_ERROR',
        'Sem conexão com o servidor. Verifique sua internet e tente novamente — nada foi salvo.',
        0,
      );
    }

    if (res.status === 401 && !skipAuth && !retried && !path.startsWith('/auth/refresh')) {
      const refreshed = await (this.refreshing ??= this.refresh().finally(() => {
        this.refreshing = null;
      }));
      if (refreshed) {
        return this.requestEnvelope<T>(path, { ...init, retried: true });
      }
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new ApiClientError(
        'INVALID_RESPONSE',
        res.status === 404
          ? `Endpoint não encontrado (${path}). Confirme se a API está atualizada e reiniciada.`
          : `A API retornou uma resposta inválida (HTTP ${res.status}).`,
        res.status,
      );
    }

    const body = (await res.json()) as ApiResponse<T> & { meta?: Record<string, unknown> };

    if (!res.ok || isApiError(body)) {
      if (isApiError(body)) {
        throw new ApiClientError(
          body.error.code,
          body.error.message,
          res.status,
          body.error.details,
        );
      }
      throw new ApiClientError('HTTP_ERROR', `HTTP ${res.status}`, res.status);
    }

    return {
      data: body.data,
      meta: body.meta,
    };
  }

  async refresh(): Promise<string | null> {
    try {
      const data = await this.request<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
        skipAuth: true,
      });
      tokenStore.setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      tokenStore.clear();
      return null;
    }
  }
}

export const apiClient = new ApiClient();
