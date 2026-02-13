# Documento de Requisitos de Produto (PRD) — To-Do List

## Visão Geral

Aplicação web fullstack de lista de tarefas (To-Do) desenvolvida com **Golang** no backend, **React** no frontend e **SQLite** como banco de dados. O objetivo é criar uma ferramenta funcional e visualmente polida para gerenciamento de tarefas pessoais, servindo como peça de portfólio que demonstra habilidades de desenvolvimento fullstack.

A aplicação resolve o problema de organização de tarefas diárias de um usuário individual, oferecendo uma interface intuitiva e responsiva para criar, visualizar, concluir e remover tarefas.

## Objetivos

- **Funcionalidade completa**: entregar um CRUD de tarefas 100% funcional sem erros críticos
- **Experiência de usuário**: interface responsiva, intuitiva e com feedback visual claro para todas as ações
- **Qualidade de portfólio**: código organizado, legível e seguindo boas práticas tanto no backend quanto no frontend
- **Persistência confiável**: todas as tarefas devem ser salvas no banco de dados SQLite e sobreviver a reinicializações do servidor

## Histórias de Usuário

- **Como** usuário, **eu quero** adicionar uma nova tarefa com um nome descritivo **para que** eu possa registrar o que preciso fazer.
- **Como** usuário, **eu quero** visualizar todas as minhas tarefas cadastradas em uma lista organizada **para que** eu tenha uma visão clara do que precisa ser feito.
- **Como** usuário, **eu quero** marcar uma tarefa como concluída **para que** eu possa acompanhar meu progresso e saber o que já foi feito.
- **Como** usuário, **eu quero** remover uma tarefa da lista **para que** eu possa manter minha lista limpa e relevante.

## Funcionalidades Principais

### Adicionar Tarefa

Permite ao usuário criar uma nova tarefa informando seu nome/descrição. A tarefa é salva no banco de dados e exibida imediatamente na lista.

**Requisitos Funcionais:**

1. O sistema deve exibir um campo de texto para inserir o nome da tarefa
2. O sistema deve exibir um botão para confirmar a adição da tarefa
3. O sistema deve validar que o campo de texto não está vazio antes de criar a tarefa
4. O sistema deve exibir feedback visual ao usuário caso tente adicionar uma tarefa sem nome
5. A nova tarefa deve ser salva no banco de dados SQLite com status "pendente"
6. A nova tarefa deve aparecer na lista imediatamente após a criação, sem necessidade de recarregar a página

### Listar Tarefas

Exibe todas as tarefas cadastradas em uma lista organizada, diferenciando visualmente tarefas pendentes de concluídas.

**Requisitos Funcionais:**

7. O sistema deve exibir todas as tarefas cadastradas ao carregar a página
8. Cada tarefa deve exibir seu nome e status atual (pendente ou concluída)
9. Tarefas concluídas devem ter diferenciação visual clara em relação às pendentes (ex: texto riscado, cor diferente)
10. A lista deve ser atualizada em tempo real após qualquer operação (adicionar, concluir, remover)
11. Caso não existam tarefas cadastradas, o sistema deve exibir uma mensagem indicativa (ex: "Nenhuma tarefa cadastrada")

### Marcar Tarefa como Concluída

Permite ao usuário alterar o status de uma tarefa de "pendente" para "concluída".

**Requisitos Funcionais:**

12. Cada tarefa pendente deve exibir um botão ou checkbox para marcá-la como concluída
13. Ao marcar como concluída, o status deve ser atualizado no banco de dados
14. A interface deve refletir a mudança de status imediatamente com feedback visual
15. O usuário deve poder reverter uma tarefa concluída para o status pendente

### Remover Tarefa

Permite ao usuário excluir permanentemente uma tarefa da lista.

**Requisitos Funcionais:**

16. Cada tarefa deve exibir um botão para remoção
17. O sistema deve solicitar confirmação antes de remover a tarefa
18. Após confirmação, a tarefa deve ser removida do banco de dados permanentemente
19. A tarefa removida deve desaparecer da lista imediatamente

## Experiência do Usuário

### Persona Principal

Usuário individual que deseja organizar tarefas pessoais do dia a dia de forma simples e rápida.

### Fluxo Principal

1. Usuário acessa a aplicação no navegador
2. A lista de tarefas existentes é carregada automaticamente
3. Usuário digita o nome de uma nova tarefa no campo de texto
4. Usuário clica no botão de adicionar (ou pressiona Enter)
5. A tarefa aparece na lista como pendente
6. Usuário pode marcar tarefas como concluídas ou removê-las conforme necessário

### Requisitos de UI/UX

- **Design responsivo**: a interface deve funcionar bem em desktop e dispositivos móveis
- **Design limpo e minimalista**: adequado para apresentação em portfólio
- **Feedback visual**: todas as ações devem fornecer feedback imediato ao usuário (loading states, confirmações, erros)
- **Interação fluida**: operações devem ocorrer sem recarregamento de página (SPA)

### Requisitos de Acessibilidade

- Navegação completa por teclado (Tab, Enter, Escape)
- Elementos interativos com labels acessíveis para leitores de tela
- Contraste de cores adequado (mínimo WCAG AA)

## Restrições Técnicas de Alto Nível

- **Backend**: Golang servindo uma API REST
- **Frontend**: React como Single Page Application (SPA)
- **Banco de Dados**: SQLite para persistência local
- **Comunicação**: API REST com formato JSON entre frontend e backend
- **Ambiente**: aplicação roda localmente (localhost)

## Fora de Escopo

- Autenticação e autorização de usuários
- Suporte a múltiplos usuários
- Categorias, tags ou prioridades de tarefas
- Datas de vencimento ou lembretes
- Busca ou filtros avançados
- Notificações (push, e-mail ou in-app)
- Deploy em ambiente de produção/nuvem
- Testes automatizados (unitários, integração, e2e)
- Modo offline ou service workers
- Drag and drop para reordenar tarefas
