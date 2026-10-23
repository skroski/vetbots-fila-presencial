# DESIGN — VetBots Visual Identity

A linguagem visual de VetBots: profissional, acessível, humanizada. Tons neutros com acentos precisos, formas suaves, texturas naturais.

Este documento cobre **somente a camada visual** (cores, tipografia, componentes, espaçamento, motion). Comportamento, API e dados não fazem parte dele.

## Implementação

Os tokens deste documento viram os temas `vetbots` (claro) e `vetbots-dark` do **daisyUI 4** em `web/tailwind.config.ts`; os componentes usam as classes do daisyUI (`btn`, `card`, `badge`, `input`, `select`, `modal`, `tabs`, `stats`, `toggle`, `progress`). A cor da marca (`primary`/`accent`) é sobrescrita em tempo de execução a partir de Ajustes (`shared/cores.js`). `.badge-soft-*` (fundo da cor a 10% + texto) fica em `web/src/index.css`. A TV força o tema escuro.

## Identidade

- **Profissional** — confiável, limpa, sólida
- **Acessível** — amigável, humanizada, sem frieza clínica
- **Respirável** — espaçosa, generosa, nunca apertada
- **Precisa** — cores deliberadas, hierarquia clara, intencional

## Paleta de cores

### Primárias

| Token | HSLA | Uso |
|---|---|---|
| Primary (verde ciano) | `hsla(190, 67%, 40%, 1)` | Ações, navegação, CTA, estados interativos (botões primários, links, hover, checkmarks, highlights) |
| Secondary (marrom) | `hsla(28, 65%, 35%, 1)` | Destaques, acentos, badges, chamadas secundárias |

### Neutras (light mode)

| Nome | HSLA | Uso |
|---|---|---|
| Base-100 | `hsla(190, 15%, 100%, 1)` | Fundo principal, cards (branco com tint ciano) |
| Base-200 | `hsla(190, 10%, 97%, 1)` | Backgrounds secundários |
| Base-300 | `hsla(190, 10%, 92%, 1)` | Borders, dividers |
| Base-Content | `hsla(190, 15%, 12%, 1)` | Texto principal |
| Neutral | `hsla(190, 5%, 25%, 1)` | Texto secundário, disabled |

### Status

| Status | HSLA | Uso |
|---|---|---|
| Success | `hsla(142, 60%, 35%, 1)` | Estados positivos, confirmações |
| Warning | `hsla(28, 70%, 45%, 1)` | Avisos, atenção, pendências |
| Error | `hsla(0, 75%, 45%, 1)` | Erros, crítico, bloqueado |
| Info | `hsla(190, 70%, 45%, 1)` | Informações, dicas, notificações |

### Dark mode

| Token | HSLA | Uso |
|---|---|---|
| Base-100 (Dark) | `hsla(28, 15%, 15%, 1)` | Background principal escuro |
| Base-200 (Dark) | `hsla(28, 15%, 12%, 1)` | Backgrounds secundários |
| Base-Content (Dark) | `hsla(28, 10%, 95%, 1)` | Texto principal |
| Primary (Dark) | `hsla(190, 60%, 50%, 1)` | Primary brightened |
| Secondary (Dark) | `hsla(28, 60%, 50%, 1)` | Secondary brightened |

Princípio: manter a coesão da marca — mesmo no dark mode, preservar a identidade verde/marrom. Contraste WCAG AA (4.5:1 para texto).

## Tipografia

1. **Títulos: Plus Jakarta Sans** — h1–h6, `.card-title` e utilitárias (`.font-title`, `.title`, `.display`). Pesos carregados: 500, 600, 700, 800. Declarada **uma só vez** (sem `@import` duplicado).
2. **Corpo: Arial / Helvetica / system-ui** — `Arial, Helvetica, system-ui, -apple-system, sans-serif`. Corpo, tabelas, formulários, botões, menus.

| Nível | Tamanho | Peso | Line-height |
|---|---|---|---|
| H1 (Display) | 32px | 700 | 1.2 |
| H2 (Heading) | 26px | 600 | 1.3 |
| H3 (Subheading) | 20px | 600 | 1.3 |
| Body | 14px | 400 | 1.6 |
| Label / Small | 12px | 500 | 1.5 |
| Caption | 12px | 400 | 1.4 |

Princípios: line-height generoso (mín. 1.6 no body); respirabilidade; hierarquia por peso, não só por cor; **evitar UPPERCASE e tracking-widest** (reservar para siglas); testar contra `#2d2420` (Dark Warm) e `#ede8e0` (Light Warm).

## Componentes

- **Botão primário** — fundo Primary, texto `hsla(190,100%,98%,1)`, padding 16px 24px, altura mín. 48px, radius 8px. Hover: opacity .9 · Active: scale-95 · Disabled: grayscale + opacity .5.
- **Botão secundário** — fundo Base-200, texto Primary, borda 1px Primary, mesmo padding/radius.
- **Cards** — fundo Base-100, padding 24px (nunca menor), radius 8px, borda 1px Base-300, sombra `0 4px 20px rgba(46,50,48,.06)`, gap mín. 16px. Cards respiram.
- **Inputs** — fundo Base-100, borda 1px Base-300, radius 4px, padding 12px 16px, focus ring 4px Primary a 20%, placeholder Neutral a 60%. Erro: borda Error + ring error/10 · Sucesso: borda Success · Disabled: grayscale, opacity 50%, `not-allowed`.
- **Modais** — backdrop preto 40%, fundo Base-100, radius 8px, sombra `0 20px 40px rgba(46,50,48,.15)`, padding 32px, botão fechar com hover Primary/10.
- **Badges** — Default Base-200 + Base-Content; Success/Warning/Error: fundo cor/10 + texto cor; Primary: fundo Primary. Radius 8px (pills/dots `rounded-full`), padding 4px 12px.

## Espaçamento e layout

Escala: 4 · 8 · 12 · 16 (cards/seções) · 24 (cards generosos) · 32 (modais) · 48 (página).
Desktop 1280 (2–4 colunas) · Tablet 768 (2) · Mobile 375 (1). Gutter mín. 16px; padding mín. 16px mobile / 24px+ desktop.

## Elevação

Prefira separação tonal a sombras agressivas. Soft `0 4px 20px rgba(46,50,48,.06)` · Medium `0 8px 30px rgba(46,50,48,.10)` · Strong `0 20px 40px rgba(46,50,48,.15)`. Bordas de baixa opacidade no lugar de sombras quando couber.

## Motion

Sutil (200–300ms), easing `ease-in-out` / `cubic-bezier(0.4,0,0.2,1)`, movimento comunica feedback. Hover 200ms · Click 150ms · Transition 300ms · Load 400ms. Respeitar `prefers-reduced-motion`.

## Imagem e ícones

Fotografia calorosa, natural, humana (pets reais, momentos autênticos); evitar estoque clínico e cores saturadas. Ícones: **Lucide**, 16/20/24px, traço 2px, herdam a cor do texto ou Primary/Secondary, mín. 4px de distância do texto.

## Responsivo

Mobile first (375px). Alvos de toque mín. 48×48px. Corpo nunca abaixo de 14px. Espaçamento cresce com a tela (16px → 24px).

## Checklist

- [ ] Cores da paleta aprovada, sem hardcode
- [ ] Toda ação assíncrona tem loading + sucesso/erro visível; nenhum mock em produção
- [ ] Skeleton durante o load; empty-state só quando realmente vazio
- [ ] Hierarquia tipográfica (H1/H2/H3/Body/Label)
- [ ] Espaçamento da escala, com respiro
- [ ] Hover/focus/active definidos
- [ ] Sombras suaves
- [ ] Radius máx. 8px (só círculos/pills usam `rounded-full`)
- [ ] Contraste WCAG AA, alvos de 48px
- [ ] Testado em light e dark
- [ ] Testado em mobile/tablet/desktop

Versão 1.0 · Abril de 2026 · Documento oficial de marca e design.
