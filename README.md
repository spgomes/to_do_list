# To-Do List

Aplicacao web fullstack de lista de tarefas construida com **Go** no backend, **React + TypeScript** no frontend e **SQLite** como banco de dados. Inclui autenticacao de usuarios com **JWT**.

![Go](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white)

## Funcionalidades

- Registro e login de usuarios com email e senha
- Autenticacao via JWT (token expira em 24h)
- Cada usuario ve apenas suas proprias tarefas
- Adicionar, listar, concluir e remover tarefas
- Interface responsiva (desktop, tablet e mobile)
- Persistencia com SQLite (WAL mode)
- Acessibilidade (ARIA labels, navegacao por teclado, reduced motion)
- Confirmacao antes de remover tarefas
- Rotas protegidas no frontend com redirecionamento para login

## Arquitetura

```
Frontend (React)          Backend (Go API)          SQLite
Vite :5173        <--->   net/http :8080     <--->  todos.db
React Router              JWT + bcrypt              users + todos
```

### Endpoints de autenticacao (publicos)

| Metodo | Endpoint              | Descricao                              |
|--------|-----------------------|----------------------------------------|
| `POST` | `/api/auth/register`  | Cria conta e retorna token JWT         |
| `POST` | `/api/auth/login`     | Autentica usuario e retorna token JWT  |

### Endpoints de tarefas (protegidos por JWT)

| Metodo   | Endpoint             | Descricao                     |
|----------|----------------------|-------------------------------|
| `GET`    | `/api/todos`         | Lista tarefas do usuario      |
| `POST`   | `/api/todos`         | Cria uma nova tarefa          |
| `PATCH`  | `/api/todos/{id}`    | Atualiza status de uma tarefa |
| `DELETE` | `/api/todos/{id}`    | Remove uma tarefa             |

> Os endpoints de tarefas exigem o header `Authorization: Bearer <token>`.

## Pre-requisitos

- [Go](https://go.dev/dl/) 1.22+
- [Node.js](https://nodejs.org/) 20+

## Como rodar

### Backend

```bash
cd backend
go run .
```

O servidor inicia em `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

A aplicacao abre em `http://localhost:5173`.

## Variaveis de ambiente

| Variavel       | Onde       | Default                               | Descricao                  |
|----------------|------------|---------------------------------------|----------------------------|
| `JWT_SECRET`   | Backend    | `dev-secret-do-not-use-in-production` | Chave secreta para JWT     |
| `CORS_ORIGIN`  | Backend    | `http://localhost:5173`               | Origem permitida CORS      |
| `VITE_API_URL` | Frontend   | `http://localhost:8080/api`           | URL base da API            |

Copie `frontend/.env.example` para `frontend/.env` e ajuste se necessario.

> **Importante:** Em producao, defina `JWT_SECRET` com um valor seguro e aleatorio.

## Testes

### Backend (Go)

```bash
cd backend
go test ./... -v
```

### Frontend (Vitest)

```bash
cd frontend
npm test
```

### E2E (Playwright)

```bash
cd frontend
npx playwright test
```

> Os testes E2E iniciam automaticamente o backend e o frontend.

## Estrutura do projeto

```
backend/
  main.go          # Entrypoint, servidor com graceful shutdown
  handlers.go      # Handlers HTTP (CRUD + auth)
  auth.go          # Geracao e validacao de JWT
  db.go            # Acesso ao SQLite (users + todos)
  middleware.go     # CORS, logging e JWT middleware
  models.go        # Structs Todo e User
  *_test.go        # Testes unitarios e de integracao

frontend/
  src/
    App.tsx              # Componente raiz com rotas
    contexts/
      AuthContext.tsx     # Context de autenticacao
    pages/
      LoginPage.tsx      # Pagina de login
      RegisterPage.tsx   # Pagina de registro
    components/
      TodoApp.tsx        # Componente principal das tarefas
      TodoForm.tsx       # Formulario de adicao
      TodoList.tsx       # Lista de tarefas
      TodoItem.tsx       # Item individual
      ProtectedRoute.tsx # Guarda de rota autenticada
    services/
      api.ts             # Camada HTTP para todos
      auth.ts            # Camada HTTP para autenticacao
    types/
      todo.ts            # Interface Todo
      auth.ts            # Tipos de autenticacao
  e2e/
    todos.spec.ts        # Testes E2E (Playwright)
```

## Licenca

Este projeto e de uso pessoal e para fins de portfolio.
