# Tarefa 3.0: Frontend — Drag & Drop de tarefas entre listas

<critical>Ler os arquivos Tasks/PRD.md e Tasks/TechSpec.md antes de implementar. Sua tarefa será invalidada se você não ler esses arquivos.</critical>

## Visão Geral

Implementar a funcionalidade de arrastar tarefas (`TodoItem`) entre os cards de lista (`ListCard`) usando a **HTML5 Drag and Drop API** — sem bibliotecas externas.

Quando o usuário solta uma tarefa em um card diferente:
- Se a tarefa estava em uma lista → remove da lista antiga (`removeListFromTodo`) e associa à nova (`addListToTodo`)
- Se a tarefa foi solta no card "Sem lista" → apenas remove da lista atual (sem associar nada)
- Se a tarefa estava sem lista e foi solta em uma lista → apenas associa (`addListToTodo`)

Esta tarefa depende das **Tarefas 1.0 e 2.0** estarem concluídas (props limpas, `addListToTodo`/`removeListFromTodo` disponíveis em `api.ts`).

<requirements>
- Todo item deve ser arrastável (`draggable={true}`)
- Cada `ListCard` deve ser uma zona de drop válida
- Ao arrastar sobre um card, deve haver feedback visual (ex: borda destacada com `dragover` CSS)
- Ao soltar em um card diferente do card atual da tarefa, a associação é atualizada via API
- O estado do `TodoApp` deve ser atualizado de forma otimista: mover o todo no estado local imediatamente, sem esperar a API (reverter se a API falhar)
- Soltar no mesmo card onde o todo já está não deve disparar nenhuma chamada à API
- A operação deve funcionar para o card "Sem lista" (destino e origem)
- Um todo pertence a **no máximo uma lista** na UI de drag & drop (simplificação do modelo many-to-many): ao soltar em uma lista, remover de qualquer lista anterior primeiro
</requirements>

## Subtarefas

- [ ] 3.1 Em `frontend/src/components/TodoItem.tsx`: adicionar `draggable={true}` e handler `onDragStart` que salva o `todo.id` no `dataTransfer` (`e.dataTransfer.setData("todoId", String(todo.id))`)
- [ ] 3.2 Em `frontend/src/components/TodoItem.tsx`: adicionar estilo visual durante o drag — usar estado `isDragging` ou classe CSS via `onDragStart`/`onDragEnd`
- [ ] 3.3 Em `frontend/src/components/ListCard.tsx`: adicionar handlers `onDragOver` (chamar `e.preventDefault()` para habilitar drop), `onDragEnter`, `onDragLeave` e `onDrop`
- [ ] 3.4 Em `frontend/src/components/ListCard.tsx`: adicionar estado local `isDragOver` para aplicar classe CSS de feedback visual quando um item é arrastado sobre o card
- [ ] 3.5 Em `frontend/src/components/ListCard.tsx`: no handler `onDrop`, ler o `todoId` do `dataTransfer` e chamar a prop `onDropTodo(todoId, list)`
- [ ] 3.6 Em `frontend/src/components/ListCard.tsx`: adicionar prop `onDropTodo: (todoId: number, targetList: List | null) => Promise<void>`
- [ ] 3.7 Em `frontend/src/components/TodoApp.tsx`: criar função `handleDropTodo(todoId: number, targetList: List | null)`:
  - Encontrar o todo pelo id e sua lista atual (`todo.lists?.[0]`)
  - Se `targetList?.id === currentListId` → retornar (sem mudança)
  - Atualização otimista: atualizar `todos` no estado local imediatamente
  - Chamar API: `removeListFromTodo` da lista atual (se tiver), depois `addListToTodo` na nova lista (se não for "Sem lista")
  - Em caso de erro da API: reverter o estado e exibir mensagem de erro
- [ ] 3.8 Passar `onDropTodo={handleDropTodo}` para cada `<ListCard>` em `TodoApp`
- [ ] 3.9 Criar testes unitários para o drag & drop
- [ ] 3.10 Adicionar estilos CSS para feedback visual (classe `.drag-over` no card, opacidade reduzida no item sendo arrastado)

## Detalhes de Implementação

### Fluxo de dados no `onDrop`

```
usuário solta "Tarefa A" (lista atual: "Pessoal") no card "Trabalho"

1. handleDropTodo(todoId=5, targetList={id:2, name:"Trabalho"})
2. Busca: currentList = todos.find(t => t.id === 5).lists?.[0]  → {id:1, name:"Pessoal"}
3. currentList.id (1) !== targetList.id (2) → prosseguir
4. Atualização otimista: setTodos(prev => prev.map(t => t.id === 5 ? {...t, lists:[targetList]} : t))
5. API: await removeListFromTodo(5, 1)  → remove de "Pessoal"
6. API: await addListToTodo(5, 2)       → adiciona em "Trabalho"
7. Se erro: reverter estado + setError(mensagem)
```

### Caso: soltar no card "Sem lista"

```
targetList === null

4. Atualização otimista: setTodos(prev => prev.map(t => t.id === 5 ? {...t, lists:[]} : t))
5. API: await removeListFromTodo(5, currentList.id)  → remove de "Pessoal"
6. Nenhuma chamada addListToTodo (targetList é null)
```

### Feedback visual

No `ListCard`, usar o estado `isDragOver`:

```css
.list-card.drag-over {
  outline: 2px dashed var(--color-primary);
  background-color: rgba(0, 0, 0, 0.03);
}
```

No `TodoItem`, reduzir opacidade enquanto arrasta:

```css
.todo-item.dragging {
  opacity: 0.4;
}
```

### Props atualizadas de `ListCard`

```tsx
interface ListCardProps {
  list: List | null;
  todos: Todo[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, title: string) => Promise<void>;
  onCreateTodo: (title: string) => Promise<void>;
  onDropTodo: (todoId: number, targetList: List | null) => Promise<void>; // NOVO
}
```

## Critérios de Sucesso

- Arrastar uma tarefa de um card e soltar em outro move a tarefa visualmente e persiste via API
- Soltar no mesmo card não dispara chamada à API
- Soltar no card "Sem lista" remove a associação de lista da tarefa
- Feedback visual funciona: card de destino destacado, item arrastado com opacidade reduzida
- Em caso de erro da API, o estado local é revertido e uma mensagem é exibida
- Todos os testes novos e existentes passam

## Testes da Tarefa

- [ ] Testes de unidade — `TodoItem`: renderiza com `draggable={true}`; `onDragStart` define `todoId` no `dataTransfer`
- [ ] Testes de unidade — `ListCard`: aplica classe `drag-over` ao receber `onDragOver`; chama `onDropTodo` com o `todoId` e `list` corretos no `onDrop`
- [ ] Testes de unidade — `TodoApp.handleDropTodo`: não chama API se o destino for igual à lista atual; chama `removeListFromTodo` + `addListToTodo` na ordem correta; atualiza o estado otimisticamente; reverte o estado se a API falhar

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- [frontend/src/components/TodoItem.tsx](frontend/src/components/TodoItem.tsx) — adicionar `draggable`, `onDragStart`, `onDragEnd`, estilo de drag
- [frontend/src/components/ListCard.tsx](frontend/src/components/ListCard.tsx) — adicionar handlers de drop, `isDragOver`, prop `onDropTodo`
- [frontend/src/components/TodoApp.tsx](frontend/src/components/TodoApp.tsx) — adicionar `handleDropTodo`, passar para `ListCard`
- [frontend/src/services/api.ts](frontend/src/services/api.ts) — `addListToTodo` e `removeListFromTodo` (já existem da Tarefa 1.0)
- [frontend/src/components/__tests__/TodoItem.test.tsx](frontend/src/components/__tests__/TodoItem.test.tsx) — testes de drag
- [frontend/src/components/__tests__/App.test.tsx](frontend/src/components/__tests__/App.test.tsx) — testes de `handleDropTodo`
