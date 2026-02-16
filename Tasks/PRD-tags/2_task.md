# Tarefa 2.0: Backend — API REST para gerenciamento de tags e vínculos com tarefas

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Expor a funcionalidade de tags via API REST no backend. Isso inclui endpoints para CRUD de tags e para associar/desassociar tags em tarefas. Também inclui atualizar a resposta de listagem de tarefas para incluir tags associadas (conforme definido na Tech Spec), mantendo escopo por usuário e tratamento de erros padronizado.

<requirements>
- Endpoints REST para listar/criar/renomear/remover tags
- Endpoints para associar/desassociar tags a uma tarefa
- Respostas e erros no formato JSON padrão `{ "error": "..." }`
- Escopo por usuário autenticado (nunca permitir acesso cruzado)
- Atualizar `GET /api/todos` para incluir tags associadas em cada todo (se definido na Tech Spec)
- Testes de integração dos endpoints (httptest + SQLite in-memory)
</requirements>

## Subtarefas

- [x] 2.1 Definir rotas para tags e vínculo todo-tag no roteamento existente (ex: em `backend/main.go`)
- [x] 2.2 Implementar handlers: `GET /api/tags`, `POST /api/tags`, `PATCH /api/tags/{id}`, `DELETE /api/tags/{id}`
- [x] 2.3 Implementar handlers de vínculo:
  - `POST /api/todos/{id}/tags/{tagId}`
  - `DELETE /api/todos/{id}/tags/{tagId}`
- [x] 2.4 Atualizar `GET /api/todos` para retornar tags (ex: `tags: Tag[]`) por tarefa (conforme abordagem escolhida na Tech Spec)
- [x] 2.5 Validar payloads (nome de tag) e mapear erros:
  - inválido → 400
  - duplicado → 409
  - não encontrado / fora do escopo → 404
- [x] 2.6 Criar testes de integração para:
  - CRUD de tags
  - vínculo/desvínculo
  - listagem de todos com tags

## Detalhes de Implementação

Referência: `./techspec.md`

- Seções relevantes:
  - **Endpoints de API**
  - **Validações e Erros**
  - **Abordagem de Testes → Testes de Integração**

Notas importantes:
- Reutilizar helpers existentes como `writeJSON` e `writeError`
- Sempre obter `userID` do contexto (padrão existente no backend)
- Para recursos fora do usuário, preferir 404 para evitar enumeração de IDs

## Critérios de Sucesso

- Todos endpoints de tags e de vínculo funcionam para o usuário autenticado
- `GET /api/todos` inclui tags por todo (se habilitado nesta tarefa)
- Erros retornam JSON consistente e códigos HTTP apropriados
- Testes de integração cobrem os fluxos principais e casos de erro e passam 100%

## Testes da Tarefa

- [x] Testes de unidade
  - (Opcional) handlers isolados com `httptest.NewRecorder` para cenários específicos de validação
- [x] Testes de integração
  - Subir `httptest.NewServer` com DB `:memory:`
  - Fluxos:
    - criar tag → listar → renomear → deletar
    - criar todo → associar tag → listar todos (ver tags) → desassociar
    - duplicidade de tag → 409
    - tentar vincular tag/todo inexistente → 404

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `Tasks/PRD-tags/PRD.md`
- `Tasks/PRD-tags/techspec.md`
- `backend/handlers.go`
- `backend/main.go`
- `backend/handlers_test.go`
