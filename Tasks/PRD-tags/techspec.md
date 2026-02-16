# Especificação Técnica — Tags nas Tarefas

## Resumo Executivo

Esta funcionalidade adiciona **tags** (rótulos) às tarefas, com persistência no SQLite e APIs REST no backend Go. O frontend React passa a exibir tags por tarefa e permite associar/desassociar tags sem recarregar a página.

A modelagem é feita com uma tabela `tags` e uma tabela de relacionamento `todo_tags` (N:N). Todas as operações são **escopadas ao usuário autenticado**.

## Arquitetura do Sistema

### Visão Geral dos Componentes

Componentes novos/modificados:

- **Backend (`/backend`)**
  - `models.go`: adicionar `Tag` e (opcional) `Todo.Tags []Tag`
  - `db.go`: criar tabelas `tags` e `todo_tags`; adicionar funções CRUD e de vínculo
  - `handlers.go` + roteamento: endpoints REST para tags e para associação com todos
- **Frontend (`/frontend`)**
  - `src/types/*`: adicionar `Tag` e atualizar `Todo` para incluir tags
  - `src/services/api.ts`: criar funções de API para tags e para associar/desassociar
  - `src/components/*`: UI para exibir e gerenciar tags

Fluxo de dados:
1. Usuário cria/seleciona tags no frontend
2. Frontend chama endpoints de tags/vínculos
3. Backend valida, persiste e retorna JSON
4. Frontend atualiza estado e re-renderiza

## Design de Implementação

### Interfaces Principais

Backend (assinaturas exemplificadas; nomes finais podem variar):

```go
type Tag struct {
    ID        int64  `json:"id"`
    Name      string `json:"name"`
    CreatedAt string `json:"created_at"`
    UserID    int64  `json:"user_id,omitempty"`
}

func ListTags(db *sql.DB, userID int64) ([]Tag, error)
func CreateTag(db *sql.DB, name string, userID int64) (Tag, error)
func UpdateTagName(db *sql.DB, tagID int64, name string, userID int64) error
func DeleteTag(db *sql.DB, tagID int64, userID int64) error

func AddTagToTodo(db *sql.DB, todoID int64, tagID int64, userID int64) error
func RemoveTagFromTodo(db *sql.DB, todoID int64, tagID int64, userID int64) error
func ListTodoTags(db *sql.DB, todoID int64, userID int64) ([]Tag, error)
```

Frontend (assinaturas exemplificadas):

```ts
export interface Tag {
  id: number
  name: string
  created_at: string
}

export async function fetchTags(): Promise<Tag[]>
export async function createTag(name: string): Promise<Tag>
export async function updateTag(id: number, name: string): Promise<void>
export async function deleteTag(id: number): Promise<void>

export async function addTagToTodo(todoId: number, tagId: number): Promise<void>
export async function removeTagFromTodo(todoId: number, tagId: number): Promise<void>
```

### Modelos de Dados

#### SQLite

Tabela `tags`:

```sql
CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(user_id, name)
);
```

Tabela `todo_tags`:

```sql
CREATE TABLE IF NOT EXISTS todo_tags (
  todo_id INTEGER NOT NULL REFERENCES todos(id),
  tag_id  INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (todo_id, tag_id)
);
```

Notas:
- `UNIQUE(user_id, name)` impede duplicidade por usuário (pode exigir normalização do nome)
- `todo_tags` usa PK composta para impedir vínculo duplicado
- Consultas que retornam todos podem usar `JOIN` (ou consultas adicionais) para incluir tags por todo

#### Requisições/Respostas (JSON)

- **Criar tag**
  - Request: `{ "name": "string" }`
  - Response: `Tag` (201)
- **Listar tags**
  - Response: `Tag[]` (200)
- **Atualizar tag**
  - Request: `{ "name": "string" }` (PATCH/PUT)
  - Response: 204
- **Deletar tag**
  - Response: 204
- **Vincular tag**
  - Response: 204
- **Desvincular tag**
  - Response: 204
- **Listar todos**
  - Response: `Todo[]` com `tags?: Tag[]` (200)

### Endpoints de API

Proposta (paths podem ser ajustados ao roteamento atual):

- `GET /api/tags` — lista tags do usuário
- `POST /api/tags` — cria tag
- `PATCH /api/tags/{id}` — renomeia tag
- `DELETE /api/tags/{id}` — remove tag

Associação com tarefa:

- `POST /api/todos/{id}/tags/{tagId}` — associa tag à tarefa
- `DELETE /api/todos/{id}/tags/{tagId}` — desassocia tag

Listagem de todos:

- `GET /api/todos` — incluir tags associadas em cada item (se viável sem degradação)

### Validações e Erros

- Nome de tag:
  - trimming de espaços
  - vazio → 400
  - acima do limite → 400
  - duplicado (por usuário) → 409
- Acesso/escopo:
  - tag/todo não pertencem ao usuário → 404 (evita enumerar IDs)
- Resposta de erro padrão:

```json
{ "error": "mensagem descritiva" }
```

## Pontos de Integração

Não há integrações externas. Integração é apenas frontend ↔ backend.

## Abordagem de Testes

### Testes Unidade

- Backend:
  - Funções `CreateTag`, `ListTags`, `AddTagToTodo`, `RemoveTagFromTodo`
  - Casos críticos: nome vazio, muito longo, duplicado, vínculo duplicado
- Frontend:
  - Services de tags com mocks de `fetch`
  - Componentes de tags (chips e seleção) com React Testing Library

### Testes de Integração

- Backend:
  - `httptest.NewServer` com SQLite in-memory
  - Fluxos: criar tag → listar → associar a todo → listar todos com tags → desassociar → deletar tag

### Testes de E2E

- Playwright:
  - Criar tag e ver aparecer
  - Atribuir tag a uma tarefa e ver chip na lista
  - Remover tag de uma tarefa
  - Renomear e deletar tag (e verificar comportamento em tarefas já taggeadas)

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Persistência (DB e modelos)**: tabelas + funções no backend
2. **Endpoints e handlers**: API completa para tags e vínculo
3. **Frontend services e types**: contrato API + tipagem
4. **UI de tags**: componentes e integração com fluxo de tarefas
5. **E2E**: validação do fluxo ponta-a-ponta

### Dependências Técnicas

- Backend Go + SQLite (`modernc.org/sqlite`)
- Frontend: Vitest + Testing Library para unitários; Playwright para E2E (já presente no projeto)

## Monitoramento e Observabilidade

- Logs no backend: logar falhas em operações de tags/vínculos (status e error)
- Sem métricas adicionais (fora do escopo)

## Considerações Técnicas

### Decisões Principais

- **Tabela N:N (`todo_tags`)** ao invés de `tags` como string no todo:
  - Evita inconsistência, facilita renomear/remover tags e garante integridade
- **Escopo por usuário**:
  - Todas as queries devem filtrar por `user_id`
  - Erro 404 para recursos fora do escopo, evitando enumeração de IDs

### Riscos Conhecidos

- **Performance de listagem**: incluir tags no `GET /api/todos` pode exigir JOINs; mitigar com queries eficientes e índices se necessário
- **Migração**: adicionar novas tabelas deve ser compatível com bancos existentes

### Conformidade com Padrões

- Não há regras específicas em `.claude/rules` atualmente; seguir o padrão já usado no backend (validação + erros JSON) e no frontend (services centralizados).

### Arquivos relevantes e dependentes

- Backend: `backend/db.go`, `backend/handlers.go`, `backend/models.go`, `backend/handlers_test.go`, `backend/db_test.go`
- Frontend: `frontend/src/services/api.ts`, `frontend/src/types/todo.ts`, `frontend/src/components/*`, `frontend/e2e/*` (se existir)
