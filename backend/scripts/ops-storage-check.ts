/**
 * Verifica o storage (S3/MinIO) com a configuração atual: gravar, ler, URL assinada de envio e de leitura,
 * acesso anônimo bloqueado e CORS para o domínio do frontend.
 * Uso:  pnpm ops:storage-check -- --origin https://app.seudominio.com.br
 */
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../src/shared/config/env.js';
import { S3ObjectStorageAdapter } from '../src/shared/storage/s3_object_storage.adapter.js';

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

type Row = { passo: string; ok: boolean; detalhe: string };
const rows: Row[] = [];
const add = (passo: string, ok: boolean, detalhe = '') => {
  rows.push({ passo, ok, detalhe });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${passo}${detalhe ? ` — ${detalhe}` : ''}`);
};

async function main() {
  const origin = argValue('--origin') ?? env.CORS_ORIGINS.split(',')[0]?.trim() ?? '';
  const adapter = new S3ObjectStorageAdapter({
    endpoint: env.STORAGE_ENDPOINT,
    bucket: env.STORAGE_BUCKET,
    region: env.STORAGE_REGION,
    accessKey: env.STORAGE_ACCESS_KEY,
    secretKey: env.STORAGE_SECRET_KEY,
  });
  const raw = new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: !env.STORAGE_ENDPOINT.includes('amazonaws.com'),
    credentials: { accessKeyId: env.STORAGE_ACCESS_KEY, secretAccessKey: env.STORAGE_SECRET_KEY },
  });
  const stamp = Date.now();
  const key = `_healthcheck/${stamp}.txt`;
  const keyPut = `_healthcheck/${stamp}-presigned.txt`;
  const body = Buffer.from(`clivra storage check ${stamp}`);

  console.log(`Endpoint: ${env.STORAGE_ENDPOINT} · bucket: ${env.STORAGE_BUCKET} · região: ${env.STORAGE_REGION}`);

  try {
    await adapter.putObject(key, body, 'text/plain');
    add('gravar objeto (credenciais e permissão de escrita)', true);
    const head = await adapter.headObject(key);
    add('consultar metadados', head?.sizeBytes === body.length, `${head?.sizeBytes ?? 'n/d'} bytes`);
    const read = await adapter.getObject(key);
    add('ler objeto de volta', read?.toString() === body.toString());

    const get = await adapter.presignGet(key, 60);
    const viaGet = await fetch(get.url);
    add('URL assinada de leitura', viaGet.ok && (await viaGet.text()) === body.toString(), `HTTP ${viaGet.status}`);

    const anon = await fetch(`${env.STORAGE_ENDPOINT.replace(/\/$/, '')}/${env.STORAGE_BUCKET}/${key}`);
    add('acesso anônimo ao arquivo é bloqueado (bucket privado)', anon.status === 403 || anon.status === 401, `HTTP ${anon.status}`);

    const put = await adapter.presignPut(keyPut, 'text/plain', 60);
    const viaPut = await fetch(put.url, { method: 'PUT', headers: put.headers, body });
    add('URL assinada de envio (upload direto do navegador)', viaPut.ok, `HTTP ${viaPut.status}`);

    if (origin) {
      const pre = await fetch(put.url, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'PUT',
          'Access-Control-Request-Headers': 'content-type',
        },
      });
      const allowed = pre.headers.get('access-control-allow-origin');
      add(`CORS libera o frontend (${origin})`, allowed === origin || allowed === '*', `allow-origin: ${allowed ?? 'ausente'}`);
    } else {
      add('CORS', false, 'informe --origin https://seu-frontend');
    }
  } catch (err) {
    add('operação com o storage', false, err instanceof Error ? err.message : String(err));
  } finally {
    for (const k of [key, keyPut]) {
      await raw.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: k })).catch(() => undefined);
    }
  }

  const failed = rows.filter((r) => !r.ok);
  console.log(
    failed.length === 0
      ? '\nOK: storage pronto.'
      : `\n${failed.length} verificação(ões) falharam — veja docs/runbooks/email-e-storage-producao.md`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

void main();
