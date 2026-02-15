# Tasks: Soft Delete + Edição de Título

## Visão Geral

Adicionar soft delete (campo `deleted_at`) e edição inline de título nas tarefas.
Tarefas deletadas não são removidas do banco — apenas marcadas como deletadas.
O usuário pode editar o título de uma tarefa existente diretamente na lista.

## Lista de Tarefas

| # | Tarefa | Dependências | Status |
|---|--------|-------------|--------|
| 1.0 | Backend: Soft Delete + Edição de Título | — | pending |
| 2.0 | Frontend: Edição Inline de Título | 1.0 | pending |
| 3.0 | Testes E2E | 1.0, 2.0 | pending |

## Sequenciamento

```
1.0 Backend ──► 2.0 Frontend ──► 3.0 E2E
```

## Arquivos impactados

### Backend
- `backend/db.go` — schema, `DeleteTodo` (soft), `UpdateTodoTitle`
- `backend/handlers.go` — `handleUpdateTodoTitle`, rota
- `backend/models.go` — campo `DeletedAt` no struct `Todo`
- `backend/db_test.go` — testes unitários das funções de DB
- `backend/handlers_test.go` — testes de integração dos handlers

### Frontend
- `frontend/src/types/todo.ts` — campo `deleted_at` (opcional)
- `frontend/src/services/api.ts` — função `updateTodoTitle`
- `frontend/src/components/TodoItem.tsx` — modo edição inline
