# Tarefa 3.0: Frontend — Tipos e services para tags

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Adicionar suporte a tags no frontend no nível de contrato e integração com a API: criar a interface `Tag`, atualizar a interface `Todo` para incluir tags, e implementar as funções de API necessárias (CRUD de tags e vínculo com tarefa). Essa tarefa não precisa entregar UI final; ela prepara a base para a UI na Tarefa 4.0.

<requirements>
- Criar tipos TypeScript para `Tag`
- Atualizar `Todo` para conter `tags?: Tag[]` (ou conforme contrato definido)
- Implementar chamadas HTTP para:
  - listar/criar/atualizar/deletar tags
  - associar/desassociar tags em uma tarefa
- Tratamento consistente de erros (propagar mensagens para UI)
- Testes unitários dos services (mock de `fetch`)
</requirements>

## Subtarefas

- [x] 3.1 Criar `frontend/src/types/tag.ts` (ou equivalente) com a interface `Tag`
- [x] 3.2 Atualizar `frontend/src/types/todo.ts` para incluir tags na entidade `Todo`
- [x] 3.3 Adicionar no `frontend/src/services/api.ts`:
  - `fetchTags`
  - `createTag`
  - `updateTag`
  - `deleteTag`
  - `addTagToTodo`
  - `removeTagFromTodo`
- [x] 3.4 Definir contrato de retorno de `fetchTodos` quando tags existirem (ex: `Todo[]` com `tags`)
- [x] 3.5 Criar testes unitários dos services de tags:
  - sucesso e erros (400/404/409/500)
  - parsing de JSON

## Detalhes de Implementação

Referência: `./techspec.md`

- Seções relevantes:
  - **Interfaces Principais (Frontend)**
  - **Requisições/Respostas (JSON)**
  - **Abordagem de Testes → Testes Unidade**

Notas:
- Reutilizar padrões existentes no `api.ts` (URL base, headers, etc.)
- Garantir que o `test` roda via `vitest run` (script já existe em `frontend/package.json`)

## Critérios de Sucesso

- Tipos TypeScript refletem o contrato da API (incluindo tags no todo)
- Services conseguem chamar todos endpoints de tags e vínculo
- Erros são tratados e retornam mensagens utilizáveis pela UI
- Testes unitários dos services passam 100%

## Testes da Tarefa

- [x] Testes de unidade
  - Mockar `globalThis.fetch` e validar:
    - método, URL e body
    - handling de status 204 sem JSON
    - handling de status 4xx/5xx com `{ error }`
- [x] Testes de integração
  - (Não obrigatório nesta tarefa; integração UI fica na Tarefa 4.0 e E2E na 5.0)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `Tasks/PRD-tags/PRD.md`
- `Tasks/PRD-tags/techspec.md`
- `frontend/src/services/api.ts`
- `frontend/src/types/todo.ts`
- `frontend/src/types/tag.ts`
