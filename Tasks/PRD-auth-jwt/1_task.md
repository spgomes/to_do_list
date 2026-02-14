# Tarefa 1.0: Autenticação por Senha com JWT

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar autenticação completa na aplicação To-Do List, permitindo que usuários se registrem com email e senha, façam login recebendo um token JWT, e tenham suas tarefas isoladas por usuário. Inclui backend (tabela users, endpoints auth, middleware JWT, escopo por user), frontend (páginas login/registro, AuthContext, rotas protegidas) e testes.

<requirements>
- Usuários devem se registrar com email e senha
- Senhas devem ser armazenadas com hash bcrypt (nunca em texto plano)
- Login deve retornar um token JWT válido
- Todas as rotas `/api/todos` devem ser protegidas pelo middleware JWT
- Cada usuário só pode ver e manipular suas próprias tarefas
- Frontend deve ter páginas de Login e Registro
- Frontend deve gerenciar estado de autenticação (token em localStorage)
- Requisições à API devem enviar o token no header `Authorization: Bearer <token>`
- Usuário não autenticado deve ser redirecionado para a página de login
</requirements>

## Subtarefas

- [ ] 1.1 Modelagem e migração da tabela `users`
- [ ] 1.2 Endpoints `POST /api/auth/register` e `POST /api/auth/login`
- [ ] 1.3 Middleware JWT e proteção das rotas `/api/todos`
- [ ] 1.4 Escopo de `todos` por `user_id`
- [ ] 1.5 Páginas de Login e Registro (frontend)
- [ ] 1.6 AuthContext, rotas protegidas e header Authorization
- [ ] 1.7 Testes unitários, integração e E2E

## Detalhes de Implementação

### 1.1 Modelagem e migração da tabela `users`

Criar a tabela `users` no SQLite e a função de inicialização no arquivo `backend/db.go`.

**Esquema SQL:**

```sql
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**Funções a criar em `backend/db.go`:**

```go
func CreateUser(db *sql.DB, email, passwordHash string) (User, error)
func GetUserByEmail(db *sql.DB, email string) (User, error)
```

**Modelo a criar em `backend/models.go`:**

```go
type User struct {
    ID           int64  `json:"id"`
    Email        string `json:"email"`
    PasswordHash string `json:"-"` // nunca serializar
    CreatedAt    string `json:"created_at"`
}
```

**Migração da tabela `todos`** — adicionar coluna `user_id`:

```sql
ALTER TABLE todos ADD COLUMN user_id INTEGER REFERENCES users(id);
```

---

### 1.2 Endpoints de Registro e Login

Criar handlers em `backend/handlers.go` e registrar rotas em `backend/main.go`.

**Dependências Go a adicionar:**

- `golang.org/x/crypto/bcrypt` — hash de senhas
- `github.com/golang-jwt/jwt/v5` — geração e validação de JWT

**`POST /api/auth/register`**

- Recebe: `{ "email": "string", "password": "string" }`
- Valida: email não vazio, formato válido, senha com mínimo 6 caracteres
- Verifica: email não duplicado (erro 409 Conflict)
- Hash da senha com `bcrypt.GenerateFromPassword` (cost default)
- Cria usuário no banco
- Gera token JWT com `user_id` no payload
- Retorna: `{ "token": "string" }` com status 201

**`POST /api/auth/login`**

- Recebe: `{ "email": "string", "password": "string" }`
- Busca usuário por email (erro 401 se não encontrado)
- Compara senha com hash via `bcrypt.CompareHashAndPassword` (erro 401 se inválido)
- Gera token JWT com `user_id` no payload
- Retorna: `{ "token": "string" }` com status 200

**Geração de JWT:**

```go
func generateJWT(userID int64) (string, error)
```

- Secret via variável de ambiente `JWT_SECRET` (fallback para valor default em dev)
- Expiração: 24 horas
- Claims: `user_id`, `exp`, `iat`

---

### 1.3 Middleware JWT e proteção das rotas

Criar middleware em `backend/middleware.go` que:

1. Extrai o header `Authorization: Bearer <token>`
2. Valida e decodifica o token JWT
3. Extrai `user_id` dos claims
4. Injeta `user_id` no contexto da request (`context.WithValue`)
5. Retorna 401 se token ausente, expirado ou inválido

**Aplicação:** envolver apenas as rotas `/api/todos` com o middleware. As rotas `/api/auth/*` permanecem públicas.

**Atualizar CORS middleware** para permitir o header `Authorization`:

```go
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
```

---

### 1.4 Escopo de `todos` por `user_id`

Alterar **todas** as funções CRUD em `backend/db.go` para receber e filtrar por `user_id`:

```go
func GetAllTodos(db *sql.DB, userID int64) ([]Todo, error)
func CreateTodo(db *sql.DB, title string, userID int64) (Todo, error)
func UpdateTodoStatus(db *sql.DB, id int64, completed bool, userID int64) error
func DeleteTodo(db *sql.DB, id int64, userID int64) error
```

Atualizar os handlers para extrair `user_id` do contexto e passar para as funções do banco.

Atualizar o modelo `Todo` em `backend/models.go`:

```go
type Todo struct {
    ID        int64  `json:"id"`
    Title     string `json:"title"`
    Completed bool   `json:"completed"`
    CreatedAt string `json:"created_at"`
    UserID    int64  `json:"user_id,omitempty"`
}
```

---

### 1.5 Páginas de Login e Registro (frontend)

**Instalar dependência:**

- `react-router-dom` — para roteamento entre páginas

**Criar componentes:**

- `frontend/src/pages/LoginPage.tsx` — formulário com email e senha, botão de login, link para registro
- `frontend/src/pages/RegisterPage.tsx` — formulário com email, senha e confirmação de senha, botão de registro, link para login

**Criar serviço de API auth:**

- `frontend/src/services/auth.ts`

```typescript
export async function registerUser(email: string, password: string): Promise<{ token: string }>
export async function loginUser(email: string, password: string): Promise<{ token: string }>
```

**Validações no frontend:**
- Email: campo obrigatório, formato de email
- Senha: campo obrigatório, mínimo 6 caracteres
- Confirmação de senha: deve coincidir (apenas no registro)
- Feedback visual de erros (campo inválido, credenciais incorretas, email já cadastrado)

---

### 1.6 AuthContext, rotas protegidas e header Authorization

**Criar AuthContext:**

- `frontend/src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}
```

- Armazena token em `localStorage`
- Carrega token do `localStorage` na inicialização
- `logout()` remove token e redireciona para `/login`

**Atualizar `frontend/src/services/api.ts`:**

- Incluir header `Authorization: Bearer <token>` em todas as chamadas
- Se receber resposta 401, fazer logout automático

**Configurar rotas em `App.tsx`:**

```tsx
<BrowserRouter>
  <AuthProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<ProtectedRoute><TodoApp /></ProtectedRoute>} />
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

**Criar `ProtectedRoute`:**

- Verifica se `isAuthenticated` é `true`
- Se não, redireciona para `/login`

---

### 1.7 Testes unitários, integração e E2E

Referência: consultar `techspec.md` para detalhes da abordagem de testes.

**Testes unitários (backend):**

- `CreateUser` — sucesso, email duplicado, email vazio
- `GetUserByEmail` — encontrado, não encontrado
- `generateJWT` — token válido, claims corretos
- Middleware JWT — token válido, token ausente, token expirado, token inválido
- CRUD com `user_id` — usuário só vê suas próprias tarefas

**Testes de integração (backend):**

- Fluxo completo: register → login → criar todo → listar (só vê os seus) → delete
- Registro com email duplicado retorna 409
- Login com senha incorreta retorna 401
- Acesso a `/api/todos` sem token retorna 401
- Usuário A não vê tarefas do Usuário B

**Testes unitários (frontend):**

- LoginPage: renderização, validação, submissão, erro de credenciais
- RegisterPage: renderização, validação, senha não coincide, submissão
- AuthContext: login armazena token, logout remove token
- ProtectedRoute: redireciona se não autenticado
- api.ts: envia header Authorization, logout em 401

**Testes E2E (Playwright):**

- Registro de novo usuário e redirecionamento para lista de tarefas
- Login com credenciais válidas
- Login com credenciais inválidas mostra erro
- Acesso à página principal sem login redireciona para `/login`
- Criar tarefa após login e verificar que aparece na lista
- Dois usuários não veem tarefas um do outro
- Logout redireciona para `/login` e impede acesso

## Critérios de Sucesso

- Usuário consegue se registrar e fazer login com email/senha
- Token JWT é gerado e validado corretamente
- Rotas `/api/todos` retornam 401 sem token válido
- Cada usuário vê apenas suas próprias tarefas
- Frontend redireciona para login quando não autenticado
- Senhas nunca são armazenadas ou trafegadas em texto plano (exceto na requisição HTTPS)
- Todos os testes passam (unitários, integração e E2E)

## Testes da Tarefa

- [ ] Testes de unidade (backend: db, handlers, JWT, middleware)
- [ ] Testes de unidade (frontend: componentes, contexto, serviços)
- [ ] Testes de integração (backend: fluxos completos register/login/CRUD)
- [ ] Testes E2E (Playwright: fluxos de autenticação no navegador)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

**Backend (existentes a modificar):**
- `backend/main.go` — adicionar rotas auth, aplicar middleware JWT
- `backend/db.go` — adicionar tabela users, funções de usuário, migração user_id em todos, alterar CRUD
- `backend/models.go` — adicionar struct User, adicionar UserID ao Todo
- `backend/handlers.go` — adicionar handlers register/login, alterar handlers de todos
- `backend/middleware.go` — adicionar middleware JWT, atualizar CORS
- `backend/db_test.go` — adicionar testes para funções de usuário e CRUD com user_id
- `backend/handlers_test.go` — adicionar testes para handlers auth e middleware

**Backend (novos):**
- `backend/auth.go` — funções de geração/validação JWT (opcional, pode ficar em handlers.go)

**Frontend (existentes a modificar):**
- `frontend/src/App.tsx` — adicionar BrowserRouter, AuthProvider, rotas
- `frontend/src/services/api.ts` — adicionar header Authorization, logout em 401
- `frontend/src/App.css` — estilos para páginas de login/registro

**Frontend (novos):**
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/services/auth.ts`
- `frontend/src/types/auth.ts` — interfaces de auth (opcional)

**Dependências a adicionar:**
- Backend: `golang.org/x/crypto`, `github.com/golang-jwt/jwt/v5`
- Frontend: `react-router-dom`
