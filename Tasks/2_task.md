# Tarefa 2.0: Camada de Banco de Dados (Backend)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a camada de acesso a dados do backend em Go. Este módulo (`db.go`) encapsula toda a interação com o SQLite: inicialização do banco, criação da tabela `todos` e as 4 funções CRUD. É a fundação da qual os handlers HTTP (Tarefa 3.0) dependem.

<requirements>
- Função `InitDB(dbPath string) (*sql.DB, error)` que abre/cria o banco SQLite e cria a tabela `todos`
- Função `GetAllTodos(db *sql.DB) ([]Todo, error)` que retorna todas as tarefas ordenadas por `created_at` DESC
- Função `CreateTodo(db *sql.DB, title string) (Todo, error)` que insere uma nova tarefa com status pendente
- Função `UpdateTodoStatus(db *sql.DB, id int64, completed bool) error` que atualiza o status de uma tarefa
- Função `DeleteTodo(db *sql.DB, id int64) error` que remove uma tarefa permanentemente
- Struct `Todo` com campos `ID`, `Title`, `Completed`, `CreatedAt` e tags JSON
- Modo WAL habilitado no SQLite para melhor performance
- Validação: `CreateTodo` deve retornar erro se `title` estiver vazio
- `UpdateTodoStatus` e `DeleteTodo` devem retornar erro se o `id` não existir
- Todos os testes unitários passando usando SQLite in-memory (`:memory:`)
</requirements>

## Subtarefas

- [x] 2.1 Criar struct `Todo` com tags JSON no arquivo `backend/models.go`
- [x] 2.2 Implementar `InitDB` em `backend/db.go` — abrir conexão SQLite, habilitar WAL, criar tabela `todos`
- [x] 2.3 Implementar `GetAllTodos` — query SELECT com ordenação por `created_at` DESC
- [x] 2.4 Implementar `CreateTodo` — INSERT com validação de título vazio, retornando o Todo criado com ID gerado
- [x] 2.5 Implementar `UpdateTodoStatus` — UPDATE com verificação de rows affected (retornar erro se 0)
- [x] 2.6 Implementar `DeleteTodo` — DELETE com verificação de rows affected (retornar erro se 0)
- [x] 2.7 Escrever testes unitários para todas as funções CRUD
- [x] 2.8 Escrever testes de integração (fluxo completo: criar → listar → atualizar → deletar)

## Detalhes de Implementação

Consultar a seção **"Modelos de Dados"** e **"Interfaces Principais"** na [techspec.md](../../Tasks/TechSpec.md) para os contratos exatos de cada função.

**Esquema SQL da tabela (conforme Tech Spec):**
```sql
CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    completed  BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**Pontos de atenção:**
- Usar `modernc.org/sqlite` como driver (CGO-free) — importar como `_ "modernc.org/sqlite"`
- Habilitar WAL mode após abrir conexão: `db.Exec("PRAGMA journal_mode=WAL")`
- Em `CreateTodo`, após o INSERT usar `result.LastInsertId()` para obter o ID gerado
- Em `UpdateTodoStatus` e `DeleteTodo`, usar `result.RowsAffected()` para verificar se o registro existe
- Nos testes, usar `InitDB(":memory:")` para banco em memória

## Critérios de Sucesso

- Todas as 5 funções CRUD implementadas e exportadas
- `InitDB` cria a tabela automaticamente se não existir
- `CreateTodo` rejeita títulos vazios com erro descritivo
- `UpdateTodoStatus` e `DeleteTodo` retornam erro para IDs inexistentes
- Todos os testes passam com `go test ./backend/ -v`
- Cobertura de testes inclui: caso de sucesso, título vazio, ID inexistente, listagem vazia, múltiplos registros

## Testes da Tarefa

- [x] **Teste unitário:** `TestInitDB` — verifica que a tabela `todos` é criada corretamente
- [x] **Teste unitário:** `TestCreateTodo_Success` — cria tarefa e verifica ID, título, status pendente
- [x] **Teste unitário:** `TestCreateTodo_EmptyTitle` — verifica que retorna erro para título vazio
- [x] **Teste unitário:** `TestGetAllTodos_Empty` — verifica que retorna lista vazia quando não há tarefas
- [x] **Teste unitário:** `TestGetAllTodos_MultipleTodos` — cria várias tarefas e verifica a listagem
- [x] **Teste unitário:** `TestUpdateTodoStatus_Success` — atualiza status e verifica com GetAllTodos
- [x] **Teste unitário:** `TestUpdateTodoStatus_NotFound` — verifica erro para ID inexistente
- [x] **Teste unitário:** `TestDeleteTodo_Success` — deleta tarefa e verifica que não aparece mais na lista
- [x] **Teste unitário:** `TestDeleteTodo_NotFound` — verifica erro para ID inexistente
- [x] **Teste de integração:** `TestCRUDFlow` — fluxo completo: criar → listar → marcar como concluída → listar → deletar → listar vazia

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `backend/models.go` — Struct Todo (novo)
- `backend/db.go` — Funções de acesso a dados (novo)
- `backend/db_test.go` — Testes unitários e de integração (novo)
- `backend/go.mod` — Dependência de `modernc.org/sqlite`
- [PRD](../../Tasks/PRD.md) — Requisitos funcionais 1-6, 12-19
- [Tech Spec](../../Tasks/TechSpec.md) — Seções "Modelos de Dados", "Interfaces Principais", "Abordagem de Testes"
