# Tarefa 4.0: Frontend — Componentes UI para exibir e gerenciar tags

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a experiência de usuário para tags: exibir tags nas tarefas (chips/badges) e permitir associar/desassociar tags em uma tarefa. Também incluir uma UI básica para o usuário gerenciar tags (criar/renomear/remover), com feedback visual e acessibilidade.

<requirements>
- Exibir tags associadas em cada `TodoItem` (chips/badges)
- Permitir adicionar/remover tags de uma tarefa sem recarregar
- Permitir criar/renomear/remover tags em uma área de gerenciamento
- Estados de loading/erro claros (UX)
- Acessibilidade: navegação por teclado, labels, foco visível
- Testes unitários de componentes com React Testing Library
</requirements>

## Subtarefas

- [x] 4.1 Criar componente `TagChip` (visual + remover quando aplicável)
- [x] 4.2 Criar componente `TagSelector`:
  - listar tags disponíveis
  - adicionar tag a um todo
  - remover tag de um todo
- [x] 4.3 Integrar tags no `TodoItem` (exibição e ações)
- [x] 4.4 Criar UI de gerenciamento de tags (pode ser uma seção/página simples):
  - criar tag
  - renomear tag
  - deletar tag
- [x] 4.5 Garantir que a UI lida com erros comuns (409 duplicado, 400 inválido, 404 não encontrado)
- [x] 4.6 Criar testes de componentes:
  - renderização de chips
  - adicionar/remover tag chama service correto
  - erros exibidos corretamente

## Detalhes de Implementação

Referência: `./techspec.md`

- Seções relevantes:
  - **Exibição de Tags na UI (PRD)**
  - **Interfaces Principais (Frontend)**
  - **Abordagem de Testes → Testes Unidade**

Notas:
- Usar os services criados na Tarefa 3.0
- Preferir componentes pequenos e testáveis
- Evitar duplicação de estado: centralizar estado de tags/todos no componente pai (ex: `TodoApp`)

## Critérios de Sucesso

- Tags aparecem corretamente nas tarefas
- Usuário consegue associar/desassociar tags via UI
- Usuário consegue criar/renomear/remover tags via UI
- Estados de erro são claros e acessíveis
- Testes unitários de UI passam 100%

## Testes da Tarefa

- [x] Testes de unidade
  - React Testing Library + user-event
  - Mock dos services (ou mock de fetch, conforme padrão adotado)
- [x] Testes de integração
  - (Opcional) teste de componente pai com fluxo completo usando mocks de API

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `Tasks/PRD-tags/PRD.md`
- `Tasks/PRD-tags/techspec.md`
- `frontend/src/components/TodoItem.tsx`
- `frontend/src/components/TodoApp.tsx`
- `frontend/src/services/api.ts`
