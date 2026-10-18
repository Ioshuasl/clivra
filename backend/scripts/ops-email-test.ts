/**
 * Verifica o envio de e-mail com a configuração atual (.env / variáveis do Easypanel).
 * Uso:  pnpm ops:email-test -- --to voce@seudominio.com.br
 * Em produção usa o Resend (e mostra o motivo exato se ele recusar: domínio não verificado, chave errada…).
 */
import { env } from '../src/shared/config/env.js';
import { ResendEmailAdapter } from '../src/shared/integrations/email/resend.adapter.js';
import { getEmailProvider } from '../src/shared/integrations/email/index.js';

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const to = argValue('--to');
  if (!to) {
    console.error('Informe o destinatário: pnpm ops:email-test -- --to voce@seudominio.com.br');
    process.exit(2);
  }
  const message = {
    to,
    subject: 'Clivra — teste de envio de e-mail',
    text: `Se você recebeu esta mensagem, o envio de e-mail do Clivra está funcionando.\n\nAmbiente: ${env.NODE_ENV}\nRemetente: ${env.MAIL_FROM}`,
  };

  console.log(`Ambiente: ${env.NODE_ENV} · remetente: ${env.MAIL_FROM}`);
  if (env.NODE_ENV === 'production' && env.RESEND_API_KEY) {
    const resend = new ResendEmailAdapter(env.RESEND_API_KEY);
    const out = await resend.sendStrict(message);
    console.log(`OK: Resend aceitou o envio (id ${out.id ?? 'n/d'}). Confira a caixa de entrada e o spam de ${to}.`);
    return;
  }
  console.log(
    env.NODE_ENV === 'production'
      ? 'ATENÇÃO: RESEND_API_KEY ausente — usando SMTP de desenvolvimento.'
      : 'Fora de production o envio usa SMTP (Mailpit em http://localhost:8025).',
  );
  await getEmailProvider().send(message);
  console.log('Enviado pelo provedor SMTP configurado.');
}

main().catch((err: unknown) => {
  console.error('FALHA no envio:', err instanceof Error ? err.message : err);
  process.exit(1);
});
