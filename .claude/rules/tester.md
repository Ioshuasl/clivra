
# Tester — regra de execução

## Quando aplicar

- Usuário pede **skill tester**, `pnpm tester`, suíte completa, regressão ou aceite.
- Agente vai validar mudanças com testes automatizados além de um smoke pontual.

## Obrigatório

1. Ler `.claude/skills/tester/SKILL.md` e seguir o fluxo (stack → tunnel? → seed → suite → relatório).
2. Preferir `pnpm tester` / scripts em `.claude/skills/tester/scripts/`.
3. **Sempre** Ensure-Stack antes dos testes; **sempre** `pnpm db:seed` com health OK (salvo `-SkipSeed` pedido pelo usuário).
4. Rodar a suíte em modo **consolidado** (não parar no primeiro erro); entregar tabela pass/fail.
5. Tunnel **localtunnel** (FE `:3001` + API `:3333`) **somente** se houver gatilho (flag, webhook/URL pública necessária, ou pedido explícito). Se ambíguo → perguntar.
6. Não expor tokens/credenciais de `.env` no relatório; credenciais seed já documentadas em `backend/tests/lib/Credentials.ps1` podem ser citadas como e-mail de teste.

## Proibido

- Abrir tunnel “por precaução” sem gatilho.
- Pular Docker/API/FE unhealthy e rodar e2e/aceite mesmo assim.
- Inventar novos aceites curl fora de `backend/tests/` sem pedido.
- Commitar `.claude/skills/tester/.run/`.

## Relatório mínimo no chat

Stack · tunnel (off|URLs) · seed · tabela por fase · blocos vermelhos.
