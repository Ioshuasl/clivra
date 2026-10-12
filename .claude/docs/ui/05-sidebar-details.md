# Sidebar 360 e Details — Clivra

Norma: `docs/09` (atendimento, inbox) · `docs/16`.  
Visual: DS Clivra §42–§45 · [01-tokens-kit](01-tokens-kit.md).

A **Sidebar de página** é a coluna sticky à **direita** (~360px). Não confundir com a **sidebar global** do app (burgundy `#4A0F16` em `shared/layout`).

## 1. Anatomia

```
[ main flex-1 min-w-0 ]   [ aside ~360px ]
  conteúdo                 Card sticky (surface + border)
                           → navegação OU ações
```

```tsx
<div className="flex gap-4">
  <main className="flex min-w-0 flex-1 flex-col gap-4">{/* ... */}</main>
  <aside className="hidden w-[360px] shrink-0 lg:block">
    <div className="sticky top-4 z-10 max-h-[calc(100vh-2rem)] overflow-auto">
      <Card>{/* nav ou ações */}</Card>
    </div>
  </aside>
</div>
```

Regras: `aside` a partir de `lg`; sticky; um Card; main com `min-w-0`.  
Em telas menores: bloco inferior, Drawer ou seção recolhível — **nunca** esmagar o conteúdo principal.

## 2. Dois conteúdos (não misturar no mesmo Card)

| Conteúdo | Quando | Exemplo |
|---|---|---|
| **Navegação** | Form longo (seções) | Orçamento: itens → descontos → pagamento |
| **Ações** | Details / pós-registro | Paciente: agendar, enviar WhatsApp, novo orçamento |

Form = criar/editar. Details = visualizar + ações. Não misturar.

## 3. Details / perfil do paciente

- Breadcrumb discreto quando a hierarquia importar
- Coluna principal: dados + timeline / histórico
- Sidebar: ações contextuais + destrutivas com ConfirmDialog
- Sem edição “silenciosa” de dado clínico — evolução usa amend

## 4. Atendimento clínico (referência `docs/09` + DS §45)

Layout de foco clínico (preservar funcionalidades existentes):

```
Alertas clínicos (topo, sempre visíveis)
Odontograma | Plano de tratamento + evolução
Histórico / anexos
```

Alertas `CRITICAL` não são dispensáveis. Odontograma: alto contraste, legenda clara, cores só com significado clínico (DS §46).

## 5. Inbox WhatsApp

Três colunas: conversas | thread | painel do paciente (ficha + próximo agendamento).  
**Sem** bloqueio de janela Meta 24h (ADR-0016). Ver `docs/09` §4.3.
