# Documento de Requisitos de Produto (PRD) — Tags nas Tarefas

## Visão Geral

Adicionar **tags** às tarefas para permitir organização sem precisar de filtros avançados. Tags ajudam o usuário a classificar tarefas por contexto (ex: `trabalho`, `casa`, `estudos`) e visualizar rapidamente esses rótulos na lista.

Esta funcionalidade expande o CRUD existente de tarefas, mantendo o app simples e com foco em UX.

## Objetivos

- Permitir que o usuário **crie, liste, renomeie e remova tags**
- Permitir que o usuário **associe/desassocie tags** a uma tarefa
- Exibir as tags associadas a cada tarefa na UI
- Garantir consistência: **uma tag não pode ser duplicada** (por usuário) e não pode quebrar tarefas existentes

## Histórias de Usuário

- Como usuário, eu quero criar tags para que eu possa organizar minhas tarefas por contexto.
- Como usuário, eu quero atribuir uma ou mais tags a uma tarefa para que eu possa entender rapidamente o que ela representa.
- Como usuário, eu quero remover uma tag de uma tarefa para que eu possa reclassificá-la.
- Como usuário, eu quero renomear uma tag para manter meu sistema de organização consistente.
- Como usuário, eu quero ver as tags de cada tarefa na lista para que eu possa identificar rapidamente seu contexto.

## Funcionalidades Principais

### 1) CRUD de Tags

Permite ao usuário gerenciar tags disponíveis.

**Requisitos funcionais:**

1. O sistema deve permitir criar uma tag informando um nome
2. O sistema deve listar todas as tags do usuário autenticado
3. O sistema deve permitir renomear uma tag existente
4. O sistema deve permitir remover uma tag existente
5. O sistema deve impedir criação de tags com nome vazio (apenas espaços)
6. O sistema deve impedir criação de tags com nome acima de um limite (ex: 50 caracteres)
7. O sistema deve impedir tags duplicadas (mesmo nome) para o mesmo usuário (case-insensitive ou normalização definida na Tech Spec)

### 2) Associar/Desassociar Tags em Tarefas

Permite vincular tags a tarefas existentes.

**Requisitos funcionais:**

8. O sistema deve permitir adicionar uma tag existente a uma tarefa do usuário
9. O sistema deve permitir remover uma tag de uma tarefa do usuário
10. O sistema não deve criar vínculos duplicados (mesma tag na mesma tarefa)
11. O sistema deve retornar erro adequado quando tarefa ou tag não existirem (ou não pertencerem ao usuário)

### 3) Exibição de Tags na UI

Exibe tags associadas a cada tarefa e permite edição.

**Requisitos funcionais:**

12. A lista de tarefas deve exibir as tags de cada tarefa de forma visual (chips/badges)
13. O usuário deve conseguir adicionar/remover tags a partir da UI sem recarregar a página
14. A UI deve apresentar feedback claro para erros comuns (nome inválido, duplicidade, item não encontrado)

## Experiência do Usuário

### Persona Principal

Usuário individual que deseja organizar tarefas pessoais por contexto de execução.

### Fluxos Principais

- **Gerenciar tags**: usuário abre tela/área de tags → cria uma tag → vê na lista
- **Taggear uma tarefa**: usuário seleciona uma tarefa → adiciona uma ou mais tags → vê as tags refletidas imediatamente
- **Remover tag**: usuário remove uma tag do chip → UI atualiza imediatamente

### Requisitos de UI/UX

- Chips de tags devem ser compactos e legíveis
- A adição/remoção deve ser rápida (preferencialmente com autocomplete/seleção)
- Manter acessibilidade (labels, navegação por teclado, foco visível)

### Requisitos de Acessibilidade

- Todos os controles de tags devem ser acessíveis por teclado
- Chips e botões devem ter `aria-label` apropriados
- Contraste e estado de foco devem ser visíveis

## Restrições Técnicas de Alto Nível

- Manter arquitetura atual: backend Go + SQLite, frontend React + TypeScript
- Operações de tags devem ser **escopadas ao usuário autenticado**
- Não introduzir dependências complexas desnecessárias (manter simplicidade)

## Fora de Escopo

- Filtros avançados por tag (ex: combinar tags com AND/OR na listagem)
- Busca full-text de tags/tarefas
- Cores customizáveis por tag
- Reordenação e agrupamento automático por tag
- Compartilhamento de tags entre usuários
