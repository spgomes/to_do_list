# To-Do List

Aplicacao web fullstack de lista de tarefas construida com **Go** no backend, **React + TypeScript** no frontend e **SQLite** como banco de dados.

![Go](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)

## Funcionalidades

- Adicionar, listar, concluir e remover tarefas
- Interface responsiva (desktop, tablet e mobile)
- Persistencia com SQLite (WAL mode)
- Acessibilidade (ARIA labels, navegacao por teclado, reduced motion)
- Confirmacao antes de remover tarefas

## Arquitetura

```
Frontend (React)          Backend (Go API)          SQLite
Vite :5173        <--->   net/http :8080     <--->  todos.db
```

| Metodo   | Endpoint             | Descricao                     |
|----------|----------------------|-------------------------------|
| `GET`    | `/api/todos`         | Lista todas as tarefas        |
| `POST`   | `/api/todos`         | Cria uma nova tarefa          |
| `PATCH`  | `/api/todos/{id}`    | Atualiza status de uma tarefa |
| `DELETE` | `/api/todos/{id}`    | Remove uma tarefa             |

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

| Variavel       | Onde       | Default                        | Descricao              |
|----------------|------------|--------------------------------|------------------------|
| `CORS_ORIGIN`  | Backend    | `http://localhost:5173`        | Origem permitida CORS  |
| `VITE_API_URL` | Frontend   | `http://localhost:8080/api`    | URL base da API        |

Copie `frontend/.env.example` para `frontend/.env` e ajuste se necessario.

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
  handlers.go      # Handlers HTTP (CRUD)
  db.go            # Acesso ao SQLite
  middleware.go     # CORS e logging
  models.go        # Struct Todo
  *_test.go        # Testes unitarios e de integracao

frontend/
  src/
    App.tsx              # Componente raiz
    components/
      TodoForm.tsx       # Formulario de adicao
      TodoList.tsx       # Lista de tarefas
      TodoItem.tsx       # Item individual
    services/
      api.ts             # Camada HTTP (fetch)
    types/
      todo.ts            # Interface Todo
  e2e/
    todos.spec.ts        # Testes E2E (Playwright)
```

## Licenca

Este projeto e de uso pessoal e para fins de portfolio.
