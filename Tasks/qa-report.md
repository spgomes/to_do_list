# Relatório de QA — To-Do List

## Resumo

- **Data:** 2026-02-13
- **Status:** ✅ APROVADO
- **Total de Requisitos Funcionais:** 19
- **Requisitos Atendidos:** 19 / 19
- **Bugs Encontrados:** 0 (bloqueantes) / 1 (observação menor)

---

## Requisitos Funcionais Verificados

### Adicionar Tarefa

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF-01 | Campo de texto para inserir nome da tarefa | ✅ PASSOU | `TodoForm.tsx:33-40` — `<input type="text" placeholder="Nova tarefa...">` com `aria-label="Título da tarefa"` |
| RF-02 | Botão para confirmar adição da tarefa | ✅ PASSOU | `TodoForm.tsx:42-44` — `<button type="submit">Adicionar</button>` |
| RF-03 | Validação de campo vazio antes de criar | ✅ PASSOU | Frontend: `TodoForm.tsx:14` — `if (!trimmed)`. Backend: `db.go:77-79` — `strings.TrimSpace` + `ErrEmptyTitle`. API retorna 400 para `""` e `"   "` |
| RF-04 | Feedback visual ao tentar adicionar sem nome | ✅ PASSOU | `TodoForm.tsx:15` — `setError("O título não pode estar vazio")` renderizado como `<p role="alert">` em `TodoForm.tsx:47-49` |
| RF-05 | Nova tarefa salva no SQLite com status "pendente" | ✅ PASSOU | `db.go:82` — `INSERT INTO todos (title)` (completed default 0). API testada: POST retorna `"completed": false` com HTTP 201 |
| RF-06 | Nova tarefa aparece na lista sem recarregar | ✅ PASSOU | `App.tsx:22` — `setTodos(prev => [newTodo, ...prev])` — atualização otimista do estado React (SPA) |

### Listar Tarefas

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF-07 | Exibir todas as tarefas ao carregar a página | ✅ PASSOU | `App.tsx:13-18` — `useEffect(() => { fetchTodos().then(setTodos) }, [])`. API GET `/api/todos` retorna array completo |
| RF-08 | Cada tarefa exibe nome e status | ✅ PASSOU | `TodoItem.tsx:34` — `<span>{todo.title}</span>`, `TodoItem.tsx:25` — checkbox `checked={todo.completed}` |
| RF-09 | Tarefas concluídas com diferenciação visual | ✅ PASSOU | `App.css:167-169` — `.todo-item.completed { opacity: 0.7 }`, `App.css:226-229` — `.completed .todo-title { text-decoration: line-through; color: var(--color-text-secondary) }` |
| RF-10 | Lista atualizada em tempo real após operações | ✅ PASSOU | `App.tsx:22,27-29,34` — Cada handler (`handleAdd`, `handleToggle`, `handleDelete`) atualiza o state imediatamente via `setTodos` |
| RF-11 | Mensagem quando não há tarefas | ✅ PASSOU | `TodoList.tsx:11-13` — `if (todos.length === 0) return <p>"Nenhuma tarefa cadastrada"</p>` |

### Marcar Tarefa como Concluída

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF-12 | Botão/checkbox para marcar como concluída | ✅ PASSOU | `TodoItem.tsx:23-33` — `<input type="checkbox" checked={todo.completed} onChange={handleToggle}>` |
| RF-13 | Status atualizado no banco de dados | ✅ PASSOU | `db.go:105` — `UPDATE todos SET completed = ? WHERE id = ?`. API PATCH retorna 204. Verificado via GET que `completed: true` persiste |
| RF-14 | Interface reflete mudança imediatamente | ✅ PASSOU | `App.tsx:27-29` — `setTodos(prev => prev.map(t => t.id === id ? {...t, completed} : t))` — atualização imediata sem reload |
| RF-15 | Reverter tarefa concluída para pendente | ✅ PASSOU | `TodoItem.tsx:10-12` — `onToggle(todo.id, !todo.completed)` — toggle bidirecional. API testada: PATCH com `completed: false` retorna 204 |

### Remover Tarefa

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF-16 | Botão de remoção em cada tarefa | ✅ PASSOU | `TodoItem.tsx:36-41` — `<button onClick={handleDelete} aria-label="Remover tarefa: ...">Remover</button>` |
| RF-17 | Confirmação antes de remover | ✅ PASSOU | `TodoItem.tsx:15` — `window.confirm("Tem certeza que deseja remover esta tarefa?")` |
| RF-18 | Tarefa removida do banco permanentemente | ✅ PASSOU | `db.go:125` — `DELETE FROM todos WHERE id = ?`. API DELETE retorna 204. GET subsequente não inclui o item |
| RF-19 | Tarefa desaparece da lista imediatamente | ✅ PASSOU | `App.tsx:34` — `setTodos(prev => prev.filter(t => t.id !== id))` — remoção imediata do state |

---

## Testes E2E da API Executados

| Fluxo | Método | Resultado | Observações |
|-------|--------|-----------|-------------|
| Criar tarefa válida | POST `/api/todos` | ✅ PASSOU | HTTP 201, retorna Todo com id, title, completed=false, created_at |
| Criar tarefa vazia `""` | POST `/api/todos` | ✅ PASSOU | HTTP 400, `{"error": "title cannot be empty"}` |
| Criar tarefa só espaços `"   "` | POST `/api/todos` | ✅ PASSOU | HTTP 400, `{"error": "title cannot be empty"}` |
| Criar tarefa sem body `{}` | POST `/api/todos` | ✅ PASSOU | HTTP 400, `{"error": "title cannot be empty"}` |
| Listar todos os todos | GET `/api/todos` | ✅ PASSOU | HTTP 200, retorna array ordenado por created_at DESC |
| Listar quando vazio | GET `/api/todos` | ✅ PASSOU | HTTP 200, retorna `[]` |
| Marcar como concluída | PATCH `/api/todos/{id}` | ✅ PASSOU | HTTP 204, GET confirma `completed: true` |
| Reverter para pendente | PATCH `/api/todos/{id}` | ✅ PASSOU | HTTP 204, GET confirma `completed: false` |
| Deletar tarefa existente | DELETE `/api/todos/{id}` | ✅ PASSOU | HTTP 204, GET confirma remoção |
| Deletar tarefa inexistente | DELETE `/api/todos/9999` | ✅ PASSOU | HTTP 404, `{"error": "todo not found"}` |
| Atualizar tarefa inexistente | PATCH `/api/todos/9999` | ✅ PASSOU | HTTP 404, `{"error": "todo not found"}` |
| CORS preflight (OPTIONS) | OPTIONS `/api/todos` | ✅ PASSOU | HTTP 204, headers corretos (Allow-Origin, Allow-Methods, Allow-Headers) |

---

## Verificação de Acessibilidade (WCAG 2.2)

| Critério | Status | Evidência |
|----------|--------|-----------|
| `<html lang="pt-BR">` | ✅ PASSOU | `index.html:2` |
| Navegação por teclado (Tab) | ✅ PASSOU | Input, botão "Adicionar", checkboxes e botões "Remover" são todos elementos nativos focáveis. `:focus-visible` definido globalmente em `index.css:86-91` |
| Tecla Enter para submeter | ✅ PASSOU | `<form onSubmit>` — submit nativo via Enter |
| Tecla Escape para limpar | ✅ PASSOU | `TodoForm.tsx:23-27` — `handleKeyDown` limpa input e erro |
| Aria labels em elementos interativos | ✅ PASSOU | Form: `aria-label="Adicionar nova tarefa"`, Input: `aria-label="Título da tarefa"`, Checkbox: `aria-label="Marcar como concluída/pendente: {title}"`, Delete: `aria-label="Remover tarefa: {title}"`, Lista: `aria-label="Lista de tarefas"` |
| Mensagens de erro acessíveis | ✅ PASSOU | `role="alert"` em erros do form (`TodoForm.tsx:47`) e erro de loading (`App.tsx:55`) |
| Loading state acessível | ✅ PASSOU | `role="status"` e `aria-label="Carregando tarefas"` no spinner (`App.tsx:40`), spinner com `aria-hidden="true"` |
| Contraste de cores (WCAG AA) | ✅ PASSOU | Texto principal `#1d1d1f` em fundo `#f5f5f7` = ratio ~15.8:1. Texto secundário `#6e6e73` em fundo branco = ratio ~4.7:1 (acima de 4.5:1 mínimo AA). Erro `#991b1b` em `#fef2f2` = ratio ~7.5:1. Botão primário branco `#fff` em `#0071e3` = ratio ~4.6:1 |
| Formulários com labels | ✅ PASSOU | Input com `aria-label`, checkbox dentro de `<label>` semântico (`TodoItem.tsx:22-35`) |
| Reduzir movimento | ✅ PASSOU | `@media (prefers-reduced-motion: reduce)` em `index.css:98-107` |
| Touch targets mínimo 44px | ✅ PASSOU | Input desktop: `min-height: 44px`, Botão desktop: `min-height: 44px; min-width: 44px`, Mobile (480px): `min-height: 48px`, Delete mobile: `min-height: 44px; min-width: 44px` |

---

## Verificações Visuais e Responsividade

| Aspecto | Status | Evidência |
|---------|--------|-----------|
| Layout centralizado max-width 600px | ✅ PASSOU | `App.css:3-4` — `max-width: 600px; margin: 0 auto` |
| Design limpo e minimalista | ✅ PASSOU | CSS variables com design system coerente, cores neutras, tipografia Inter |
| Estado de carregamento (loading) | ✅ PASSOU | Spinner animado + texto "Carregando tarefas..." (`App.tsx:37-46`) |
| Estado de erro | ✅ PASSOU | Banner de erro vermelho com `role="alert"` (`App.tsx:48-59`) |
| Estado vazio | ✅ PASSOU | Mensagem "Nenhuma tarefa cadastrada" centralizada (`TodoList.tsx:12`) |
| Diferenciação visual de concluídas | ✅ PASSOU | `opacity: 0.7` + `text-decoration: line-through` + cor secundária |
| Hover effects | ✅ PASSOU | Sombra elevada no hover de items, cor de borda no hover de input, feedback visual em botões |
| Responsividade Tablet (768px) | ✅ PASSOU | Padding e fonte reduzidos (`App.css:258-266`) |
| Responsividade Mobile (480px) | ✅ PASSOU | Form empilhado, touch targets maiores, padding reduzido (`App.css:270-301`) |
| Checkbox customizado | ✅ PASSOU | `appearance: none` com checkmark via `::after` pseudo-element (`App.css:180-217`) |
| Focus rings visíveis | ✅ PASSOU | `box-shadow: 0 0 0 3px var(--color-focus-ring)` em input, botões e checkbox |

---

## Verificação da TechSpec

| Decisão Técnica | Status | Evidência |
|-----------------|--------|-----------|
| Backend Go com `net/http` (Go 1.22+) | ✅ PASSOU | `main.go` — Usa `HandleFunc("GET /api/todos", ...)` syntax do Go 1.22+ |
| SQLite com `modernc.org/sqlite` (CGO-free) | ✅ PASSOU | `db.go:8` — `_ "modernc.org/sqlite"` |
| WAL mode habilitado | ✅ PASSOU | `db.go:29` — `PRAGMA journal_mode=WAL` |
| Frontend React + TypeScript + Vite | ✅ PASSOU | Stack completa verificada |
| CORS middleware customizado | ✅ PASSOU | `middleware.go:10-21` — Origin `localhost:5173` |
| Logging com `slog` | ✅ PASSOU | `middleware.go:36-47` — Loga method, path, status, duration |
| Endpoints REST conforme spec | ✅ PASSOU | GET, POST, PATCH, DELETE em `/api/todos` e `/api/todos/{id}` |
| Códigos HTTP corretos (201, 204, 400, 404, 500) | ✅ PASSOU | Todos verificados via testes de API |
| Estrutura de arquivos conforme spec | ✅ PASSOU | `backend/`: main.go, handlers.go, db.go, middleware.go, models.go. `frontend/src/`: components/, services/, types/ |

---

## Verificação de Tarefas

| Tarefa | Status |
|--------|--------|
| 1.0 Setup do Projeto (Backend + Frontend) | ✅ Completa |
| 2.0 Camada de Banco de Dados (Backend) | ✅ Completa |
| 3.0 API REST — Handlers, Routing e CORS (Backend) | ✅ Completa |
| 4.0 Camada de Serviço HTTP e Tipos (Frontend) | ✅ Completa |
| 5.0 Componentes React e Integração (Frontend) | ✅ Completa |
| 6.0 Estilização, Responsividade e Acessibilidade | ✅ Completa |
| 7.0 Testes End-to-End com Playwright | ✅ Completa |

---

## Observações Menores (Não-bloqueantes)

| ID | Descrição | Severidade | Detalhe |
|----|-----------|------------|---------|
| OBS-01 | Ordenação de tarefas com mesmo `created_at` é indeterminada | Baixa | Quando duas tarefas são criadas no mesmo segundo, a ordem entre elas não é garantida pois a query usa apenas `ORDER BY created_at DESC` sem secondary sort por `id DESC`. Impacto mínimo para uso real. |

---

## Conclusão

**A aplicação To-Do List está APROVADA no QA.**

Todos os **19 requisitos funcionais** do PRD foram verificados e estão funcionando corretamente. A implementação segue fielmente a TechSpec, incluindo:

- **Backend Go** com API REST correta (4 endpoints, CORS, logging, error handling)
- **Frontend React + TypeScript** com SPA funcional (atualização sem reload, feedback visual, validação)
- **SQLite** com persistência confiável (WAL mode, tabela correta, CRUD completo)
- **Acessibilidade WCAG AA** atendida (aria-labels, focus management, contraste, keyboard nav, reduced motion)
- **Responsividade** para desktop, tablet e mobile
- **Design limpo e profissional** adequado para portfólio

Todas as 7 tarefas de implementação estão concluídas e validadas. A aplicação está pronta para uso.
