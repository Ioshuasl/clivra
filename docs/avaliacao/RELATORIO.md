# Avaliação do Clivra para produção — 16/10/2026

Escopo: `pnpm tester` completo, teste de build, Playwright contra o frontend em **modo produção**
(`next build` + `next start`), varredura de **todas as telas** por papel (dono, recepção, dentista,
financeiro, ASB) e públicas, fluxos cronometrados com **latência Brasil→Europa simulada (210 ms de
ida e volta, cache frio)**, testes de falha forçada e revisão de Resend e S3.

Dados brutos: `docs/avaliacao/*.json`. Capturas (≈200, fora do Git): `docs/avaliacao/telas/`.
Scripts reexecutáveis: `audit/` (`npx playwright test -c audit/playwright.audit.config.ts`).

## 1. Veredito

**Pronto para um piloto fechado com poucas clínicas; ainda não para abrir ao público.**
A arquitetura, o isolamento entre clínicas e o desempenho do servidor estão sólidos. O que impede
abrir geral: lacunas de segurança de login, o `tester` ainda vermelho (por testes antigos, não por
defeito de produto confirmado), o lint do frontend quebrando o build padrão, e três pontos de UX que
um usuário leigo vai sentir no primeiro dia.

## 2. Resultados dos testes

| Verificação | Resultado |
|---|---|
| `tsc` backend e frontend | 0 erros |
| `arch:check` (dependências entre módulos) | limpo |
| Playwright em produção (75 testes) | 75/75 passaram (em rodadas separadas; 1 teste intermitente por ordem de execução: wizard do WhatsApp; outro, a criação de agendamento na agenda, oscila na rodada completa) |
| `pnpm tester` completo | 29 etapas verdes, 7 vermelhas (ver abaixo) |
| Build do backend (`tsc`) | OK em 15 s |
| Backend compilado em `NODE_ENV=production` | sobe; recusa subir sem KEK (correto); `/ready` confirma banco, Redis e storage; CORS só libera a origem configurada; cabeçalhos de segurança (HSTS, CSP, nosniff) presentes |
| Build do frontend | **falha por 49 erros de lint**; com `--no-lint` compila em 47 s |

**Vermelhos do `tester` (todos de testes automáticos, nenhum reproduzido como defeito de produto):**
`test:clinic` (smoke não liga a "agenda por cadeira" antes de criar cadeira), `test:clinical-notes`
(convida 4 papéis; o plano Essencial agora limita 2 usuários admin, como deve), `test:attachments`
(espera o nome antigo da ação de auditoria e outro limite de armazenamento), `test:billing-payables` e
`test:billing-reports` (datas fixas de agosto/setembro e ciclo de caixa desativado), `accept:billing`
(depende de parcela aberta do seed) e o Playwright dentro do `tester` (ordem de execução).

## 3. Bugs reais encontrados e corrigidos nesta rodada

| # | Gravidade | Problema | Correção |
|---|---|---|---|
| 1 | **Crítica** | Agendamento público em celular (360–414 px) ficava com 523 px de largura: página cortada e "Continuar" fora da tela. Direto na conversão de pacientes | `min-w-0` nos contêineres; verificado em 360/390/414 px |
| 2 | **Crítica** | Planos criados pelas migrações usavam as chaves `users`/`monthlyMessages`, mas o código lê `adminUsers`/`messagesMonth`: num banco novo (sem seed) o limite de usuários virava **ilimitado** | Migração `20261016000000_fix_plan_limit_keys` |
| 3 | Alta | Formulário de **orçamento** mostrava o código interno (UUID) do paciente depois de escolhê-lo | Cache de nomes já carregados (também aplicado a agenda e fila de espera) |
| 4 | Média | Busca de pacientes: o texto digitado voltava ao anterior | Efeito de sincronização com a URL corrigido |
| 5 | Média | API devolvia **500** para data impossível (`2999-13-45`) | Validação de data real |
| 6 | Média | API devolvia **500** para corpo acima do limite (deveria ser 413) | Tratamento de `entity.too.large` |
| 7 | Alta | Vários commits seus posteriores ao merge não estavam no backend novo (agenda por cadeira, ciclo de caixa desligado, agendamento público, seeds) | Reaportados |

## 4. Problemas abertos (decisão sua ou trabalho maior)

### Segurança
| Gravidade | Problema | Sugestão |
|---|---|---|
| **Alta** | **Qualquer pessoa tranca a conta de outra**: 5 senhas erradas bloqueiam o e-mail por 10 min, dobrando até 24 h. Com o e-mail do dono da clínica, um concorrente mantém o sistema inacessível | Bloqueio por e-mail + IP, desbloqueio por link de e-mail, ou CAPTCHA após as falhas |
| **Alta** | Senha mínima de **1 caractere** no esquema de cadastro (`min(1)`) | Mínimo 8–10 e lista de senhas comuns |
| Média | Limite de tentativas em memória por processo (some ao reiniciar e não vale com mais de uma réplica) | Mover para Redis antes de escalar |
| Média | Pagamento acima do saldo é aceito (excedente vira crédito; R$ 10 milhões passou) | Teto razoável e confirmação explícita na tela |
| Baixa | Frontend sem cabeçalhos de segurança (CSP, X-Frame-Options) | Configurar em `next.config.ts` ou no proxy do Easypanel |

O que **passou** nos ataques: isolamento entre clínicas (leitura, escrita, listagens, pagamento
cruzado e troca do cabeçalho de clínica), token ausente/adulterado, injeção de SQL no login, escalada
de papel, campos extras ignorados, valores negativos/zero/fracionários em pagamento, 6 cliques
simultâneos no mesmo pagamento (1 só criado), 5 agendamentos simultâneos no mesmo horário (1 só criado),
HTML/script em nomes (não executa), duplo clique em "Criar paciente" (1 cadastro).

### Resend e S3 (verificação de código; faltam chaves reais para testar de ponta a ponta)
- **E-mail só sai pelo Resend se `NODE_ENV=production` e houver `RESEND_API_KEY`**; sem a chave cai no SMTP de
  desenvolvimento **sem avisar**. Em produção, o código do paciente, convite e recuperação de senha sumiriam. Sugestão: falhar na inicialização se faltar a chave.
- Falha de envio só vai para o log: sem nova tentativa e sem aviso ao usuário. Só envia texto simples.
- `MAIL_FROM` precisa ser de domínio verificado no Resend (SPF/DKIM); `MAIL_DSN` é exigido mesmo usando Resend.
- **S3:** adaptador correto. No bucket de produção faltam: CORS para o domínio do frontend (o navegador envia o
  arquivo direto), bloqueio de acesso público, criptografia padrão e região `sa-east-1`. Nenhuma chave real foi usada nesta avaliação.

### Deploy
- `next build` padrão falha por 49 erros de lint: resolver ou rodar o lint como etapa separada do CI.
- Fora do ar até criar: Dockerfiles (API, worker, web), migração no deploy, KEK, backup com restauração testada, Sentry.

## 5. Desempenho (servidor na Europa, clientes no Brasil)

**Servidor** (25 chamadas por rota, sem rede): lista de pacientes p95 15 ms, agenda 21 ms, parcelas 26 ms,
dashboard 29 ms, `/clinic` 17 ms. Não é o gargalo.

**Navegação com 210 ms de latência (cache frio):**

| Etapa | Tempo |
|---|---|
| Título da tela aparece | ≈ 1,1 s em quase todas as telas (≈ 1,6 s em Assinatura e Atendimento) |
| Tela termina de carregar | 1,5 a 2,2 s |
| Chamadas de API por tela | 6 a 16 |
| Chamada mais lenta | ≈ 490 ms (2 idas e voltas + servidor) |

O tempo é quase todo **número de idas e voltas**, não processamento. Melhorias, em ordem de ganho:
1. **Hospedar o servidor mais perto** (região de São Paulo; hoje cada ida e volta custa ≈ 210 ms).
2. **Agrupar chamadas**: as telas disparam 7–16 requisições em paralelo; um endpoint "resumo da tela" cortaria várias idas.
3. **Não chamar o que o usuário não pode ver**: toda tela chama `GET /clinic/onboarding` mesmo para recepção, dentista, financeiro e ASB (erro 403 no console a cada página) e `GET /clinic` para financeiro.
4. **HTTP/2 e cache**: confirmar HTTP/2 no Easypanel e cache longo para os arquivos estáticos do Next.
5. `/app/assinatura` (870 ms local) e `/app/atendimento/:id` (266 ms local, 14 chamadas) são as mais pesadas.

**Fluxos cronometrados** (interações = cliques e digitações; local → Brasil/Europa):

| Fluxo | Interações | Local | BR→EU |
|---|---|---|---|
| Receber parcela em PIX | 2 | 1,2 s | 2,5 s |
| Início → relatório de faltas | 1 | 0,8 s | 2,0 s |
| Cadastrar paciente novo | 4 | 1,5 s | 3,1 s |
| Lançar despesa | 8 | 1,8 s | 3,2 s |
| Login até a tela inicial | — | 1,4 s | 0,7 s |
| Buscar paciente e abrir a ficha | 2 | 0,4 s | não concluiu em 5 s na simulação (inconclusivo) |

Os fluxos "agendar pelo botão", "criar orçamento" e "paciente agenda pelo link" não fecharam no script de
auditoria: o primeiro por um defeito de produto (item 6.1 abaixo), os outros por erro do meu roteiro (campo
"Dente" obrigatório; rótulo "Telefone / WhatsApp"). Os três passam nos testes de ponta a ponta.

## 6. Avaliação de design (UI) e usabilidade (UX)

### O que está bom
- Identidade visual **coerente e moderna** (bordô, bastante espaço em branco, tipografia limpa); menu lateral simples (7 itens + Configurações).
- **Início** responde "o que fazer hoje": cartões de números, atendimentos do dia, calendário e ações rápidas.
- **Detalhe do agendamento** com bloco "Próximo passo" (um botão principal) é exatamente o padrão que o leigo precisa.
- **Painel financeiro único** ("Hoje na clínica"): o que entra, o que sai e o que precisa de atenção, com "Receber/Pagar" em 1 clique.
- **Agendamento público** em passos curtos, com barra de progresso, mensagens de erro claras e checkboxes legíveis.
- Formulários com validação em português e dica de ajuda (ex.: busca por CNPJ); ficha com **salvamento automático**.
- Navegação 100% pelo teclado no login; página não quebra com zoom de 200%.

### O que atrapalha um usuário leigo (por prioridade)
| # | Problema | Efeito | Sugestão |
|---|---|---|---|
| 6.1 | **"Novo agendamento" sugere "agora" (ex.: 23:00) e o formulário não tem campo de data/hora** | Fora do expediente dá "Horário fora do expediente" e o usuário não sabe como corrigir | Campos de data e hora no formulário, com sugestão do próximo horário livre |
| 6.2 | **Sem internet, "Criar paciente" fica travado em "Salvando…" sem mensagem** | Usuário acha que salvou ou clica várias vezes | Aviso "Sem conexão" e botão que volta ao normal |
| 6.3 | Filtro de status em Orçamentos mostra **`__all__`**; ações da lista são só ícones sem texto | Termo técnico visível; leigo não sabe o que cada ícone faz | Trocar por "Todos" e dar rótulos/dicas aos ícones |
| 6.4 | Datas em formato `2026-10-19` (painel de receber, baixa de parcela, relatórios) enquanto o resto usa `19/10` | Inconsistência; brasileiro lê dd/mm/aaaa | Padronizar `dd/mm/aaaa` |
| 6.5 | **Agenda abre em "Semana" também no celular**, onde só cabem 2 colunas | Rolagem lateral para ver a semana | No celular abrir em "Dia" |
| 6.6 | Abrir a **Fila de espera** encolhe o calendário a ~3 linhas | Precisa rolar para ver a agenda | Painel lateral ou gaveta |
| 6.7 | "**Inativar paciente**" é botão vermelho cheio, no mesmo nível de "Agendar consulta" | Risco de clique errado | Botão secundário, com confirmação |
| 6.8 | **Orçamento** exige "Dente" e a mensagem diz "exige dente (FDI)" | Jargão que o leigo não conhece | "Informe o dente (ex.: 26)" |
| 6.9 | Rotas inexistentes mostram **404 em inglês**; "Paciente não encontrado" é um aviso sem botão de saída | Beco sem saída | Páginas de erro em português com "Voltar" |
| 6.10 | Esc não fecha o formulário "Novo paciente" | Usuário de teclado fica preso | Fechar com Esc |
| 6.11 | Termos que variam: "Aguardando" (Início) × "Agendado" (Agenda); "Falta" ambíguo | Confunde | Um vocabulário só ("Falta" → "Não compareceu") |
| 6.12 | **Celular:** títulos dos cartões e nomes de pacientes cortados no Início | Perde informação | Quebra de linha ou cartão em coluna única |
| 6.13 | Mensagem de erro do login em rosa claro sobre fundo claro (contraste baixo) | Pouco visível | Texto mais escuro |
| 6.14 | `/signup` e `/forgot-password` sem título principal | Leitor de tela não identifica a página | Adicionar `h1` |
| 6.15 | Atendimento: "passe o mouse no dente" | Não funciona em tablet/tela de toque | Texto neutro ("toque ou passe o mouse") |

Medições de acessibilidade (varredura automática, a confirmar caso a caso): texto menor que 12 px e contraste
abaixo do recomendado concentrados no painel financeiro (≈116 textos), agenda e configurações; campos sem
rótulo em Horários (17), Orçamentos (2) e Clínica (2); alvos de toque menores que 24 px na agenda (7) e no
odontograma (224, esperado).

## 7. Próximos passos sugeridos

1. **Antes de qualquer cliente:** corrigir o bloqueio de contas por terceiros e a senha mínima; configurar Resend (falhar se faltar a chave) e S3 (CORS, privado, criptografia); resolver o lint do build.
2. **Primeira semana:** itens 6.1 a 6.4 de UX (maior efeito para o leigo) e cortar chamadas desnecessárias de API.
3. **Antes de escalar:** servidor em São Paulo, limite de tentativas no Redis, Sentry e backup com restauração testada.
4. Manter `audit/` no CI de homologação para repetir esta avaliação a cada versão.
