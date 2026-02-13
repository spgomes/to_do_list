# Especificação Técnica — To-Do List

## Resumo Executivo

A aplicação será construída como uma arquitetura cliente-servidor com separação clara entre frontend e backend. O **backend em Go** utiliza a biblioteca padrão `net/http` (Go 1.22+) para servir uma API REST JSON, com persistência via **SQLite** usando o driver `modernc.org/sqlite` (CGO-free). O **frontend em React + TypeScript** é scaffoldado com **Vite**, rodando em porta separada durante o desenvolvimento com CORS habilitado no backend. A comunicação segue o padrão REST com 4 endpoints cobrindo as operações CRUD sobre tarefas.

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
┌─────────────────────┐        HTTP/JSON        ┌─────────────────────────┐
│   Frontend (React)  │ ◄──────────────────────► │    Backend (Go API)     │
│   Vite :5173        │        CORS enabled      │    net/http :8080       │
└─────────────────────┘                          └────────┬────────────────┘
                                                          │
                                                          ▼
                                                 ┌────────────────┐
                                                 │  SQLite (file) │
                                                 │  todos.db      │
                                                 └────────────────┘
```

**Componentes e responsabilidades:**

- **Backend Go (`/backend`)** — API REST que recebe requisições HTTP, valida dados, executa operações no banco e retorna respostas JSON. Responsável por toda lógica de persistência e validação server-side.
- **Camada de banco de dados** — Módulo interno que encapsula acesso ao SQLite via `database/sql` + driver `modernc.org/sqlite`. Responsável por criar tabela, executar queries e gerenciar conexão.
- **Frontend React (`/frontend`)** — SPA em TypeScript que consome a API REST. Responsável por renderização da UI, gerenciamento de estado local, validação client-side e feedback visual ao usuário.
- **Camada de serviços HTTP (frontend)** — Módulo que abstrai chamadas `fetch` à API, centralizando URLs, tratamento de erros e parsing de respostas JSON.

**Fluxo de dados:**
1. Usuário interage com o React UI
2. Frontend faz `fetch()` para `http://localhost:8080/api/todos`
3. Backend processa a requisição, interage com SQLite
4. Backend retorna resposta JSON
5. Frontend atualiza o estado e re-renderiza

## Design de Implementação

### Interfaces Principais

```go
// handler.go — Handlers HTTP para cada operação CRUD
func handleListTodos(db *sql.DB) http.HandlerFunc
func handleCreateTodo(db *sql.DB) http.HandlerFunc
func handleUpdateTodo(db *sql.DB) http.HandlerFunc
func handleDeleteTodo(db *sql.DB) http.HandlerFunc

// db.go — Camada de acesso a dados
func InitDB(dbPath string) (*sql.DB, error)
func GetAllTodos(db *sql.DB) ([]Todo, error)
func CreateTodo(db *sql.DB, title string) (Todo, error)
func UpdateTodoStatus(db *sql.DB, id int64, completed bool) error
func DeleteTodo(db *sql.DB, id int64) error
```

```typescript
// services/api.ts — Camada de serviço HTTP no frontend
export async function fetchTodos(): Promise<Todo[]>
export async function createTodo(title: string): Promise<Todo>
export async function updateTodo(id: number, completed: boolean): Promise<void>
export async function deleteTodo(id: number): Promise<void>
```

### Modelos de Dados

**Entidade de domínio (Go):**

```go
type Todo struct {
    ID        int64  `json:"id"`
    Title     string `json:"title"`
    Completed bool   `json:"completed"`
    CreatedAt string `json:"created_at"`
}
```

**Tipo correspondente (TypeScript):**

```typescript
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
}
```

**Esquema SQLite:**

```sql
CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    completed  BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**Tipos de requisição/resposta:**

| Operação | Request Body | Response Body |
|---|---|---|
| Create | `{ "title": "string" }` | `Todo` (201) |
| List | — | `Todo[]` (200) |
| Update | `{ "completed": bool }` | — (204) |
| Delete | — | — (204) |

### Endpoints de API

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/todos` | Lista todas as tarefas |
| `POST` | `/api/todos` | Cria uma nova tarefa |
| `PATCH` | `/api/todos/{id}` | Atualiza status de uma tarefa |
| `DELETE` | `/api/todos/{id}` | Remove uma tarefa permanentemente |

**Tratamento de erros padrão:**

```json
{ "error": "mensagem descritiva" }
```

Códigos: `400` (validação), `404` (não encontrado), `500` (erro interno).

## Pontos de Integração

Não há integrações externas. A única integração é entre o frontend React e o backend Go via API REST local.

**CORS** será habilitado no backend via middleware customizado para permitir requisições do Vite dev server (`http://localhost:5173`):

```go
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

## Abordagem de Testes

### Testes Unitários

- **Backend (Go):** testar funções de acesso a dados (`db.go`) usando SQLite in-memory (`:memory:`). Testar handlers isoladamente com `httptest.NewRecorder`.
- **Frontend (React):** testar componentes com React Testing Library. Testar serviço de API com mocks de `fetch`.
- **Cenários críticos:** validação de título vazio, criação com sucesso, toggle de status, deleção de tarefa inexistente (404).

### Testes de Integração

- Testar o fluxo completo de cada endpoint (handler → DB → resposta) usando `httptest.NewServer` com banco SQLite in-memory.
- Validar que operações CRUD persistem e recuperam dados corretamente.

### Testes de E2E

- Utilizar **Playwright** para testar fluxos completos no navegador:
  - Adicionar tarefa e verificar que aparece na lista
  - Marcar como concluída e verificar diferenciação visual
  - Remover tarefa com confirmação e verificar remoção da lista
  - Validação de campo vazio e feedback visual

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Setup do projeto e estrutura de diretórios** — Criar `backend/` e `frontend/`, inicializar `go mod` e `npm create vite@latest`
2. **Camada de banco de dados (`backend/db.go`)** — Inicialização do SQLite, criação da tabela, funções CRUD. Primeiro porque é a fundação que os handlers dependem.
3. **Handlers HTTP e roteamento (`backend/main.go`, `backend/handlers.go`)** — Endpoints REST, CORS middleware, servidor HTTP. Depende da camada de banco.
4. **Camada de serviço HTTP do frontend (`frontend/src/services/api.ts`)** — Abstração de chamadas fetch. Depende dos endpoints estarem definidos.
5. **Componentes React e UI (`frontend/src/components/`)** — TodoForm, TodoList, TodoItem. Integra com a camada de serviço.
6. **Estilização e responsividade** — CSS/Tailwind para design limpo e responsivo.
7. **Testes e polimento** — Testes unitários, integração e E2E.

### Dependências Técnicas

| Dependência | Versão | Propósito |
|---|---|---|
| Go | 1.22+ | Backend, routing com net/http melhorado |
| `modernc.org/sqlite` | latest | Driver SQLite sem CGO |
| Node.js | 20+ | Runtime para tooling do frontend |
| Vite | 6.x | Build tool e dev server para React |
| React | 19.x | Biblioteca de UI |
| TypeScript | 5.x | Tipagem estática no frontend |
| Playwright | latest | Testes E2E |

Nenhuma dependência bloqueante externa. Todas as ferramentas são open-source e de instalação local.

## Monitoramento e Observabilidade

Por ser uma aplicação local de portfólio, a abordagem de observabilidade é simplificada:

- **Logs estruturados no backend:** usar `log/slog` (stdlib Go) com nível INFO para requisições e ERROR para falhas. Formato: `timestamp | method | path | status | duration`.
- **Log de requisições:** middleware que loga cada request com método, path, status code e tempo de resposta.
- **Console do navegador:** erros de rede e respostas inesperadas da API logados no console do frontend em modo development.
- **Sem métricas Prometheus ou Grafana** — fora do escopo para aplicação local.

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa | Alternativa Rejeitada |
|---|---|---|
| `net/http` stdlib | Zero dependências, idiomático, Go 1.22+ tem routing adequado para CRUD simples | Chi/Gin — overhead desnecessário para 4 endpoints |
| `modernc.org/sqlite` | Sem CGO, setup simples, portável, ideal para portfólio | `mattn/go-sqlite3` — requer compilador C, dificulta setup |
| React + Vite + TS | Setup rápido, HMR, TypeScript valorizado em portfólio | CRA — deprecated; JS puro — menos profissional |
| CORS + portas separadas | DX padrão de mercado, HMR funcional, separação clara | Go servindo frontend — pior DX em desenvolvimento |
| `PATCH` para update | Semanticamente correto para atualização parcial (só status) | `PUT` — implica substituição completa do recurso |

### Riscos Conhecidos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| SQLite file locking em escritas concorrentes | Baixa (usuário único) | Modo WAL habilitado; sem concorrência real |
| Perda de dados se `todos.db` for deletado | Baixa | Documentar localização do arquivo no README |
| CORS bloqueado em navegadores antigos | Muito baixa | Suporte moderno; fora do escopo suportar legacy |

### Conformidade com Padrões

Não existem regras definidas em `.claude/rules` no projeto atual. A Tech Spec segue boas práticas gerais:

- Separação clara entre frontend e backend
- API RESTful com verbos HTTP semânticos
- Código organizado por responsabilidade (handlers, db, services, components)
- TypeScript para type-safety no frontend

### Arquivos Relevantes e Dependentes

**Novos arquivos a criar:**

```
backend/
├── main.go              # Entrypoint, setup do servidor e rotas
├── handlers.go          # Handlers HTTP para cada endpoint
├── db.go                # Inicialização do SQLite e funções de acesso
├── middleware.go         # CORS middleware
├── go.mod               # Módulo Go
└── go.sum

frontend/
├── src/
│   ├── App.tsx           # Componente raiz
│   ├── main.tsx          # Entrypoint React
│   ├── components/
│   │   ├── TodoForm.tsx  # Formulário de adição de tarefa
│   │   ├── TodoList.tsx  # Lista de tarefas
│   │   └── TodoItem.tsx  # Item individual de tarefa
│   ├── services/
│   │   └── api.ts        # Camada de chamadas HTTP
│   └── types/
│       └── todo.ts       # Interface Todo
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

**Arquivos existentes referenciados:**

- [Tasks/prd-toDoList/prd.md](Tasks/prd-toDoList/prd.md) — PRD fonte dos requisitos
