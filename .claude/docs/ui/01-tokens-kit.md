# Tokens e kit visual — Clivra

**Status:** fonte operacional dos shards. Norma completa: [`01-clivra-design-system.md`](../../../01-clivra-design-system.md).

**Substitui:** Notion-like, Orius / Orius provisional, Geist, Inter, `#FF781F`, `#37352F`.

Não ler monólito; detalhe de telas nos outros shards.

## 1. Princípios

| Princípio | Aplicação |
|---|---|
| **Precisão clínica + tecnologia + simplicidade premium** | Software odontológico moderno, não dashboard genérico |
| **Clareza antes de decoração** | Sem gradientes excessivos, cards demais, sombras pesadas |
| **Uma ação primária por contexto** | 1 CTA primary por viewport/header |
| **Densidade controlada** | Compacto porém respirável (produto operacional) |
| **Progressive disclosure** | Não empilhar tudo na primeira view |
| **Estados explícitos** | Loading / empty / error / disabled / success |
| **Notebook first** | Validar em **1366×768** |
| **A11y** | Contraste; foco visível; estado nunca só por cor |

## 2. Tipografia

**Fonte oficial:** **Sora** (fallback `sans-serif`).

| Nível | Weight | Size | Line-height |
|---|---|---|---|
| Display | 600 | 32–40px | 1.15 |
| H1 (page title) | 600 | 28–32px | 1.2 |
| H2 | 600 | 22–26px | 1.25 |
| H3 | 600 | 18–20px | 1.3 |
| Body | 400 | 14px | 1.5 |
| Small / caption | 400 | 12–13px | 1.4 |
| Label | 500 | 12–13px | — |

Números financeiros/métricas: `font-weight: 600` + `tabular-nums`.

## 3. Paleta oficial

| Token Clivra | Hex | Uso |
|---|---|---|
| Burgundy (primary) | `#4A0F16` | identidade, sidebar app, CTA primary |
| Burgundy Secondary | `#7A2B36` | hover primary, secondary |
| Burgundy Light (accent) | `#A85B67` | destaque suave |
| Background | `#F7F5F2` | fundo principal (warm neutral) |
| Surface | `#FFFFFF` | cards, dialogs |
| Neutral (muted) | `#EAE6E1` | fundos neutros |
| Border | `#DDD8D3` | bordas / inputs |
| Text | `#1A1A1A` | texto principal |
| Text Secondary | `#6B6663` | texto secundário / placeholder |

### Semânticas (moderação)

| Estado | Hex |
|---|---|
| Success | `#2F8F63` |
| Warning | `#C98A32` |
| Danger | `#B94A55` |
| Info | `#587A9B` |

### Status de agenda (domínio)

Preservar significados clínicos do domínio; cores de status **nunca** sozinhas (ícone + texto). Preferir tokens semânticos / badges suaves — ver DS §26 e §40.

## 4. Tokens CSS (mapeamento shadcn/Tailwind)

Preferir classes semânticas (`bg-primary`, `text-foreground`, …). Evitar `bg-[#4A0F16]` se existir token.

```css
:root {
  --background: #F7F5F2;
  --foreground: #1A1A1A;

  --card: #FFFFFF;
  --card-foreground: #1A1A1A;

  --popover: #FFFFFF;
  --popover-foreground: #1A1A1A;

  --primary: #4A0F16;
  --primary-foreground: #FFFFFF;

  --secondary: #7A2B36;
  --secondary-foreground: #FFFFFF;

  --muted: #EAE6E1;
  --muted-foreground: #6B6663;

  --accent: #A85B67;
  --accent-foreground: #FFFFFF;

  --border: #DDD8D3;
  --input: #DDD8D3;
  --ring: #7A2B36;

  --destructive: #B94A55;
  --destructive-foreground: #FFFFFF;

  --success: #2F8F63;
  --warning: #C98A32;
  --info: #587A9B;

  --sidebar-background: #4A0F16;
  --sidebar-foreground: #FFFFFF;
  --sidebar-primary: #FFFFFF;
  --sidebar-primary-foreground: #4A0F16;
  --sidebar-accent: #7A2B36;
  --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: rgba(255, 255, 255, 0.12);
}
```

Adaptar nomes ao sistema de tokens já existente no `globals.css` — não duplicar sistemas.

## 5. Radius, sombra, espaçamento

### Radius

| Token | px | Uso |
|---|---|---|
| xs | 4 | — |
| sm | 6 | — |
| md | 8 | Button, Input |
| lg | 10 | — |
| xl | 14 | Card (~12–14), Dialog (~14–16) |
| 2xl | 16 | containers grandes |
| full | 9999 | Badge, Avatar |

Evitar pills em botões comuns.

### Sombras (discretas)

| Nível | Valor | Uso |
|---|---|---|
| sm | `0 1px 2px rgba(26,26,26,0.04)` | elevação leve |
| md | `0 4px 12px rgba(26,26,26,0.06)` | dropdown / popover |
| lg | `0 12px 32px rgba(26,26,26,0.10)` | dialog |

Cards comuns: **background + border**, sem sombra forte.

### Espaçamento

Escala: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64` (px). Evitar valores arbitrários (13, 17, 23…).

## 6. Kit base (`frontend/src/shared/ui`)

| Componente | Spec |
|---|---|
| Button primary | `bg-primary` / hover secondary burgundy; h ~40–44; radius-md 8 |
| Button outline | borda `border`, fundo surface, texto `foreground` |
| Button ghost | hover discreto |
| Button destructive | `destructive` — só ação destrutiva |
| Input | h 40–44, radius 8, border `border`, placeholder muted-foreground, focus ring burgundy |
| Card | surface + border, radius 12–14, sem sombra pesada |
| Dialog | radius 14–16; sombra md/lg |

Ícones: **Lucide** (16/18px; 20px em ações importantes).

Hierarquia: **1** CTA primary (burgundy) por contexto; secundárias outline/ghost/secondary; destrutivas com confirmação.

## 7. App shell (resumo)

- Sidebar app: fundo burgundy `#4A0F16`, texto branco, item ativo com secondary/indicador.
- Header: surface, border inferior, sem sombra pesada.
- Page Header: título + descrição curta + 1 ação primária.
- Conteúdo: background warm `#F7F5F2`; cards brancos.

Detalhe de anatomia: [02-anatomia-fluxos.md](02-anatomia-fluxos.md).

## 8. Onde vive o DS no código

- Tokens CSS: `frontend/src/app/globals.css`
- Componentes: `frontend/src/shared/ui/`
- Layout shell: `frontend/src/shared/layout/`
- Domínio: `packages/<area>/components/<Entidade>/`
- Norma visual completa: raiz `01-clivra-design-system.md`
