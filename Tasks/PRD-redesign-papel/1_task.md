# Tarefa 1.0: Fundação Visual — Fontes e CSS Variables

<critical>Ler o arquivo C:\Users\silvi\.claude\plans\abstract-booping-newt.md antes de implementar. Sua tarefa será invalidada se você não ler esse arquivo.</critical>

## Visão Geral

Estabelece a base visual de toda a aplicação. Troca a paleta de cores estilo Apple (azul/branco/cinza) por tons quentes que imitam papel envelhecido e tinta, e carrega as fontes que reforçam a metáfora de escrita à mão.

Sem essa tarefa, nenhuma das tarefas seguintes terá as variáveis CSS corretas para trabalhar.

<requirements>
- Adicionar Google Fonts (Caveat + Lato) no `frontend/index.html` via `<link>` no `<head>`
- Substituir TODAS as CSS variables de cor em `frontend/src/index.css` pela paleta de papel:
  - `--color-bg: #f0ebe0` (papel envelhecido)
  - `--color-surface: #faf8f2` (folha limpa)
  - `--color-primary: #2c4a6e` (tinta azul escura)
  - `--color-primary-hover: #1e3550`
  - `--color-text: #2a2418` (tinta escura)
  - `--color-text-secondary: #7a6e5f` (tinta desbotada)
  - `--color-danger: #8b2635` (tinta vermelha)
  - `--color-danger-hover: #6e1e2a`
  - `--color-border: #d4c8b0` (linhas de pautado)
  - `--color-focus-ring: rgba(44, 74, 110, 0.35)`
  - `--color-error-bg: #fdf0f0`
  - `--color-error-text: #6e1e2a`
  - `--color-line: #d4c8b0` (nova variável para linhas pautadas)
- Substituir a família de fontes:
  - `--font-family: "Lato", "Inter", system-ui, sans-serif` (corpo)
  - `--font-family-display: "Caveat", cursive` (nova variável para títulos/labels)
- Substituir as variáveis de sombra por tons quentes de marrom:
  - `--shadow-sm: 0 1px 3px rgba(42, 36, 24, 0.08)`
  - `--shadow-md: 0 4px 12px rgba(42, 36, 24, 0.12)`
  - `--shadow-lg: 0 8px 24px rgba(42, 36, 24, 0.18)`
- A fonte `body` no `index.css` deve usar `var(--font-family)`
- Nenhum componente TSX precisa ser alterado nesta tarefa
</requirements>

## Subtarefas

- [ ] 1.1 Adicionar `<link>` do Google Fonts (Caveat + Lato) no `<head>` do `frontend/index.html`
- [ ] 1.2 Substituir todas as variáveis de cor no `:root` de `frontend/src/index.css`
- [ ] 1.3 Adicionar variáveis novas: `--color-line`, `--font-family-display`
- [ ] 1.4 Substituir variáveis de sombra (`--shadow-sm`, `--shadow-md`, `--shadow-lg`) por tons marrons
- [ ] 1.5 Atualizar `--font-family` para incluir Lato como primeira opção
- [ ] 1.6 Verificar que `body` usa `var(--font-family)` (já estava — confirmar que continua correto)

## Detalhes de Implementação

### Google Fonts — `frontend/index.html`

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet">
```

Inserir antes do `</head>`, depois do `<meta viewport>`.

### Referência de cores — paleta completa

| Variável | Valor | Significado |
|----------|-------|-------------|
| `--color-bg` | `#f0ebe0` | Fundo geral — papel envelhecido |
| `--color-surface` | `#faf8f2` | Superfície de cards — folha limpa |
| `--color-primary` | `#2c4a6e` | Ação principal — tinta azul |
| `--color-text` | `#2a2418` | Texto principal — tinta escura |
| `--color-text-secondary` | `#7a6e5f` | Texto secundário — tinta desbotada |
| `--color-danger` | `#8b2635` | Ações destrutivas — tinta vermelha |
| `--color-border` | `#d4c8b0` | Bordas e linhas — pautado |
| `--color-line` | `#d4c8b0` | Linhas horizontais do pautado |

## Critérios de Sucesso

- Ao abrir o app com `npm run dev`, o fundo aparece em tom de papel (`#f0ebe0`) em vez de cinza claro
- Botões e links aparecem em azul escuro (`#2c4a6e`) em vez de azul Apple
- Textos aparecem em marrom escuro em vez de preto puro
- A fonte Lato é carregada (verificável na aba Network do DevTools, filtro por "font")
- A fonte Caveat é carregada (será usada nas tarefas seguintes)
- Nenhum teste unitário quebra: `npm run test` passa sem erros

## Testes da Tarefa

- [ ] **Regressão unitária**: rodar `npm run test` no diretório `frontend/` — todos os testes devem continuar passando (esta tarefa não altera TSX, apenas CSS/HTML)
- [ ] **Checklist visual manual** (abrir no browser via `npm run dev`):
  - [ ] Fundo do body é `#f0ebe0` (bege/papel)
  - [ ] Cor do texto principal é escura com tom marrom
  - [ ] Botão "Adicionar" aparece em azul escuro
  - [ ] Network DevTools: fontes `Caveat` e `Lato` carregadas com status 200
  - [ ] Nenhum texto aparece em azul `#0071e3` (paleta antiga eliminada)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- [frontend/index.html](frontend/index.html) — adicionar link Google Fonts
- [frontend/src/index.css](frontend/src/index.css) — substituir variáveis CSS
