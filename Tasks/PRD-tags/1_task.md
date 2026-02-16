# Tarefa 1.0: Backend — Modelo de dados e persistência de tags

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar a fundação de dados para suportar tags: novas tabelas no SQLite (`tags` e `todo_tags`), um novo modelo `Tag` no backend, e funções de acesso a dados (CRUD de tags + vínculo N:N entre `todos` e `tags`). Esta tarefa não expõe endpoints ainda; ela prepara o backend para que a API seja construída com segurança e testabilidade.

<requirements>
- Persistir tags por usuário autenticado (escopo por `user_id`)
- Impedir tags duplicadas por usuário (regra de unicidade)
- Impedir vínculo duplicado entre uma tarefa e uma tag
- Fornecer funções em `db.go` para CRUD de tags e para vínculo/desvínculo
- Criar testes unitários da camada de dados cobrindo cenários críticos
</requirements>

## Subtarefas

- [x] 1.1 Adicionar o modelo `Tag` no backend (ex: em `backend/models.go`)
- [x] 1.2 Adicionar criação das tabelas `tags` e `todo_tags` em `InitDB` (migração compatível com bancos existentes)
- [x] 1.3 Implementar `CreateTag`, `ListTags`, `UpdateTagName`, `DeleteTag` em `backend/db.go`
- [x] 1.4 Implementar vínculo N:N: `AddTagToTodo`, `RemoveTagFromTodo`, `ListTodoTags` em `backend/db.go`
- [x] 1.5 (Opcional, se necessário) Atualizar `GetAllTodos` para suportar obtenção de tags por todo via função auxiliar (sem acoplar ainda à API)
- [x] 1.6 Criar testes unitários da camada de dados para tags e vínculos (SQLite in-memory)

## Detalhes de Implementação

Referência: `./techspec.md`

- Seções relevantes:
  - **Modelos de Dados → SQLite**
  - **Validações e Erros**
  - **Abordagem de Testes → Testes Unidade**

Notas de implementação sugeridas:
- Definir um limite de tamanho de nome de tag (ex: 50) no backend
- Normalizar nome de tag com `strings.TrimSpace`
- Para duplicidade:
  - `UNIQUE(user_id, name)` na tabela e mapear para erro de conflito (ex: 409) em tarefas futuras

## Critérios de Sucesso

- Tabelas `tags` e `todo_tags` são criadas automaticamente em inicialização do DB
- Funções de CRUD e vínculo funcionam para um `user_id` específico
- Não é possível:
  - criar tag vazia
  - criar tag acima do limite
  - criar tag duplicada para o mesmo usuário
  - associar a mesma tag duas vezes na mesma tarefa
- Testes unitários cobrem os casos acima e passam com 100% de sucesso

## Testes da Tarefa

- [x] Testes de unidade
  - `CreateTag` (sucesso, vazio, muito longo, duplicado)
  - `ListTags` (retorna apenas do usuário)
  - `AddTagToTodo` / `RemoveTagFromTodo` (sucesso e idempotência/duplicidade)
- [x] Testes de integração
  - (Não obrigatório nesta tarefa; focar em unitários do DB. Integração via HTTP ficará na Tarefa 2.0)

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `Tasks/PRD-tags/PRD.md`
- `Tasks/PRD-tags/techspec.md`
- `backend/db.go`
- `backend/models.go`
- `backend/db_test.go`
