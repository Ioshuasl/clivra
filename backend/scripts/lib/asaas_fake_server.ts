import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

export type FakePayment = {
  id: string;
  customer: string;
  subscription: string | null;
  status: string;
  value: number;
  dueDate: string;
  billingType: string;
  invoiceUrl: string;
  bankSlipUrl: string;
  deleted: boolean;
  externalReference: string | null;
};

export type FakeSubscription = {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  status: string;
  externalReference: string | null;
  deleted: boolean;
};

export type FakeRequest = { method: string; path: string; body: Record<string, unknown> | null };

type Fault = { remaining: number; mode: 'http500' | 'drop' };

/**
 * Asaas fake para os smokes (sem rede). Reproduz só o contrato usado pela integração:
 * customers, subscriptions (+ payments), checkouts, pixQrCode e identificationField.
 */
export class AsaasFakeServer {
  readonly apiKey = '$aact_hmlg_smoke_key_0123456789';
  readonly customers = new Map<string, { id: string; name: string; externalReference: string | null; cpfCnpj: string; mobilePhone: string | null }>();
  readonly subscriptions = new Map<string, FakeSubscription>();
  readonly payments = new Map<string, FakePayment>();
  readonly checkouts = new Map<string, Record<string, unknown>>();
  readonly requests: FakeRequest[] = [];
  private seq = 0;
  /** Ids do Asaas real são únicos; o salt evita colisão com vínculos de execuções anteriores no banco. */
  private readonly salt = randomUUID().slice(0, 6);
  private server: Server | undefined;
  private fault: { match: RegExp; state: Fault } | undefined;

  async start(): Promise<string> {
    this.server = createServer((req, res) => {
      void this.handle(req, res);
    });
    await new Promise<void>((resolve) => this.server?.listen(0, '127.0.0.1', resolve));
    const addr = this.server.address();
    if (!addr || typeof addr === 'string') throw new Error('fake asaas sem porta');
    return `http://127.0.0.1:${addr.port}`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this.server) return resolve();
      this.server.closeAllConnections();
      this.server.close(() => resolve());
    });
  }

  /** Falha as próximas `count` chamadas "METHOD /caminho" que casarem. `drop` processa e não responde. */
  injectFault(match: RegExp, mode: Fault['mode'], count = 1): void {
    this.fault = { match, state: { remaining: count, mode } };
  }

  setPayment(id: string, patch: Partial<FakePayment>): FakePayment {
    const payment = this.payments.get(id);
    if (!payment) throw new Error(`fake payment ${id} inexistente`);
    Object.assign(payment, patch);
    return payment;
  }

  addPayment(subscriptionId: string, input: { dueDate: string; status?: string }): FakePayment {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) throw new Error(`fake subscription ${subscriptionId} inexistente`);
    return this.newPayment(sub, input.dueDate, input.status ?? 'PENDING');
  }

  paymentsOf(subscriptionId: string): FakePayment[] {
    return [...this.payments.values()].filter((p) => p.subscription === subscriptionId);
  }

  subscriptionsOf(externalReference: string): FakeSubscription[] {
    return [...this.subscriptions.values()].filter((s) => s.externalReference === externalReference);
  }

  count(method: string, pathPrefix: string): number {
    return this.requests.filter((r) => r.method === method && r.path.startsWith(pathPrefix)).length;
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.salt}${String(this.seq).padStart(4, '0')}`;
  }

  private newPayment(sub: FakeSubscription, dueDate: string, status: string): FakePayment {
    const id = this.nextId('pay');
    const payment: FakePayment = {
      id,
      customer: sub.customer,
      subscription: sub.id,
      status,
      value: sub.value,
      dueDate,
      billingType: sub.billingType,
      invoiceUrl: `https://fake.asaas.test/i/${id}`,
      bankSlipUrl: `https://fake.asaas.test/b/${id}`,
      deleted: false,
      externalReference: sub.externalReference,
    };
    this.payments.set(id, payment);
    return payment;
  }

  private async readBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    return text ? (JSON.parse(text) as Record<string, unknown>) : null;
  }

  private send(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  private list<T>(data: T[]): unknown {
    return { object: 'list', hasMore: false, totalCount: data.length, limit: 100, offset: 0, data };
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://fake');
    const method = req.method ?? 'GET';
    const path = url.pathname.replace(/^\/v3/, '');
    const body = await this.readBody(req);
    this.requests.push({ method, path, body });

    if (req.headers.access_token !== this.apiKey) {
      return this.send(res, 401, {
        errors: [{ code: 'invalid_access_token', description: 'A chave de API fornecida é inválida' }],
      });
    }

    let dropAfter = false;
    if (this.fault && this.fault.state.remaining > 0 && this.fault.match.test(`${method} ${path}`)) {
      this.fault.state.remaining -= 1;
      if (this.fault.state.mode === 'http500') {
        return this.send(res, 500, { errors: [{ code: 'internal', description: 'falha injetada' }] });
      }
      dropAfter = true;
    }

    const result = this.route(method, path, url.searchParams, body);
    if (dropAfter) {
      res.socket?.destroy();
      return;
    }
    this.send(res, result.status, result.body);
  }

  private route(
    method: string,
    path: string,
    query: URLSearchParams,
    body: Record<string, unknown> | null,
  ): { status: number; body: unknown } {
    const notFound = { status: 404, body: { errors: [{ code: 'not_found', description: 'Não encontrado' }] } };
    let m: RegExpMatchArray | null;

    if (method === 'GET' && path === '/customers') {
      const ref = query.get('externalReference');
      const rows = [...this.customers.values()].filter((c) => !ref || c.externalReference === ref);
      return { status: 200, body: this.list(rows) };
    }
    if (method === 'POST' && path === '/customers') {
      const id = this.nextId('cus');
      const row = {
        id,
        name: String(body?.name ?? ''),
        externalReference: (body?.externalReference as string | undefined) ?? null,
        cpfCnpj: String(body?.cpfCnpj ?? ''),
        mobilePhone: (body?.mobilePhone as string | undefined) ?? null,
      };
      this.customers.set(id, row);
      return { status: 200, body: { object: 'customer', ...row } };
    }
    if ((m = path.match(/^\/customers\/([^/]+)$/))) {
      const customer = this.customers.get(m[1]);
      if (!customer) return notFound;
      if (method === 'PUT') {
        if (typeof body?.mobilePhone === 'string') customer.mobilePhone = body.mobilePhone;
        return { status: 200, body: { object: 'customer', ...customer } };
      }
      if (method === 'GET') return { status: 200, body: { object: 'customer', ...customer } };
    }
    if (method === 'GET' && path === '/subscriptions') {
      const customer = query.get('customer');
      const ref = query.get('externalReference');
      const rows = [...this.subscriptions.values()].filter(
        (s) => !s.deleted && (!customer || s.customer === customer) && (!ref || s.externalReference === ref),
      );
      return { status: 200, body: this.list(rows) };
    }
    if (method === 'POST' && path === '/subscriptions') {
      const id = this.nextId('sub');
      const sub: FakeSubscription = {
        id,
        customer: String(body?.customer),
        billingType: String(body?.billingType),
        value: Number(body?.value),
        nextDueDate: String(body?.nextDueDate),
        cycle: String(body?.cycle),
        status: 'ACTIVE',
        externalReference: (body?.externalReference as string | undefined) ?? null,
        deleted: false,
      };
      this.subscriptions.set(id, sub);
      this.newPayment(sub, sub.nextDueDate, 'PENDING');
      return { status: 200, body: { object: 'subscription', ...sub } };
    }
    if ((m = path.match(/^\/subscriptions\/([^/]+)\/payments$/)) && method === 'GET') {
      const rows = this.paymentsOf(m[1]).filter((p) => !p.deleted);
      return { status: 200, body: this.list(rows) };
    }
    if ((m = path.match(/^\/subscriptions\/([^/]+)$/))) {
      const sub = this.subscriptions.get(m[1]);
      if (!sub) return notFound;
      if (method === 'GET') return { status: 200, body: { object: 'subscription', ...sub } };
      if (method === 'PUT') {
        if (typeof body?.value === 'number') sub.value = body.value;
        return { status: 200, body: { object: 'subscription', ...sub } };
      }
      if (method === 'DELETE') {
        sub.deleted = true;
        for (const p of this.paymentsOf(sub.id)) {
          if (p.status === 'PENDING' || p.status === 'OVERDUE') p.deleted = true;
        }
        return { status: 200, body: { deleted: true, id: sub.id } };
      }
    }
    if (method === 'POST' && path === '/checkouts') {
      // Regra real do Asaas: `customer` no checkout exige telefone cadastrado no cliente.
      const customer = this.customers.get(String(body?.customer));
      if (body?.customer && !customer?.mobilePhone) {
        return { status: 400, body: { errors: [{ code: 'invalid_object', description: 'O campo phone deve existir para o customer informado.' }] } };
      }
      const id = randomUUID();
      this.checkouts.set(id, body ?? {});
      return { status: 200, body: { id, link: `https://fake.asaas.test/checkoutSession/show?id=${id}` } };
    }
    if ((m = path.match(/^\/payments\/([^/]+)\/pixQrCode$/)) && method === 'GET') {
      if (!this.payments.has(m[1])) return notFound;
      return {
        status: 200,
        body: {
          success: true,
          encodedImage: Buffer.from(`qr:${m[1]}`).toString('base64'),
          payload: `00020126fake${m[1]}`,
          expirationDate: '2099-12-31 23:59:59',
        },
      };
    }
    if ((m = path.match(/^\/payments\/([^/]+)\/identificationField$/)) && method === 'GET') {
      if (!this.payments.has(m[1])) return notFound;
      return { status: 200, body: { identificationField: `34191.79001 ${m[1]}`, barCode: '0000' } };
    }
    if ((m = path.match(/^\/payments\/([^/]+)$/)) && method === 'GET') {
      const payment = this.payments.get(m[1]);
      return payment ? { status: 200, body: { object: 'payment', ...payment } } : notFound;
    }
    return notFound;
  }
}
