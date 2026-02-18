# Tarefa 2.0: Fundo, Layout e Header

<critical>Ler o arquivo C:\Users\silvi\.claude\plans\abstract-booping-newt.md antes de implementar. Sua tarefa será invalidada se você não ler esse arquivo.</critical>

## Visão Geral

Transforma a estrutura visual principal da aplicação em um caderno de papel. O fundo ganha linhas horizontais pautadas e uma margem vertical vermelha. O header passa a ter o título "To-Do List" escrito em fonte manuscrita (Caveat), e o botão de logout recebe estilo de post-it vermelho.

**Depende da Tarefa 1.0** (variáveis `--color-line`, `--font-family-display` e paleta de papel devem existir).

<requirements>
- O `body` deve ter fundo com linhas horizontais pautadas usando `repeating-linear-gradient` espaçadas a cada 28px
- A área principal (`.app`) deve exibir uma linha vertical vermelha à esquerda (margem de caderno), simulada com `border-left` ou pseudo-elemento
- O título `.app-title` deve usar `var(--font-family-display)` (Caveat), tamanho grande (~3rem), peso 700
- O título deve ter uma linha decorativa abaixo (como a linha do caderno separando o cabeçalho do conteúdo)
- O `.logout-button` deve ter aparência de post-it vermelho pequeno: fundo avermelhado suave, bordas retas, sombra leve de papel, hover mais saturado
- O `.app-header` deve manter o layout atual (título centralizado, logout à direita) — apenas a estética muda
- O loading spinner deve ser substituído por um elemento que remeta a "lápis girando" (pode ser um emoji ✏️ ou SVG simples girando)
- Nenhum componente TSX precisa ser alterado nesta tarefa (apenas CSS)
</requirements>

## Subtarefas

- [ ] 2.1 Adicionar `repeating-linear-gradient` no `body` em `frontend/src/index.css` para criar linhas pautadas horizontais a cada 28px usando `var(--color-line)`
- [ ] 2.2 Adicionar margem vermelha vertical à esquerda da `.app` (pseudo-elemento `::before` com `position: absolute`, `left: 40px`, `top: 0`, `bottom: 0`, `width: 2px`, `background: #c0392b` com `opacity: 0.35`)
- [ ] 2.3 Atualizar `.app-title` em `App.css`: `font-family: var(--font-family-display)`, `font-size: 3rem`, `font-weight: 700`, `letter-spacing: 0.02em`
- [ ] 2.4 Adicionar linha decorativa abaixo do `.app-header` (border-bottom ou pseudo-elemento `::after`)
- [ ] 2.5 Estilizar `.logout-button` como post-it vermelho: `background: #fde8e8`, `color: #8b2635`, `border: 1px solid #e8b4b4`, `box-shadow: 1px 2px 4px rgba(139,38,53,0.15)`, `border-radius: 2px`, hover com `background: #f9d0d0`
- [ ] 2.6 Substituir o `.loading-spinner` (círculo girando) por animação de lápis: trocar `border` por conteúdo `✏️` com `animation: spin`

## Detalhes de Implementação

### Linhas pautadas no body — `frontend/src/index.css`

Adicionar ao seletor `body` existente:

```css
body {
  /* ... propriedades existentes ... */
  background-color: var(--color-bg);
  background-image: repeating-linear-gradient(
    transparent,
    transparent 27px,
    var(--color-line) 27px,
    var(--color-line) 28px
  );
}
```

### Margem vertical — `.app` em `App.css`

```css
.app {
  position: relative; /* necessário para o ::before */
  /* ... demais propriedades ... */
}

.app::before {
  content: "";
  position: absolute;
  left: 52px;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #c0392b;
  opacity: 0.3;
  pointer-events: none;
}
```

> **Atenção:** A `.app` tem `max-width: 900px` e `margin: 0 auto`. O `position: relative` não quebra o layout.

### Loading spinner com lápis

```css
.loading-spinner {
  font-size: 2rem;
  animation: spin 1s linear infinite;
  display: inline-block;
}
```

No TSX (`TodoApp.tsx`), trocar o `<div className="loading-spinner">` por `<span className="loading-spinner" aria-hidden="true">✏️</span>`.
Esta é a única mudança TSX desta tarefa.

## Critérios de Sucesso

- O fundo da aplicação exibe linhas horizontais sutis (como papel pautado)
- A área principal tem uma linha vermelha vertical à esquerda visível (mas sutil — opacidade ~30%)
- O título "To-Do List" aparece em fonte manuscrita (Caveat), grande e expressivo
- O botão "Logout" parece um post-it pequeno vermelho no canto superior direito
- O loading state exibe o emoji ✏️ girando em vez do círculo de borda
- `npm run test` continua passando (a mudança no loading spinner é de renderização visual, não de lógica)

## Testes da Tarefa

- [ ] **Regressão unitária**: rodar `npm run test` — todos os testes devem continuar passando
- [ ] **Checklist visual manual** (browser via `npm run dev`):
  - [ ] Fundo tem linhas horizontais visíveis mas sutis (não intrusivas)
  - [ ] Linha vermelha vertical aparece à esquerda da área de conteúdo
  - [ ] Título usa fonte Caveat (cursiva/manuscrita)
  - [ ] Botão Logout tem fundo levemente rosado e parece um post-it
  - [ ] Ao fazer logout e re-login, o estado de loading exibe ✏️ girando
  - [ ] Layout responsivo: linhas e margem continuam corretas em 768px e 480px

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- [frontend/src/index.css](frontend/src/index.css) — adicionar linhas pautadas no `body`
- [frontend/src/App.css](frontend/src/App.css) — atualizar `.app`, `.app-title`, `.logout-button`, `.loading-spinner`
- [frontend/src/components/TodoApp.tsx](frontend/src/components/TodoApp.tsx) — trocar `<div>` do spinner por `<span>✏️</span>`
