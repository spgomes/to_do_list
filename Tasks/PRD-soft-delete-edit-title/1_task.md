# Tarefa 1.0: Backend — Soft Delete + Edição de Título

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar soft delete e edição de título das tarefas no backend Go.
Em vez de remover o registro do banco, o delete marca o campo `deleted_at` com o timestamp atual.
A edição de título expõe um novo endpoint exclusivo para atualizar apenas o texto da tarefa.

<requirements>
- Adicionar coluna `deleted_at TEXT NULL` na tabela `todos` via migração no `InitDB`
- `DeleteTodo` deve fazer `UPDATE todos SET deleted_at = datetime('now')` em vez de `DELETE`
- `GetAllTodos` deve filtrar `WHERE deleted_at IS NULL`
- Novo erro `ErrAlreadyDeleted` para tentativa de operar em tarefa já deletada
- Nova função `UpdateTodoTitle(db, id, title, userID)` em `db.go`
  - Validar título não vazio e não maior que 255 caracteres (reusar `ErrEmptyTitle`, `ErrTitleTooLong`)
  - Retornar `ErrNotFound` se tarefa não existir ou não pertencer ao usuário
- Novo handler `handleUpdateTodoTitle` em `handlers.go`
  - Rota: `PATCH /api/todos/{id}/title`
  - Body: `{ "title": "novo texto" }`
  - Resposta: `204 No Content` em caso de sucesso
- Struct `Todo` em `models.go` deve incluir `DeletedAt *string \`json:"deleted_at,omitempty"\``
</requirements>

## Subtarefas

- [ ] 1.1 Adicionar campo `deleted_at TEXT NULL` ao `CREATE TABLE` em `InitDB` e criar migração `ALTER TABLE` para banco já existente
- [ ] 1.2 Atualizar struct `Todo` em `models.go` com campo `DeletedAt *string`
- [ ] 1.3 Alterar `DeleteTodo` em `db.go` para soft delete
- [ ] 1.4 Alterar `GetAllTodos` em `db.go` para filtrar `deleted_at IS NULL`
- [ ] 1.5 Adicionar `UpdateTodoTitle` em `db.go` com validação de título
- [ ] 1.6 Adicionar `handleUpdateTodoTitle` em `handlers.go`
- [ ] 1.7 Registrar rota `PATCH /api/todos/{id}/title` em `main.go`
- [ ] 1.8 Escrever e executar testes

## Detalhes de Implementação

### Migração de schema

O `InitDB` já cria a tabela se não existir. Para bancos existentes sem a coluna, adicionar logo após o `CREATE TABLE`:

```go
db.Exec(`ALTER TABLE todos ADD COLUMN deleted_at TEXT NULL`)
// Ignorar erro — coluna já pode existir
```

### Soft delete

```go
// db.go
func DeleteTodo(db *sql.DB, id int64, userID int64) error {
    result, err := db.Exec(
        "UPDATE todos SET deleted_at = datetime('now') WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
        id, userID,
    )
    // checar RowsAffected == 0 → ErrNotFound
}
```

### Filtro no GetAllTodos

```go
"SELECT ... FROM todos WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC"
```

### Novo endpoint

```go
// handlers.go
// PATCH /api/todos/{id}/title → 204
func handleUpdateTodoTitle(db *sql.DB) http.HandlerFunc { ... }
```

## Critérios de Sucesso

- `DELETE /api/todos/{id}` retorna 204 mas o registro permanece no banco com `deleted_at` preenchido
- `GET /api/todos` não retorna tarefas com `deleted_at` preenchido
- `PATCH /api/todos/{id}/title` com título válido retorna 204 e persiste a alteração
- `PATCH /api/todos/{id}/title` com título vazio retorna 400
- `PATCH /api/todos/{id}/title` para tarefa de outro usuário retorna 404
- Todos os testes passam com `go test ./... -v`

## Testes da Tarefa

### Testes unitários (`db_test.go`)

- [ ] `TestSoftDeleteTodo_HidesFromList` — deletar tarefa e verificar que `GetAllTodos` não a retorna
- [ ] `TestSoftDeleteTodo_RecordPersists` — verificar que o registro ainda existe no banco após delete
- [ ] `TestSoftDeleteTodo_NotFound` — soft delete em ID inexistente retorna `ErrNotFound`
- [ ] `TestUpdateTodoTitle_Success` — atualiza título e confirma com query direta
- [ ] `TestUpdateTodoTitle_EmptyTitle` — retorna `ErrEmptyTitle`
- [ ] `TestUpdateTodoTitle_TooLong` — retorna `ErrTitleTooLong`
- [ ] `TestUpdateTodoTitle_WrongUser` — retorna `ErrNotFound`

### Testes de integração (`handlers_test.go`)

- [ ] `TestHandleDeleteTodo_SoftDelete` — `DELETE /api/todos/{id}` retorna 204 e item some do `GET /api/todos`
- [ ] `TestHandleUpdateTodoTitle_Success` — `PATCH /api/todos/{id}/title` retorna 204 e título atualizado aparece no GET
- [ ] `TestHandleUpdateTodoTitle_EmptyTitle` — retorna 400
- [ ] `TestHandleUpdateTodoTitle_NotFound` — retorna 404

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `backend/db.go` — funções de banco de dados
- `backend/handlers.go` — handlers HTTP
- `backend/models.go` — structs
- `backend/main.go` — registro de rotas
- `backend/db_test.go` — testes unitários
- `backend/handlers_test.go` — testes de integração
