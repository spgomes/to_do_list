# Tarefa 2.0: Frontend — Formulário inline para criar tarefa dentro de cada ListCard

<critical>Ler os arquivos Tasks/PRD.md e Tasks/TechSpec.md antes de implementar. Sua tarefa será invalidada se você não ler esses arquivos.</critical>

## Visão Geral

Adicionar um formulário de criação de tarefa diretamente em cada `ListCard`, incluindo o card "Sem lista". O usuário pode criar tarefas sem precisar usar apenas o `TodoForm` global no topo da página.

- Card de lista com nome (ex: "Trabalho") → usa `POST /api/lists/{id}/todos` (criado na Tarefa 1.0)
- Card "Sem lista" → usa `POST /api/todos` (endpoint existente)

Esta tarefa depende da **Tarefa 1.0** estar concluída (função `createTodoInList` em `api.ts` e remoção do `ListSelector`).

<requirements>
- Cada `ListCard` deve exibir um formulário inline com campo de texto e botão "Adicionar"
- O formulário do card "Sem lista" cria uma tarefa avulsa (sem associação a lista)
- O formulário de cada lista nomeada cria a tarefa já dentro da lista (usa `createTodoInList`)
- Após criar, a nova tarefa deve aparecer imediatamente no card correto sem recarregar a página
- O campo de texto deve ser limpo após a criação bem-sucedida
- Não deve ser possível enviar com título vazio (validação client-side + feedback visual)
- O formulário deve ter estado de loading ("...") durante a requisição
- Erros da API devem ser exibidos próximos ao formulário do card onde ocorreram (não um erro global)
</requirements>

## Subtarefas

- [ ] 2.1 Em `frontend/src/components/ListCard.tsx`: adicionar prop `onCreateTodo: (title: string) => Promise<void>` e renderizar um formulário inline no final do card (campo de texto + botão "Adicionar")
- [ ] 2.2 O formulário inline deve ter estado local: `inputValue`, `isSubmitting`, `formError` — sem poluir o estado de `TodoApp`
- [ ] 2.3 Em `frontend/src/components/TodoApp.tsx`: criar função `handleCreateTodoInCard(list: List | null, title: string): Promise<void>` que decide qual API chamar baseado em `list`:
  - Se `list === null` → chama `createTodo(title)` e adiciona ao estado
  - Se `list !== null` → chama `createTodoInList(list.id, title)` e adiciona ao estado
- [ ] 2.4 Em `TodoApp`, passar `onCreateTodo` para cada `<ListCard>` via `listCardsData.map`
- [ ] 2.5 Após criar, o novo todo deve ser adicionado ao estado `todos` com `lists` já populado (para aparecer no card correto na re-renderização feita pelo `useMemo`)
- [ ] 2.6 Criar testes unitários para o formulário inline em `ListCard`
- [ ] 2.7 Criar testes unitários para a função `handleCreateTodoInCard` em `TodoApp`

## Detalhes de Implementação

### Estrutura do formulário inline em `ListCard`

O formulário fica ao final do `<article>`, após a lista de tarefas:

```tsx
<form onSubmit={handleInlineSubmit} className="list-card-add-form">
  <input
    type="text"
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    placeholder="Nova tarefa..."
    disabled={isSubmitting}
    maxLength={255}
    aria-label={`Adicionar tarefa em ${list?.name ?? "Sem lista"}`}
  />
  <button type="submit" disabled={isSubmitting || !inputValue.trim()}>
    {isSubmitting ? "..." : "Adicionar"}
  </button>
  {formError && <p className="list-card-form-error" role="alert">{formError}</p>}
</form>
```

### Lógica de estado em `TodoApp` após criação

Quando `createTodoInList` retorna o novo `Todo`, ele já contém a lista associada no campo `lists`. Basta adicioná-lo ao início do array `todos`:

```tsx
setTodos((prev) => [newTodo, ...prev]);
```

O `useMemo` de `listCardsData` já filtra os todos por lista, então o item aparecerá automaticamente no card correto.

### Props atualizadas de `ListCard`

```tsx
interface ListCardProps {
  list: List | null;
  todos: Todo[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, title: string) => Promise<void>;
  onCreateTodo: (title: string) => Promise<void>; // NOVO
}
```

## Critérios de Sucesso

- Cada card de lista e o card "Sem lista" exibem o formulário inline
- Criar tarefa no card "Trabalho" faz a tarefa aparecer somente no card "Trabalho"
- Criar tarefa no card "Sem lista" faz a tarefa aparecer somente no card "Sem lista"
- O campo é limpo após criação bem-sucedida
- Erro da API é exibido dentro do card onde ocorreu, não globalmente
- Todos os testes novos e existentes passam

## Testes da Tarefa

- [ ] Testes de unidade — `ListCard` com formulário: renderiza input e botão; botão desabilitado com input vazio; chama `onCreateTodo` ao submeter; limpa input após sucesso; exibe erro quando `onCreateTodo` rejeita
- [ ] Testes de unidade — `TodoApp`: `handleCreateTodoInCard(null, "título")` chama `createTodo`; `handleCreateTodoInCard(list, "título")` chama `createTodoInList` com o id correto; novo todo aparece no estado

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- [frontend/src/components/ListCard.tsx](frontend/src/components/ListCard.tsx) — adicionar formulário inline e prop `onCreateTodo`
- [frontend/src/components/TodoApp.tsx](frontend/src/components/TodoApp.tsx) — adicionar `handleCreateTodoInCard` e passar para `ListCard`
- [frontend/src/services/api.ts](frontend/src/services/api.ts) — função `createTodoInList` (criada na Tarefa 1.0)
- [frontend/src/components/__tests__/ListCard.test.tsx](frontend/src/components/__tests__/) — testes do formulário inline (novo arquivo ou atualização)
- [frontend/src/components/__tests__/App.test.tsx](frontend/src/components/__tests__/App.test.tsx) — testes do `TodoApp`
