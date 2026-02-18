# Tarefa 4.0: Botões, Inputs e Animações Globais

<critical>Ler o arquivo C:\Users\silvi\.claude\plans\abstract-booping-newt.md antes de implementar. Sua tarefa será invalidada se você não ler esse arquivo.</critical>

## Visão Geral

Adiciona os efeitos tácteis e físicos que tornam a experiência interativa. Botões ganham comportamento de "pressionar papel": sobem levemente no hover e afundam no click, com sombra que muda junto. Os inputs do formulário trocam a borda de caixa por uma linha embaixo que se expande ao focar, imitando escrever em papel. O gerenciador de listas também recebe os mesmos estilos de input.

**Depende das Tarefas 1.0 e 2.0** (variáveis de cor e sombra devem existir).

<requirements>
- **Todos os botões de ação primária** (`.todo-form-button`, `.lists-manager-create-btn`) devem ter:
  - Hover: `transform: translateY(-2px)` + sombra maior
  - Active (press): `transform: scale(0.97) translateY(1px)` + sombra menor
  - Aparência de "carimbo": borda inferior mais escura (`border-bottom: 3px solid rgba(0,0,0,0.2)`) que some no `:active`
  - Transições suaves em `transform` e `box-shadow`
- **Botões secundários** (`.edit-button`, `.lists-manager-edit-btn`, `.lists-manager-save-btn`, `.lists-manager-cancel-btn`) devem ter hover com leve fundo de papel e active com `transform: scale(0.96)`
- **Botões destrutivos** (`.delete-button`, `.lists-manager-delete-btn`) devem ter hover com fundo avermelhado suave e active com `scale(0.96)`
- **Efeito ripple** no `.todo-form-button`: pseudo-elemento `::after` que expande de `scale(0)` para `scale(4)` com `opacity: 0` ao `:active`
- **`.todo-form-input`**: remover `border` lateral e superior, manter apenas `border-bottom: 2px solid var(--color-border)`, sem `border-radius`, fundo transparente
  - Foco: `border-bottom-color` muda para `var(--color-primary)` com animação de largura via pseudo-elemento `::after` crescendo de 0% para 100%
  - Placeholder em `var(--color-text-secondary)` com opacidade reduzida
- **`.lists-manager-input`** e **`.lists-manager-edit-input`**: mesma estética de underline que o input principal
- **`.tag-selector-trigger`**: borda tracejada em underline style (apenas embaixo), fundo transparente
- **`.lists-manager-toggle`**: estilo de aba de caderno (tab) — borda superior arredondada, fundo levemente diferente do corpo, hover com elevação sutil
- O **`.error-banner`** deve ter aparência de papel amassado: fundo levemente alaranjado/rosado, borda esquerda vermelha espessa
</requirements>

## Subtarefas

- [ ] 4.1 Atualizar `.todo-form-button` em `App.css`: adicionar hover lift + active press + carimbo (`border-bottom` extra) + transições
- [ ] 4.2 Adicionar `@keyframes ripple` e pseudo-elemento `::after` em `.todo-form-button` para o efeito ripple no `:active`
- [ ] 4.3 Atualizar `.todo-form-input` em `App.css`: trocar `border: 2px solid` por `border-bottom: 2px solid`, remover `border-radius`, fundo `transparent`
- [ ] 4.4 Adicionar pseudo-elemento `::after` no `.todo-form-input` (ou wrapper) para a animação de underline crescente no foco — usar `position: relative` no `.todo-form` e `::after` absolute na base do input
- [ ] 4.5 Atualizar `.lists-manager-input` e `.lists-manager-edit-input` com mesma estética underline
- [ ] 4.6 Atualizar `.edit-button`, `.lists-manager-edit-btn`, `.lists-manager-save-btn`, `.lists-manager-cancel-btn` com hover/active suaves
- [ ] 4.7 Atualizar `.delete-button` e `.lists-manager-delete-btn` com hover avermelhado e active
- [ ] 4.8 Atualizar `.lists-manager-toggle` com estilo de aba de caderno
- [ ] 4.9 Atualizar `.error-banner` com estilo de papel amassado (borda esquerda vermelha)
- [ ] 4.10 Atualizar `.tag-selector-trigger` com underline style
- [ ] 4.11 Aplicar `.lists-manager-create-btn` com mesmos efeitos do `.todo-form-button`

## Detalhes de Implementação

### Botão primário com efeito de pressionar

```css
.todo-form-button {
  position: relative;
  overflow: hidden; /* para o ripple */
  background-color: var(--color-primary);
  color: #fff;
  border-bottom: 3px solid rgba(0, 0, 0, 0.25); /* efeito de carimbo */
  border-radius: var(--radius-md);
  box-shadow: 0 4px 8px rgba(44, 74, 110, 0.3);
  transition: transform 150ms ease, box-shadow 150ms ease, border-bottom-width 150ms ease;
}

.todo-form-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(44, 74, 110, 0.35);
}

.todo-form-button:active:not(:disabled) {
  transform: scale(0.97) translateY(1px);
  box-shadow: 0 1px 3px rgba(44, 74, 110, 0.2);
  border-bottom-width: 1px; /* carimbo pressionado */
}
```

### Efeito ripple

```css
.todo-form-button::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  transform: scale(0);
  opacity: 0;
  transition: transform 400ms ease, opacity 400ms ease;
}

.todo-form-button:active::after {
  transform: scale(4);
  opacity: 0;
  transition: 0s; /* dispara imediatamente */
}
```

### Input underline com animação de foco

O `.todo-form` precisa de `position: relative`. A animação é feita com uma `<div>` ou via `box-shadow` no input:

**Abordagem mais simples (sem wrapper extra):**
```css
.todo-form-input {
  border: none;
  border-bottom: 2px solid var(--color-border);
  border-radius: 0;
  background: transparent;
  padding: var(--spacing-sm) var(--spacing-xs);
  box-shadow: none;
  transition: border-bottom-color var(--transition-fast);
}

.todo-form-input:focus-visible {
  border-bottom-color: var(--color-primary);
  box-shadow: 0 2px 0 var(--color-primary); /* linha dupla no foco */
  outline: none;
}
```

### Aba de caderno — `.lists-manager-toggle`

```css
.lists-manager-toggle {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-bottom: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  padding: var(--spacing-xs) var(--spacing-md);
  box-shadow: 0 -2px 4px rgba(42, 36, 24, 0.06);
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.lists-manager-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 -4px 8px rgba(42, 36, 24, 0.1);
}
```

### Error banner como papel amassado

```css
.error-banner {
  background-color: #fdf0f0;
  color: var(--color-error-text);
  border-left: 4px solid var(--color-danger);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding: var(--spacing-md) var(--spacing-lg);
}
```

## Critérios de Sucesso

- Botão "Adicionar" sobe levemente no hover e afunda visivelmente no click
- Ao clicar no botão, o efeito ripple (onda branca) expande e some
- O campo de texto não tem borda de caixa — apenas uma linha embaixo
- Ao focar o campo, a linha embaixo muda de cor (bege → azul escuro)
- Botões de editar/deletar/salvar têm feedback visual de hover e press
- O botão "Gerenciar listas" parece uma aba de caderno
- Mensagens de erro têm borda esquerda vermelha (estilo papel marcado)
- `npm run test` continua passando

## Testes da Tarefa

- [ ] **Regressão unitária**: rodar `npm run test` — esta tarefa não altera TSX, apenas CSS; todos os testes devem passar
- [ ] **Checklist visual manual** (browser via `npm run dev`):
  - [ ] Hover no botão "Adicionar" → eleva 2px
  - [ ] Click no botão "Adicionar" → afunda + efeito ripple visível
  - [ ] Campo de texto principal tem apenas linha embaixo (sem caixa)
  - [ ] Focar campo → linha embaixo muda para azul escuro
  - [ ] Hover em "Editar" → fundo bege sutil
  - [ ] Hover em "Remover" → fundo avermelhado sutil
  - [ ] Botão "Gerenciar listas" parece aba de caderno
  - [ ] Mensagem de erro (forçar removendo internet) → borda vermelha à esquerda

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- [frontend/src/App.css](frontend/src/App.css) — atualizar todos os seletores de botão e input; adicionar `@keyframes ripple`
