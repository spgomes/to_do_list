# Tarefa 1.0: Backend + Frontend — Remover Tags, novo endpoint de lista e remover ListSelector

<critical>Ler os arquivos Tasks/PRD.md e Tasks/TechSpec.md antes de implementar. Sua tarefa será invalidada se você não ler esses arquivos.</critical>

## Visão Geral

Esta tarefa unifica três mudanças relacionadas que devem ser feitas juntas para manter o código consistente:

1. **Remover a API de Tags** — os endpoints de tags (`/api/tags`, `/api/todos/{id}/tags`) não são mais necessários. As tabelas `tags` e `todo_tags` permanecem no banco (para não perder dados já migrados), mas a API para de expô-las.
2. **Novo endpoint `POST /api/lists/{id}/todos`** — cria uma tarefa já associada a uma lista em uma única operação atômica (transação).
3. **Remover o `ListSelector` do frontend** — o seletor de lista que aparecia em cada item de tarefa (`TodoItem`) é removido, junto com todas as props e estado relacionados.

<requirements>
- Os endpoints de tags (`GET /api/tags`, `POST /api/tags`, `PATCH /api/tags/{id}`, `DELETE /api/tags/{id}`, `POST /api/todos/{id}/tags/{tagId}`, `DELETE /api/todos/{id}/tags/{tagId}`) devem ser removidos das rotas e handlers
- O campo `tags` deve ser removido da resposta do `GET /api/todos`
- O novo endpoint `POST /api/lists/{id}/todos` deve criar a tarefa e a associação em uma transação SQL (se a associação falhar, a tarefa não é criada)
- O novo endpoint deve retornar `201 Todo` com a tarefa criada
- O novo endpoint deve retornar `404` se a lista não existir ou não pertencer ao usuário
- O `ListSelector` deve ser completamente removido da UI de cada tarefa
- `TodoItem` não deve mais receber `allLists`, `onAddList`, `onRemoveList`, `listError` como props
- `ListCard` não deve mais receber `allLists`, `onAddList`, `onRemoveList`, `listError`, `listErrorTodoId` como props
- `TodoApp` deve ter o estado `listError`, `listErrorTodoId`, `handleAddList` e `handleRemoveList` removidos
- As funções `addListToTodo` e `removeListFromTodo` em `api.ts` devem ser **mantidas** (serão usadas pela Tarefa 3.0 de drag & drop)
- Adicionar função `createTodoInList(listId, title)` em `api.ts`
</requirements>

## Subtarefas

### Backend

- [ ] 1.1 Em `backend/handlers.go`: remover as funções `handleListTags`, `handleCreateTag`, `handleUpdateTag`, `handleDeleteTag`, `handleAddTagToTodo`, `handleRemoveTagFromTodo`
- [ ] 1.2 Em `backend/handlers.go`: remover a chamada a `ListTodoTags` dentro de `handleListTodos` (linhas que populam `todos[i].Tags`)
- [ ] 1.3 Em `backend/handlers.go`: criar `handleCreateTodoInList` — lê `title` do body, extrai `listId` do path, chama `CreateTodoInList` no db e retorna `201 Todo`
- [ ] 1.4 Em `backend/main.go`: remover as rotas de tags; registrar a nova rota `POST /api/lists/{id}/todos`
- [ ] 1.5 Em `backend/models.go`: remover a struct `Tag` e o campo `Tags []Tag` de `Todo`
- [ ] 1.6 Em `backend/db.go`: criar função `CreateTodoInList(db, title, listID, userID)` que executa em transação: (1) insere o todo, (2) verifica se a lista existe e pertence ao usuário, (3) insere em `todo_lists`
- [ ] 1.7 Em `backend/db.go`: remover as funções `ListTags`, `CreateTag`, `UpdateTagName`, `DeleteTag`, `AddTagToTodo`, `RemoveTagFromTodo`, `ListTodoTags` (manter apenas funções de Lists)
- [ ] 1.8 Em `backend/db.go`: remover erros e constantes relacionados a tags (`ErrEmptyTagName`, `ErrTagNameTooLong`, `ErrDuplicateTag`, `ErrTagNotFound`, `MaxTagNameLength`)

### Frontend

- [ ] 1.9 Em `frontend/src/components/TodoItem.tsx`: remover props `allLists`, `onAddList`, `onRemoveList`, `listError` e remover o bloco JSX que renderiza o `<ListSelector>`
- [ ] 1.10 Em `frontend/src/components/ListCard.tsx`: remover props `allLists`, `onAddList`, `onRemoveList`, `listError`, `listErrorTodoId` e parar de passá-las para `TodoItem`
- [ ] 1.11 Em `frontend/src/components/TodoApp.tsx`: remover estado `listError`, `listErrorTodoId`, funções `handleAddList` e `handleRemoveList`; atualizar chamada a `<ListCard>` para não passar essas props
- [ ] 1.12 Em `frontend/src/services/api.ts`: adicionar função `createTodoInList(listId: number, title: string): Promise<Todo>` que faz `POST /api/lists/{listId}/todos`
- [ ] 1.13 Atualizar testes unitários do frontend que referenciam props removidas

### Testes Backend

- [ ] 1.14 Em `backend/db_test.go`: adicionar testes para `CreateTodoInList` — sucesso, lista inexistente (deve retornar erro), título vazio
- [ ] 1.15 Em `backend/handlers_test.go`: adicionar testes para `POST /api/lists/{id}/todos` — 201 com todo criado, 404 lista inexistente, 400 título vazio
- [ ] 1.16 Em `backend/handlers_test.go`: remover testes de endpoints de tags; verificar que as rotas de tags não existem mais (opcional)

## Detalhes de Implementação

### Novo endpoint — `POST /api/lists/{id}/todos`

```
Request:  POST /api/lists/42/todos
Body:     { "title": "Minha tarefa" }

Response 201:
{
  "id": 10,
  "title": "Minha tarefa",
  "completed": false,
  "created_at": "2026-02-17T10:00:00Z",
  "lists": [{ "id": 42, "name": "Trabalho", "color": "#BBDEFB", ... }]
}

Response 404: { "error": "list not found" }
Response 400: { "error": "title cannot be empty" }
```

### Transação em `CreateTodoInList`

A função deve usar `db.Begin()` para garantir atomicidade:
1. Verificar que a lista existe e pertence ao `userID` — senão retornar `ErrListNotFound`
2. Inserir o todo em `todos`
3. Inserir a associação em `todo_lists`
4. Fazer `tx.Commit()`

Se qualquer passo falhar, `tx.Rollback()` e retornar erro.

### Funções e tipos a manter em `api.ts`

Manter `addListToTodo` e `removeListFromTodo` — serão usados pela Tarefa 3.0. Apenas remover suas chamadas do componente `TodoApp`.

## Critérios de Sucesso

- Nenhum endpoint de tags responde mais (rotas removidas)
- `GET /api/todos` não retorna mais o campo `tags` nos itens
- `POST /api/lists/{id}/todos` cria o todo e a associação atomicamente
- A UI de cada tarefa não exibe mais nenhum seletor de lista
- Todos os testes existentes continuam passando (exceto os de tags, que devem ser removidos)
- Todos os novos testes passam

## Testes da Tarefa

- [ ] Testes de unidade — `CreateTodoInList`: sucesso, lista inválida, título vazio, rollback em falha
- [ ] Testes de integração — `POST /api/lists/{id}/todos`: fluxo completo handler → DB → resposta
- [ ] Testes de unidade frontend — `TodoItem` renderiza sem props de lista; `ListCard` renderiza sem props de lista

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

**Backend:**
- [backend/handlers.go](backend/handlers.go) — remover handlers de tags; adicionar `handleCreateTodoInList`; atualizar `handleListTodos`
- [backend/main.go](backend/main.go) — remover rotas de tags; adicionar rota `POST /api/lists/{id}/todos`
- [backend/models.go](backend/models.go) — remover `Tag` e `Tags []Tag` de `Todo`
- [backend/db.go](backend/db.go) — remover funções de tags; adicionar `CreateTodoInList`
- [backend/db_test.go](backend/db_test.go) — adicionar testes para `CreateTodoInList`
- [backend/handlers_test.go](backend/handlers_test.go) — adicionar testes para novo endpoint; remover testes de tags

**Frontend:**
- [frontend/src/components/TodoItem.tsx](frontend/src/components/TodoItem.tsx) — remover props e JSX de lista
- [frontend/src/components/ListCard.tsx](frontend/src/components/ListCard.tsx) — remover props de lista
- [frontend/src/components/TodoApp.tsx](frontend/src/components/TodoApp.tsx) — remover estado e handlers de lista por tarefa
- [frontend/src/services/api.ts](frontend/src/services/api.ts) — adicionar `createTodoInList`
- [frontend/src/components/__tests__/TodoItem.test.tsx](frontend/src/components/__tests__/TodoItem.test.tsx)
- [frontend/src/components/__tests__/TodoList.test.tsx](frontend/src/components/__tests__/TodoList.test.tsx)
