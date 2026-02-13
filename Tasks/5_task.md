# Tarefa 5.0: Componentes React e Integração (Frontend)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar os componentes React que compõem a interface da aplicação To-Do List e integrá-los com a camada de serviço HTTP (Tarefa 4.0) e o backend (Tarefa 3.0). Ao final desta tarefa, a aplicação estará funcionando end-to-end: o usuário poderá adicionar, visualizar, marcar como concluída e remover tarefas.

**Dependências:** Tarefa 3.0 (API REST funcionando) e Tarefa 4.0 (serviço HTTP do frontend).

<requirements>
- Componente `TodoForm` com campo de texto e botão para adicionar tarefa
- Componente `TodoItem` exibindo nome, status, botão de toggle (concluída/pendente) e botão de remover
- Componente `TodoList` que renderiza a lista de `TodoItem` ou mensagem "Nenhuma tarefa cadastrada"
- Componente `App` que orquestra estado, carrega tarefas ao montar e conecta ações CRUD
- Validação client-side: não permitir adicionar tarefa com título vazio, exibindo feedback visual
- Confirmação antes de remover tarefa (ex: `window.confirm`)
- Tarefas concluídas com diferenciação visual (texto riscado)
- Atualização da lista sem recarregar a página (SPA)
- Suporte a tecla Enter para adicionar tarefa
- Testes de componentes com React Testing Library + Vitest
</requirements>

## Subtarefas

- [x] 5.1 Instalar dependências de teste: `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- [x] 5.2 Implementar `TodoForm` em `frontend/src/components/TodoForm.tsx`
  - Campo de texto controlado com estado local
  - Botão "Adicionar" que chama callback `onAdd(title)`
  - Submissão por Enter (evento `onKeyDown` ou `<form onSubmit>`)
  - Validação: não submeter se título vazio, exibir mensagem de erro
  - Limpar campo após adição com sucesso
- [x] 5.3 Implementar `TodoItem` em `frontend/src/components/TodoItem.tsx`
  - Exibir título da tarefa
  - Checkbox ou botão para toggle de status (concluída ↔ pendente)
  - Texto riscado (`text-decoration: line-through`) quando concluída
  - Botão de remover que chama callback `onDelete(id)`
- [x] 5.4 Implementar `TodoList` em `frontend/src/components/TodoList.tsx`
  - Renderizar lista de `TodoItem`
  - Exibir mensagem "Nenhuma tarefa cadastrada" quando lista vazia
- [x] 5.5 Implementar `App.tsx` — componente raiz
  - Estado: `todos: Todo[]`, `loading: boolean`, `error: string | null`
  - `useEffect` para carregar tarefas ao montar (chamar `fetchTodos`)
  - Função `handleAdd` que chama `createTodo` e atualiza estado
  - Função `handleToggle` que chama `updateTodo` e atualiza estado
  - Função `handleDelete` que pede confirmação, chama `deleteTodo` e atualiza estado
  - Renderizar `TodoForm` e `TodoList` passando callbacks
- [x] 5.6 Escrever testes de componentes com React Testing Library
- [x] 5.7 Testar integração completa: iniciar backend + frontend e verificar fluxo funcional

## Detalhes de Implementação

Consultar a seção **"Arquivos Relevantes e Dependentes"** (componentes React) e **"Fluxo de dados"** na [techspec.md](../../Tasks/TechSpec.md).

**Pontos de atenção:**
- Estado gerenciado localmente no `App.tsx` com `useState` (sem necessidade de Redux/Context para esta escala)
- Após cada operação CRUD, atualizar o estado local diretamente (optimistic update) ou re-fetch a lista
- Para confirmação de deleção, `window.confirm("Tem certeza que deseja remover esta tarefa?")` é suficiente
- Exibir loading state enquanto carrega tarefas iniciais
- Tratar erros de rede mostrando mensagem ao usuário

**Props esperadas dos componentes:**
```typescript
// TodoForm
interface TodoFormProps {
  onAdd: (title: string) => Promise<void>;
}

// TodoItem
interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

// TodoList
interface TodoListProps {
  todos: Todo[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}
```

## Critérios de Sucesso

- Aplicação fullstack funciona end-to-end (frontend + backend rodando simultaneamente)
- Usuário pode adicionar tarefa digitando título e clicando "Adicionar" ou pressionando Enter
- Usuário pode marcar tarefa como concluída e reverter para pendente
- Tarefa concluída exibe texto riscado
- Usuário pode remover tarefa com confirmação prévia
- Lista vazia exibe mensagem "Nenhuma tarefa cadastrada"
- Campo vazio exibe feedback de erro e não submete
- Todas as operações atualizam a lista sem recarregar a página
- Testes de componentes passam com `npx vitest run`

## Testes da Tarefa

- [x] **Teste unitário:** `TodoForm` — renderiza campo de texto e botão
- [x] **Teste unitário:** `TodoForm` — chama `onAdd` com título ao submeter
- [x] **Teste unitário:** `TodoForm` — não submete com título vazio e exibe erro
- [x] **Teste unitário:** `TodoForm` — limpa campo após submissão com sucesso
- [x] **Teste unitário:** `TodoItem` — renderiza título e status corretamente
- [x] **Teste unitário:** `TodoItem` — chama `onToggle` ao clicar no checkbox/botão
- [x] **Teste unitário:** `TodoItem` — chama `onDelete` ao clicar no botão remover
- [x] **Teste unitário:** `TodoList` — renderiza múltiplos TodoItems
- [x] **Teste unitário:** `TodoList` — exibe mensagem quando lista vazia
- [x] **Teste de integração:** `App` — carrega e exibe tarefas do serviço (com mock de API)
- [x] **Teste de integração manual:** fluxo completo com backend rodando

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `frontend/src/components/TodoForm.tsx` — Formulário de adição (novo)
- `frontend/src/components/TodoItem.tsx` — Item individual (novo)
- `frontend/src/components/TodoList.tsx` — Lista de tarefas (novo)
- `frontend/src/App.tsx` — Componente raiz atualizado
- `frontend/src/components/__tests__/` — Testes de componentes (novo)
- `frontend/src/services/api.ts` — Serviço HTTP (da Tarefa 4.0)
- `frontend/src/types/todo.ts` — Interface Todo (da Tarefa 4.0)
- [PRD](../../Tasks/PRD.md) — Requisitos funcionais 1-19, fluxo principal, UI/UX
- [Tech Spec](../../Tasks/TechSpec.md) — Seções "Fluxo de dados", "Arquivos Relevantes"
