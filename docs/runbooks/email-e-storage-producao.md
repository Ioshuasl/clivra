# Runbook — E-mail (Resend) e arquivos (S3) em produção

Objetivo: deixar o envio de e-mail e o armazenamento de arquivos prontos **antes** do primeiro cliente.
O sistema **recusa subir** em `NODE_ENV=production` se algo estiver com cara de desenvolvimento
(ver "Trava de configuração" no fim). Cada seção termina com um comando que prova que funciona.

## 1. E-mail com Resend

O que depende de e-mail: **código de confirmação do paciente** no agendamento público, convite de
usuários, recuperação de senha e avisos de privacidade. Sem e-mail, o paciente não consegue agendar online.

### Passo a passo
1. Crie a conta em resend.com e vá em **Domains → Add Domain**. Use um subdomínio do cliente/produto
   (ex.: `mail.seudominio.com.br`), região **South America (São Paulo)** se disponível.
2. No DNS do domínio, crie os registros que o Resend mostrar: **SPF** (TXT), **DKIM** (3 CNAME/TXT) e,
   recomendado, **DMARC** (`_dmarc` TXT `v=DMARC1; p=none; rua=mailto:voce@seudominio.com.br`).
   Aguarde o domínio ficar **Verified**.
3. Em **API Keys → Create**, permissão **Sending access** restrita a esse domínio. Guarde a chave (aparece uma vez).
4. No Easypanel (serviço da API **e** do worker), defina:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `RESEND_API_KEY` | a chave criada (começa com `re_`) |
| `MAIL_FROM` | `Clivra <nao-responda@mail.seudominio.com.br>` (domínio verificado) |

`MAIL_DSN` não é mais necessário em produção.

### Teste
```bash
pnpm ops:email-test -- --to voce@seudominio.com.br
```
Esperado: `OK: Resend aceitou o envio`. Se o Resend recusar, o comando mostra o motivo exato
(domínio não verificado, chave sem permissão, remetente fora do domínio).

### Comportamento do sistema
- Envio com **tempo limite de 10 s** e **até 3 tentativas** (esperas de 0,4 s e 1,5 s) em erro de rede, 429 e 5xx.
- Se todas falharem, o erro vai para o log (`email_send_failed`) e o fluxo do usuário **não é interrompido**
  (por segurança, "esqueci minha senha" responde igual para e-mails existentes e inexistentes).
  Configure um **alerta** (Sentry/log) para `email_send_failed`.
- Antes de ir ao ar, envie um teste para **Gmail, Outlook e um e-mail corporativo** e confira se caiu no spam.

## 2. Arquivos com S3 (AWS)

O que depende de storage: anexos clínicos (radiografias, fotos), recibos e orçamentos em PDF, exportação
de dados (LGPD) e miniaturas. O navegador envia o arquivo **direto** ao S3 por URL assinada.

### Passo a passo
1. Crie um bucket **privado** em **sa-east-1 (São Paulo)** (dados de pacientes brasileiros; menor latência para o cliente).
   Nome sugerido: `clivra-prod-arquivos`.
2. **Block all public access**: ligado (as 4 opções).
3. **Default encryption**: SSE-S3 (AES-256) ou SSE-KMS. **Versioning**: recomendado (permite recuperar arquivo apagado por engano).
4. **CORS** do bucket (troque pelo endereço real do frontend):
```json
[
  {
    "AllowedOrigins": ["https://app.seudominio.com.br"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```
5. Crie um **usuário IAM exclusivo** (sem acesso ao console) com esta política mínima:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::clivra-prod-arquivos/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": "arn:aws:s3:::clivra-prod-arquivos"
    }
  ]
}
```
6. Gere a chave de acesso desse usuário e defina no Easypanel (API **e** worker):

| Variável | Valor |
|---|---|
| `STORAGE_ENDPOINT` | `https://s3.sa-east-1.amazonaws.com` |
| `STORAGE_REGION` | `sa-east-1` |
| `STORAGE_BUCKET` | `clivra-prod-arquivos` |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | chaves do usuário IAM |

### Teste
```bash
pnpm ops:storage-check -- --origin https://app.seudominio.com.br
```
Verifica: gravar/ler, URL assinada de leitura e de envio, **acesso anônimo bloqueado** e **CORS** do frontend.
Esperado: `OK: storage pronto.` (o teste apaga os arquivos que cria, na pasta `_healthcheck/`).

### Recomendações
- **Backup/retenção:** ligar versioning e uma regra de ciclo de vida para apagar versões antigas após 90 dias.
- **Custo:** o armazenamento é cobrado por GB; o plano Essencial limita a 5 GB por clínica.
- **Segurança:** nunca coloque a chave de acesso no repositório; troque-a a cada 90 dias (ver `credencial-vazada.md`).

## 3. Outras variáveis obrigatórias do deploy (resumo)

| Variável | Observação |
|---|---|
| `NODE_ENV=production` | liga a trava de configuração e o limite de tentativas de login |
| `APP_PUBLIC_URL` | endereço público do frontend (`https://…`) |
| `CORS_ORIGINS` | só origens `https://` do frontend |
| `TRUST_PROXY=1` | atrás do proxy do Easypanel (para ler o IP real do usuário) |
| `KEK_LOCAL_BASE64` | chave de criptografia dos dados clínicos — **guarde cópia segura; sem ela o prontuário não abre** |
| `DATABASE_URL` / `DATABASE_MIGRATION_URL` | papéis `app_user` (sem BYPASSRLS) e `app_migrator` |
| `REDIS_URL` | fila, limite de tentativas de login e cache |

## 4. Trava de configuração (o que impede subir errado)

Com `NODE_ENV=production`, a API e o worker **não iniciam** se: faltar `RESEND_API_KEY`; `MAIL_FROM` não for
um e-mail válido (ou terminar em `@localhost`); `STORAGE_ENDPOINT` não for `https` ou apontar para localhost;
as chaves do storage forem `minioadmin`; `APP_PUBLIC_URL` ou `CORS_ORIGINS` não forem `https`; ou
`MESSAGING_PROVIDER=fake`. A mensagem de erro lista tudo que falta.

Para ensaiar o build de produção **na sua máquina** (sem esses serviços), use `SKIP_PRODUCTION_CHECKS=1`.
**Nunca** defina isso no Easypanel.
