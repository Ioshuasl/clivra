# Checklist de conformidade — Frontend

**Ler só no gate final.**

## Pré

- [ ] Package, entidade, tipo de tela e ops identificados
- [ ] Rules `frontend-*.md` usadas
- [ ] Shard UI lido só se necessário (máx. 1–2)
- [ ] Alinhado a `docs/16` / `docs/09`

## Por camada

- [ ] Types em `types/`; enums em `enum/`; sem `interfaces/`
- [ ] Data único HTTP; Service thin; Hook com Query/Mutation
- [ ] Index não chama API; modais condicionais
- [ ] Form vs FormDialog corretos
- [ ] Page só compõe
- [ ] UI composta de `@/shared/ui/*` (sem recriar primitivos; sem `@/components/ui`)
- [ ] Cores via tokens Clivra (`bg-background`, `bg-primary` burgundy, `text-foreground`, `border-border`, `muted`, `card`); sem hex/`bg-white`/`text-black` salvo justificativa (ex.: QR); sem resíduos Notion/Orius; `dark:` só se o token não cobrir; sem recriar `ThemeToggle`
- [ ] Tipografia Sora; ícones Lucide; viewport mental 1366×768 quando layout crítico

## Final

- [ ] Fluxo Page → … → Data intacto
- [ ] Package não importa outro package
- [ ] queryKeys invalidados após mutações
