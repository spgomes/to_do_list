# Tarefa 3.0: API REST — Handlers, Routing e CORS (Backend)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar os handlers HTTP, o middleware de CORS e o roteamento que expõem as operações CRUD como uma API REST JSON. Esta tarefa transforma as funções de banco de dados (Tarefa 2.0) em endpoints HTTP acessíveis pelo frontend. Inclui também logging estruturado de requisições.

**Dependência:** Tarefa 2.0 (camada de banco de dados) deve estar concluída.

<requirements>
- 4 endpoints REST implementados: `GET /api/todos`, `POST /api/todos`, `PATCH /api/todos/{id}`, `DELETE /api/todos/{id}`
- Middleware CORS que permite requisições de `http://localhost:5173`
- Middleware de logging que registra método, path, status e duração de cada requisição
- Respostas JSON com content-type `application/json`
- Tratamento de erros padronizado: `{ "error": "mensagem" }` com códigos HTTP corretos (400, 404, 500)
- Handler de `POST` valida que o body contém `title` não vazio
- Handler de `PATCH` aceita body `{ "completed": bool }` e atualiza o status
- Handler de `DELETE` remove a tarefa e retorna 204
- Servidor HTTP iniciando na porta 8080 com todas as rotas registradas
- Testes de handlers usando `httptest.NewRecorder` e testes de integração com `httptest.NewServer`
</requirements>

## Subtarefas

- [x] 3.1 Implementar middleware CORS em `backend/middleware.go`
- [x] 3.2 Implementar middleware de logging em `backend/middleware.go` (usando `log/slog`)
- [x] 3.3 Implementar `handleListTodos` em `backend/handlers.go` — GET /api/todos → retorna `[]Todo` (200)
- [x] 3.4 Implementar `handleCreateTodo` em `backend/handlers.go` — POST /api/todos → cria tarefa, retorna `Todo` (201)
- [x] 3.5 Implementar `handleUpdateTodo` em `backend/handlers.go` — PATCH /api/todos/{id} → atualiza status (204)
- [x] 3.6 Implementar `handleDeleteTodo` em `backend/handlers.go` — DELETE /api/todos/{id} → remove tarefa (204)
- [x] 3.7 Atualizar `backend/main.go` — inicializar DB, registrar rotas com middlewares, iniciar servidor
- [x] 3.8 Escrever testes de handlers (unitários com `httptest.NewRecorder`)
- [x] 3.9 Escrever testes de integração (servidor completo com `httptest.NewServer` + SQLite in-memory)

## Detalhes de Implementação

Consultar as seções **"Endpoints de API"**, **"Pontos de Integração"** (CORS) e **"Monitoramento e Observabilidade"** (logging) na [techspec.md](../../Tasks/TechSpec.md).

**Tabela de endpoints (conforme Tech Spec):**

| Método | Caminho | Request Body | Response | Status |
|--------|---------|-------------|----------|--------|
| GET | `/api/todos` | — | `Todo[]` | 200 |
| POST | `/api/todos` | `{ "title": "string" }` | `Todo` | 201 |
| PATCH | `/api/todos/{id}` | `{ "completed": bool }` | — | 204 |
| DELETE | `/api/todos/{id}` | — | — | 204 |

**Pontos de atenção:**
- Usar `http.NewServeMux()` do Go 1.22+ que suporta pattern matching com métodos (ex: `"GET /api/todos"`)
- Para extrair `{id}` da URL, usar `r.PathValue("id")` (Go 1.22+)
- Converter `id` de string para int64 com `strconv.ParseInt`
- Em POST, decodificar body com `json.NewDecoder(r.Body).Decode(&req)`
- Em respostas JSON, definir `w.Header().Set("Content-Type", "application/json")`
- Para errors, usar helper function que escreve `{ "error": "msg" }` com status code correto

## Critérios de Sucesso

- `curl http://localhost:8080/api/todos` retorna `[]` (lista vazia em JSON)
- `curl -X POST -d '{"title":"Teste"}' http://localhost:8080/api/todos` retorna a tarefa criada com status 201
- `curl -X PATCH -d '{"completed":true}' http://localhost:8080/api/todos/1` retorna 204
- `curl -X DELETE http://localhost:8080/api/todos/1` retorna 204
- Requests inválidos retornam erros JSON com status codes corretos
- Logs aparecem no console com formato estruturado
- Todos os testes passam com `go test ./backend/ -v`

## Testes da Tarefa

- [x] **Teste unitário:** `TestHandleListTodos_Empty` — GET retorna `[]` com status 200
- [x] **Teste unitário:** `TestHandleCreateTodo_Success` — POST com título válido retorna 201 e todo criado
- [x] **Teste unitário:** `TestHandleCreateTodo_EmptyTitle` — POST sem título retorna 400 com erro
- [x] **Teste unitário:** `TestHandleCreateTodo_InvalidJSON` — POST com body inválido retorna 400
- [x] **Teste unitário:** `TestHandleUpdateTodo_Success` — PATCH com status válido retorna 204
- [x] **Teste unitário:** `TestHandleUpdateTodo_NotFound` — PATCH com ID inexistente retorna 404
- [x] **Teste unitário:** `TestHandleUpdateTodo_InvalidID` — PATCH com ID não-numérico retorna 400
- [x] **Teste unitário:** `TestHandleDeleteTodo_Success` — DELETE com ID válido retorna 204
- [x] **Teste unitário:** `TestHandleDeleteTodo_NotFound` — DELETE com ID inexistente retorna 404
- [x] **Teste unitário:** `TestCORSMiddleware` — verifica headers CORS na resposta e preflight OPTIONS
- [x] **Teste de integração:** `TestAPIFullCRUDFlow` — fluxo completo via HTTP: criar → listar → atualizar → listar → deletar → listar vazia

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `backend/handlers.go` — Handlers HTTP para cada endpoint (novo)
- `backend/middleware.go` — CORS e logging middleware (novo)
- `backend/main.go` — Atualizar com rotas e inicialização do DB
- `backend/handlers_test.go` — Testes de handlers (novo)
- `backend/db.go` — Funções de acesso a dados (da Tarefa 2.0)
- `backend/models.go` — Struct Todo (da Tarefa 2.0)
- [PRD](../../Tasks/PRD.md) — Requisitos funcionais 1-19
- [Tech Spec](../../Tasks/TechSpec.md) — Seções "Endpoints de API", "Pontos de Integração", "Monitoramento"
