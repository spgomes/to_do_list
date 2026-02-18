# Tarefa 3.0: Cards e TodoItems

<critical>Ler o arquivo C:\Users\silvi\.claude\plans\abstract-booping-newt.md antes de implementar. Sua tarefa será invalidada se você não ler esse arquivo.</critical>

## Visão Geral

Transforma os cards de lista em folhas de papel empilhadas e os itens de tarefa em anotações de caderno. É a tarefa mais visual do redesign: os cards ganham sombra de pilha, leve rotação alternada e efeito de dobra de canto. Os TodoItems recebem animação de entrada suave e animação de "amassado" ao ser deletados.

**Depende das Tarefas 1.0 e 2.0** (variáveis de cor e família de fonte display devem existir).

<requirements>
- `.list-card` deve parecer uma folha de papel: fundo `var(--color-surface)`, linhas pautadas internas via `repeating-linear-gradient`, sombra em 3 camadas simulando pilha de folhas
- Cards alternados (`:nth-child(even)`) devem ter rotação leve: `transform: rotate(0.4deg)`
- Cards ímpares (`:nth-child(odd)`) devem ter rotação oposta leve: `transform: rotate(-0.3deg)`
- Cada `.list-card` deve ter pseudo-elemento `::before` simulando uma folha embaixo (deslocada ~3px para direita e baixo, mesma cor de superfície, z-index menor)
- Cada `.list-card` deve ter pseudo-elemento `::after` no canto inferior direito simulando dobra (triângulo com `border`)
- A borda esquerda colorida da lista (color do list) deve ser mantida — apenas engrossar para 5px e arredondar levemente no topo e base
- O título `.list-card-title` deve usar `var(--font-family-display)` (Caveat), tamanho ~1.4rem
- `.todo-item` deve ter fundo levemente amarelado `#fffef0`, linha inferior sutil (border-bottom) simulando pautado
- Animação de **entrada** do `.todo-item`: `@keyframes noteIn` — `from { opacity: 0; transform: translateY(-8px) rotate(-0.5deg) }` `to { opacity: 1; transform: translateY(0) rotate(0) }` — duração 200ms
- Animação de **saída** (delete): adicionar classe `.removing` no `TodoItem` antes de chamar `onDelete`, com `@keyframes crumple` — `to { opacity: 0; transform: scale(0.85) rotate(2deg) }` — duração 200ms; só então chamar `onDelete`
- O checkbox deve ter `border-radius: 3px 1px 3px 2px` (levemente irregular, como desenhado à mão) e borda mais espessa (2.5px)
- O texto da tarefa completada deve usar `text-decoration: line-through` com cor `var(--color-text-secondary)` e espessura do risco mais grossa (`text-decoration-thickness: 2px`)
- O estado `.dragging` deve exibir sombra maior e rotação de ~2deg, simulando papel flutuando
</requirements>

## Subtarefas

- [ ] 3.1 Atualizar `.list-card` em `App.css`: adicionar `repeating-linear-gradient` interno, sombra em 3 camadas (`box-shadow`), `overflow: visible` (para o pseudo-elemento `::before` aparecer)
- [ ] 3.2 Adicionar `.list-card::before` (folha embaixo) e `.list-card::after` (dobra de canto) em `App.css`
- [ ] 3.3 Adicionar `.list-card:nth-child(odd)` e `.list-card:nth-child(even)` com rotações opostas em `App.css`
- [ ] 3.4 Atualizar `.list-card-title` para usar `font-family: var(--font-family-display)`, ajustar tamanho e cor
- [ ] 3.5 Atualizar `.todo-item` em `App.css`: novo fundo, `border-bottom`, animação `noteIn`, `border-radius` mais suave
- [ ] 3.6 Adicionar `@keyframes noteIn` e `@keyframes crumple` em `App.css`
- [ ] 3.7 Adicionar estilo `.todo-item.removing` em `App.css` (aplica `crumple` com `forwards`)
- [ ] 3.8 Atualizar `.todo-item.dragging` em `App.css`: sombra maior + `transform: rotate(2deg) scale(1.02)`
- [ ] 3.9 Atualizar `.todo-checkbox` em `App.css`: `border-radius` irregular, borda mais espessa
- [ ] 3.10 Atualizar `.todo-item.completed .todo-title` em `App.css`: `text-decoration-thickness: 2px`
- [ ] 3.11 Atualizar `frontend/src/components/TodoItem.tsx`: adicionar estado `isRemoving` e lógica de delay na animação de saída antes de chamar `onDelete`

## Detalhes de Implementação

### Sombra de pilha no `.list-card`

```css
.list-card {
  position: relative;
  overflow: visible; /* permite pseudo-elementos aparecerem além do card */
  box-shadow:
    1px 2px 3px rgba(42, 36, 24, 0.08),
    3px 5px 8px rgba(42, 36, 24, 0.06),
    0 1px 2px rgba(42, 36, 24, 0.04);
}
```

### Folha embaixo — `.list-card::before`

```css
.list-card::before {
  content: "";
  position: absolute;
  top: 4px;
  left: 3px;
  right: -3px;
  bottom: -4px;
  background: var(--color-surface);
  border-radius: inherit;
  box-shadow: 1px 2px 4px rgba(42, 36, 24, 0.07);
  z-index: -1;
}
```

### Dobra de canto — `.list-card::after`

```css
.list-card::after {
  content: "";
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 18px 18px;
  border-color: transparent transparent var(--color-bg) transparent;
  filter: drop-shadow(-1px -1px 1px rgba(42,36,24,0.1));
}
```

### Animação de saída no `TodoItem.tsx`

```tsx
const [isRemoving, setIsRemoving] = useState(false);

function handleDelete() {
  if (window.confirm("Tem certeza que deseja remover esta tarefa?")) {
    setIsRemoving(true);
    setTimeout(() => {
      onDelete(todo.id);
    }, 200); // mesma duração do @keyframes crumple
  }
}

// Na className do <li>:
className={`todo-item ${todo.completed ? "completed" : ""} ${isDragging ? "dragging" : ""} ${isRemoving ? "removing" : ""}`}
```

### Linhas pautadas internas no card

```css
.list-card {
  background-color: var(--color-surface);
  background-image: repeating-linear-gradient(
    transparent,
    transparent 27px,
    rgba(212, 200, 176, 0.4) 27px,
    rgba(212, 200, 176, 0.4) 28px
  );
}
```

## Critérios de Sucesso

- Cada card de lista parece uma folha de papel com linhas sutis internas
- Cards alternam entre levemente inclinados para a direita e esquerda
- Cada card tem uma "sombra de folha" embaixo (efeito 3D de empilhamento)
- Canto inferior direito de cada card tem um triângulo de dobra
- Títulos dos cards usam fonte Caveat
- Ao adicionar uma tarefa, ela aparece com animação suave de cima para baixo
- Ao deletar uma tarefa, ela "amassa" e some antes de ser removida do DOM
- Ao arrastar uma tarefa, ela parece flutuar (sombra maior + leve rotação)
- `npm run test` continua passando

## Testes da Tarefa

- [ ] **Regressão unitária**: rodar `npm run test` — verificar especialmente os testes de `TodoItem` (a adição de `isRemoving` e a mudança no `handleDelete` não deve quebrar os testes existentes de click no botão delete)
- [ ] **Checklist visual manual** (browser via `npm run dev`):
  - [ ] Card exibe linhas horizontais internas sutis
  - [ ] Card tem sombra de "pilha de folhas" (efeito de profundidade)
  - [ ] Cards alternados têm inclinação oposta visível
  - [ ] Canto inferior direito do card tem dobra triangular
  - [ ] Títulos dos cards estão em fonte Caveat
  - [ ] Adicionar tarefa → animação `noteIn` visível (~200ms)
  - [ ] Deletar tarefa → animação `crumple` visível antes de sumir
  - [ ] Arrastar tarefa → item flutuante com sombra e rotação

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- [frontend/src/App.css](frontend/src/App.css) — atualizar `.list-card`, `.list-card-title`, `.todo-item`, `.todo-checkbox`; adicionar keyframes
- [frontend/src/components/TodoItem.tsx](frontend/src/components/TodoItem.tsx) — adicionar `isRemoving` state e delay no `handleDelete`
