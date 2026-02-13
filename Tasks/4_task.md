# Tarefa 4.0: Camada de Serviço HTTP e Tipos (Frontend)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a camada de serviço HTTP do frontend que abstrai as chamadas `fetch` à API REST do backend, e definir os tipos TypeScript compartilhados. Este módulo centraliza URLs, tratamento de erros e parsing de respostas JSON, servindo como a interface entre os componentes React (Tarefa 5.0) e o backend.

**Dependência:** Tarefa 1.0 (setup do frontend). Pode ser desenvolvida em paralelo com Tarefas 2.0 e 3.0.

<requirements>
- Interface TypeScript `Todo` com campos `id`, `title`, `completed`, `created_at`
- Função `fetchTodos(): Promise<Todo[]>` — GET /api/todos
- Função `createTodo(title: string): Promise<Todo>` — POST /api/todos
- Função `updateTodo(id: number, completed: boolean): Promise<void>` — PATCH /api/todos/{id}
- Função `deleteTodo(id: number): Promise<void>` — DELETE /api/todos/{id}
- URL base da API configurável (constante `API_BASE_URL = "http://localhost:8080/api"`)
- Tratamento de erros: lançar exceção com mensagem do backend quando response não é ok
- Testes unitários com mock de `fetch` (usando `vitest`)
</requirements>

## Subtarefas

- [x] 4.1 Criar interface `Todo` em `frontend/src/types/todo.ts`
- [x] 4.2 Criar constante `API_BASE_URL` e implementar `fetchTodos` em `frontend/src/services/api.ts`
- [x] 4.3 Implementar `createTodo` em `frontend/src/services/api.ts`
- [x] 4.4 Implementar `updateTodo` em `frontend/src/services/api.ts`
- [x] 4.5 Implementar `deleteTodo` em `frontend/src/services/api.ts`
- [x] 4.6 Configurar Vitest no projeto (`npm install -D vitest`)
- [x] 4.7 Escrever testes unitários para todas as funções do serviço API (com mock de `fetch`)

## Detalhes de Implementação

Consultar a seção **"Interfaces Principais"** (bloco TypeScript) e **"Modelos de Dados"** (tipo correspondente) na [techspec.md](../../Tasks/TechSpec.md).

**Pontos de atenção:**
- Cada função deve verificar `response.ok` e, se falso, extrair a mensagem de erro do body JSON (`{ "error": "msg" }`) e lançar um `Error` com essa mensagem
- `fetchTodos` deve retornar `[]` se a API retornar uma lista vazia (não `null`)
- `createTodo` deve enviar header `Content-Type: application/json` e body `JSON.stringify({ title })`
- `updateTodo` deve enviar method `PATCH` com body `JSON.stringify({ completed })`
- `deleteTodo` deve enviar method `DELETE` sem body
- Nos testes, usar `vi.fn()` do Vitest para mockar `global.fetch`

## Critérios de Sucesso

- Tipos TypeScript compila sem erros (`npm run build`)
- Todas as 4 funções de serviço implementadas e exportadas
- Tratamento de erros consistente em todas as funções
- Testes unitários passando com `npx vitest run`
- Testes cobrem: resposta de sucesso, resposta de erro (4xx/5xx), parsing de JSON

## Testes da Tarefa

- [x] **Teste unitário:** `fetchTodos` — retorna array de todos quando API responde 200
- [x] **Teste unitário:** `fetchTodos` — retorna array vazio quando API responde 200 com `[]`
- [x] **Teste unitário:** `fetchTodos` — lança erro quando API responde com erro
- [x] **Teste unitário:** `createTodo` — envia POST correto e retorna todo criado
- [x] **Teste unitário:** `createTodo` — lança erro quando API responde 400
- [x] **Teste unitário:** `updateTodo` — envia PATCH correto para o ID especificado
- [x] **Teste unitário:** `updateTodo` — lança erro quando API responde 404
- [x] **Teste unitário:** `deleteTodo` — envia DELETE correto para o ID especificado
- [x] **Teste unitário:** `deleteTodo` — lança erro quando API responde 404

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `frontend/src/types/todo.ts` — Interface Todo (novo)
- `frontend/src/services/api.ts` — Funções de serviço HTTP (novo)
- `frontend/src/services/api.test.ts` — Testes unitários (novo)
- `frontend/package.json` — Adicionar Vitest como dependência de dev
- `frontend/vite.config.ts` — Pode precisar de configuração para Vitest
- [PRD](../../Tasks/PRD.md) — Requisitos de comunicação frontend-backend
- [Tech Spec](../../Tasks/TechSpec.md) — Seções "Interfaces Principais" (TypeScript), "Modelos de Dados"
