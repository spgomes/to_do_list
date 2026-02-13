# Tarefa 1.0: Correções do Code Review do To-Do List

## Visao Geral

Corrigir todas as issues identificadas no code review do projeto To-Do List, abrangendo problemas critical, medium e minor no backend (Go) e frontend (React/TypeScript). As correções incluem tratamento de erros, configuração de testes, robustez do servidor, validação de input, limpeza do projeto e configuração por variáveis de ambiente.

<requirements>
- Todos os erros assíncronos nos handlers React devem ser capturados e exibidos ao usuário
- O ambiente de testes Vitest deve usar jsdom para testes de componentes React
- O backend deve tratar erros de encoding JSON e fechar graciosamente
- Títulos de tarefas devem ter limite de tamanho no backend e frontend
- URLs hardcoded devem ser substituídas por variáveis de ambiente
- Arquivos desnecessários devem ser removidos e o .gitignore atualizado
- Todos os testes existentes devem continuar passando após as correções
</requirements>

## Subtarefas

- [x] 1.1 Limpeza do projeto e correção do .gitignore
- [x] 1.2 Correções de robustez no backend Go (writeJSON, graceful shutdown, SQLite pool)
- [x] 1.3 Validação de tamanho do título (backend + frontend)
- [x] 1.4 Correções no frontend React/TypeScript (error handling, Vitest, API service)
- [x] 1.5 Configuração de URLs por environment variables (backend + frontend)
- [x] 1.6 Executar todos os testes e validar correções

## Detalhes de Implementação

### 1.1 Limpeza do projeto e correção do .gitignore

**Issues**: #8 (nul file), #9 (root node_modules), #10 (test-results)

**Arquivos a modificar**: `.gitignore`
**Arquivos a deletar**: `nul`

O que fazer:
1. Deletar o arquivo `nul` na raiz do projeto (artefato Windows)
2. Adicionar as seguintes entradas ao `.gitignore`:
   ```
   # Root dependencies
   node_modules/

   # Test artifacts
   test-results/
   ```
   > Nota: `frontend/node_modules/` já está no .gitignore, mas a entrada `node_modules/` na raiz cobre qualquer diretório node_modules em qualquer nível do projeto.
3. Verificar que `frontend/test-results/` e o `node_modules/` da raiz não serão rastreados pelo git

**Testes**: Nenhum teste automatizado necessário. Validar manualmente com `git status` que os diretórios ignorados não aparecem como untracked.

---

### 1.2 Correções de robustez no backend Go

**Issues**: #3 (writeJSON), #6 (graceful shutdown), #11 (SQLite pool)

#### 1.2.1 — Tratar erro do writeJSON (`handlers.go:12-16`)

**Arquivo**: `backend/handlers.go`

O `json.NewEncoder(w).Encode(v)` pode falhar e o erro é ignorado. Adicionar log do erro.

**Antes:**
```go
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
```

**Depois:**
```go
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("failed to encode JSON response", "error", err)
	}
}
```

> Nota: Depois de `WriteHeader`, não é possível alterar o status code. Por isso apenas logamos o erro. Adicionar `"log/slog"` aos imports se necessário.

#### 1.2.2 — Graceful shutdown (`main.go`)

**Arquivo**: `backend/main.go`

Substituir `log.Fatal(http.ListenAndServe(...))` por um servidor com graceful shutdown usando `os/signal` e `context`.

**Depois:**
```go
func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, nil)))

	db, err := InitDB("todos.db")
	if err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}
	defer db.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/todos", handleListTodos(db))
	mux.HandleFunc("POST /api/todos", handleCreateTodo(db))
	mux.HandleFunc("PATCH /api/todos/{id}", handleUpdateTodo(db))
	mux.HandleFunc("DELETE /api/todos/{id}", handleDeleteTodo(db))

	handler := loggingMiddleware(corsMiddleware(mux))

	srv := &http.Server{
		Addr:    ":8080",
		Handler: handler,
	}

	go func() {
		slog.Info("server starting", "port", 8080)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("server forced to shutdown: %v", err)
	}

	slog.Info("server stopped")
}
```

> Nota: Adicionar `"context"`, `"os/signal"`, `"syscall"`, `"time"` aos imports.

#### 1.2.3 — SQLite connection pool tuning (`db.go:18-22`)

**Arquivo**: `backend/db.go`

Adicionar configuração do pool de conexões logo após abrir o banco de dados, antes do `Ping()`:

```go
db.SetMaxOpenConns(1)
db.SetMaxIdleConns(1)
db.SetConnMaxLifetime(0)
```

> Nota: SQLite permite apenas um writer por vez. `SetMaxOpenConns(1)` evita erros `SQLITE_BUSY` em cenários de escrita concorrente.

---

### 1.3 Validação de tamanho do título (backend + frontend)

**Issue**: #7

#### 1.3.1 — Validação no backend (`db.go`)

**Arquivo**: `backend/db.go`

Adicionar constante e erro sentinela:
```go
const MaxTitleLength = 255

var ErrTitleTooLong = errors.New("title exceeds maximum length")
```

Na função `CreateTodo`, após o trim e antes do INSERT, adicionar:
```go
if len(trimmed) > MaxTitleLength {
    return Todo{}, ErrTitleTooLong
}
```

**Arquivo**: `backend/handlers.go`

No `handleCreateTodo`, adicionar tratamento do novo erro:
```go
if errors.Is(err, ErrTitleTooLong) {
    writeError(w, http.StatusBadRequest, "title exceeds maximum length of 255 characters")
    return
}
```

#### 1.3.2 — Validação no frontend

**Arquivo**: `frontend/src/components/TodoForm.tsx`

Adicionar `maxLength={255}` ao input:
```tsx
<input
  type="text"
  className="todo-form-input"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Nova tarefa..."
  aria-label="Titulo da tarefa"
  maxLength={255}
/>
```

---

### 1.4 Correções no frontend React/TypeScript

**Issues**: #1 (error handling), #2 (Vitest env), #4 (API duplicação)

#### 1.4.1 — Try/catch nos handlers assíncronos (`App.tsx:20-35`)

**Arquivo**: `frontend/src/App.tsx`

Envolver cada handler com try/catch e exibir o erro ao usuário:

```tsx
async function handleAdd(title: string) {
  try {
    const newTodo = await createTodo(title);
    setTodos((prev) => [newTodo, ...prev]);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Erro ao adicionar tarefa");
  }
}

async function handleToggle(id: number, completed: boolean) {
  try {
    await updateTodo(id, completed);
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed } : t))
    );
  } catch (err) {
    setError(err instanceof Error ? err.message : "Erro ao atualizar tarefa");
  }
}

async function handleDelete(id: number) {
  try {
    await deleteTodo(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  } catch (err) {
    setError(err instanceof Error ? err.message : "Erro ao remover tarefa");
  }
}
```

> Nota: A variável `error` e `setError` já existem no componente. Considere também adicionar um mecanismo para limpar o erro (ex: timeout de 5 segundos ou botão de fechar).

#### 1.4.2 — Corrigir environment do Vitest (`vite.config.ts:9`)

**Arquivo**: `frontend/vite.config.ts`

Alterar `environment: 'node'` para `environment: 'jsdom'`:

```ts
test: {
  globals: true,
  environment: 'jsdom',
  exclude: ['e2e/**', 'node_modules/**'],
},
```

> Nota: Pode ser necessário instalar o pacote `jsdom` como dev dependency: `npm install -D jsdom`

#### 1.4.3 — Extrair handleVoidResponse no API service (`api.ts:27-47`)

**Arquivo**: `frontend/src/services/api.ts`

Criar uma função helper para respostas sem body (204 No Content) e substituir a lógica duplicada:

```ts
async function handleVoidResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error || "Unknown error");
  }
}

export async function updateTodo(id: number, completed: boolean): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });
  return handleVoidResponse(response);
}

export async function deleteTodo(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
    method: "DELETE",
  });
  return handleVoidResponse(response);
}
```

---

### 1.5 Configuração de URLs por environment variables

**Issue**: #5

#### 1.5.1 — Backend: CORS origin configurável (`middleware.go:12`)

**Arquivo**: `backend/middleware.go`

Tornar o CORS origin configurável via variável de ambiente com fallback para o valor atual:

```go
func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigin := os.Getenv("CORS_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:5173"
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		// ... resto do código
	})
}
```

> Nota: Adicionar `"os"` aos imports.

#### 1.5.2 — Frontend: API URL configurável (`api.ts:3`)

**Arquivo**: `frontend/src/services/api.ts`

Usar a variável de ambiente do Vite:

```ts
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
```

**Arquivo a criar** (opcional): `frontend/.env`
```
VITE_API_URL=http://localhost:8080/api
```

**Arquivo**: `frontend/.env.example` (para documentar)
```
VITE_API_URL=http://localhost:8080/api
```

> Nota: O prefixo `VITE_` é obrigatório para variáveis de ambiente acessíveis no frontend com Vite.

---

### 1.6 Executar todos os testes e validar correções

1. **Backend (Go)**:
   ```bash
   cd backend && go test ./... -v
   ```
2. **Frontend (Vitest)**:
   ```bash
   cd frontend && npm test
   ```
3. **Frontend (E2E com Playwright)** (requer backend rodando):
   ```bash
   cd frontend && npx playwright test
   ```
4. Verificar que **todos os testes passam** sem regressões.

---

## Criterios de Sucesso

- `handleAdd`, `handleToggle` e `handleDelete` capturam erros e exibem mensagem ao usuário via `setError`
- Vitest roda com `jsdom` e todos os testes de componentes passam
- `writeJSON` loga erros de encoding em vez de ignorá-los
- `updateTodo` e `deleteTodo` no api.ts usam `handleVoidResponse` sem duplicação
- CORS origin e API URL são configuráveis via variáveis de ambiente, com fallback para valores de desenvolvimento
- Servidor Go faz graceful shutdown ao receber SIGINT/SIGTERM
- Títulos são limitados a 255 caracteres no backend (retorna 400) e no frontend (maxLength)
- Arquivo `nul` deletado, `.gitignore` cobre `node_modules/`, `test-results/`
- SQLite usa `SetMaxOpenConns(1)` para evitar erros de concorrência
- Todos os testes existentes (unitários, integração, E2E) continuam passando

## Testes da Tarefa

- [ ] Testes de unidade: `CreateTodo` com título > 255 caracteres retorna `ErrTitleTooLong`
- [ ] Testes de unidade: `handleCreateTodo` retorna 400 para título > 255 caracteres
- [ ] Testes de unidade: Vitest roda com ambiente `jsdom` sem erros
- [ ] Testes de integração: Backend Go (`go test ./... -v`) — todos passam
- [ ] Testes de integração: Frontend Vitest (`npm test`) — todos passam
- [ ] Testes E2E: Playwright (`npx playwright test`) — todos passam
- [ ] Teste manual: Enviar SIGINT ao backend e verificar shutdown gracioso
- [ ] Teste manual: `git status` não mostra `nul`, `node_modules/`, ou `test-results/`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERA-LA FINALIZADA</critical>

## Arquivos relevantes

**Backend (Go):**
- `backend/main.go` — graceful shutdown
- `backend/handlers.go` — writeJSON error handling, title length validation
- `backend/db.go` — SQLite pool tuning, ErrTitleTooLong
- `backend/middleware.go` — CORS origin configurável
- `backend/db_test.go` — novos testes de title length
- `backend/handlers_test.go` — novos testes de title length no handler

**Frontend (React/TypeScript):**
- `frontend/src/App.tsx` — try/catch nos handlers
- `frontend/src/services/api.ts` — handleVoidResponse, API URL configurável
- `frontend/src/components/TodoForm.tsx` — maxLength no input
- `frontend/vite.config.ts` — environment: jsdom

**Projeto:**
- `.gitignore` — novas entradas
- `nul` — deletar
- `frontend/.env.example` — documentar variável VITE_API_URL
