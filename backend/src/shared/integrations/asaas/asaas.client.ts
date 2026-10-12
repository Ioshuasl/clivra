import { asaasConfig, type AsaasConfig } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const TIMEOUT_MS = 60_000;
const MAX_GET_ATTEMPTS = 3;

export type AsaasErrorKind = 'http' | 'timeout' | 'network';

/** Falha na chamada ao Asaas. `inconclusive` = a operação pode ter sido processada (timeout/rede). */
export class AsaasRequestError extends Error {
  constructor(
    readonly kind: AsaasErrorKind,
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AsaasRequestError';
  }

  get inconclusive(): boolean {
    return this.kind !== 'http' || (this.status !== undefined && this.status >= 500);
  }
}

export type AsaasRequestOptions = {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cliente HTTP mínimo do Asaas. Segredos só no header `access_token`; nada do corpo vai para log.
 * Retry automático só em GET (idempotente): POST/PUT/DELETE nunca são repetidos às cegas.
 */
export class AsaasClient {
  constructor(private readonly cfg: AsaasConfig = asaasConfig()) {}

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: AsaasRequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${this.cfg.baseUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const attempts = method === 'GET' ? MAX_GET_ATTEMPTS : 1;

    for (let attempt = 1; ; attempt += 1) {
      const startedAt = Date.now();
      try {
        const res = await fetch(url, {
          method,
          headers: {
            access_token: this.cfg.apiKey,
            'User-Agent': this.cfg.userAgent,
            'Content-Type': 'application/json',
          },
          // GET com body responde 403 no Asaas.
          body: method === 'GET' || options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        logger.info(
          { asaas: { method, path, status: res.status, ms: Date.now() - startedAt, attempt } },
          'asaas_request',
        );

        if (res.ok) {
          const text = await res.text();
          return (text ? JSON.parse(text) : {}) as T;
        }

        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < attempts) {
          await sleep(500 * 2 ** (attempt - 1));
          continue;
        }
        const parsed = (await res.json().catch(() => null)) as {
          errors?: Array<{ code?: string; description?: string }>;
        } | null;
        const first = parsed?.errors?.[0];
        throw new AsaasRequestError(
          'http',
          first?.description ?? `Asaas respondeu ${res.status}`,
          res.status,
          first?.code,
        );
      } catch (err) {
        if (err instanceof AsaasRequestError) throw err;
        const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
        if (method === 'GET' && attempt < attempts) {
          await sleep(500 * 2 ** (attempt - 1));
          continue;
        }
        throw new AsaasRequestError(
          timedOut ? 'timeout' : 'network',
          timedOut ? 'Timeout ao chamar o Asaas.' : 'Falha de rede ao chamar o Asaas.',
        );
      }
    }
  }
}
