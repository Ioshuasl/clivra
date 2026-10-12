
# Dúvidas e tomadas de decisão — comunicação

Quando houver **ambiguidade de produto, UX, escopo, piloto, LGPD, cobrança, comportamento de negócio** ou qualquer decisão que o usuário precise tomar antes (ou durante) a implementação: **perguntar** — e explicar no nível abaixo. Não improvisar; não esconder trade-offs atrás de jargão.

## Quando aplicar

- Listar decisões pendentes de sprint / epic / feature
- Pedir escolha entre alternativas (ex.: bloquear vs permitir; omitir vs 501)
- Explicar por que um corte de escopo importa
- Qualquer “em dúvida → perguntar” de `project-core.md`

**Não** aplicar esse formato a microdetalhes só de implementação (nome de arquivo, shape de DTO) — aí basta uma frase técnica. Se o detalhe técnico **muda o que o usuário ou a clínica vê/sente**, trate como decisão de produto.

## Formato obrigatório (por item)

Para **cada** dúvida/decisão, nesta ordem:

1. **Título curto** em linguagem de negócio (o que a clínica/dono vê).
2. **O que é** — 1–3 frases em português claro, **sem jargão** (ou jargão só com tradução imediata).
3. **Por que importa** — impacto no dia a dia, risco, compliance ou conversão.
4. **Opções** — cada alternativa em bullet, com consequência prática (“se escolher A, acontece X”).
5. **Default sugerido** (se docs/checklist já tiverem) — deixar explícito o que vale se o usuário não responder.
6. **O que acontece se não decidir** — bloqueio, atraso, expectativa errada, retrabalho.

Vários itens → numerar ou tabular; terminar com **resumo em uma frase** (S7 vs S8, Must vs Should, etc.) quando a lista for longa.

## Tom e estilo

- Leigo-friendly: preferir “quando o trial acaba” a `SUSPENDED`/`EXPIRED` (códigos só entre parênteses se necessário).
- Mostrar **trade-off** (ex.: rigor comercial × não abandonar o paciente).
- Separar **decisão de negócio** de **detalhe técnico** (marcar o técnico como “o time fecha no PR”).
- Não exigir resposta em formato de ticket; perguntas claras e fechadas quando der (“bloquear reply: sim/não?”).

## Proibido

- Listar só IDs de RF / cortes sem explicar o efeito na clínica
- Assumir a resposta e implementar sem perguntar quando a rule do projeto manda perguntar
- Jargão solto (SSE, 501, polling, ZIP LGPD) sem dizer o que o usuário percebe
- Empilhar 10 decisões sem priorizar o que **bloqueia** o próximo passo

## Exemplo (mínimo)

**Reply no WhatsApp com a conta vencida**  
Quando o trial acaba ou a clínica para de pagar, o sistema fica só para leitura.  
**Dúvida:** a recepção ainda pode **responder** o paciente na inbox?  
- Bloquear (padrão): não responde pelo sistema até reativar.  
- Permitir só reply: não “abandona” o paciente no meio da conversa.  
É escolha comercial × cuidado com o paciente.
