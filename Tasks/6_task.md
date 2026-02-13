# Tarefa 6.0: Estilização, Responsividade e Acessibilidade

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Aplicar estilização CSS para criar um design limpo e minimalista adequado para portfólio, garantindo que a aplicação funcione bem em desktop e dispositivos móveis e atenda aos requisitos básicos de acessibilidade. Esta tarefa transforma a UI funcional (Tarefa 5.0) em uma aplicação visualmente polida.

**Dependência:** Tarefa 5.0 (componentes React funcionais).

<requirements>
- Design limpo e minimalista adequado para apresentação em portfólio
- Layout responsivo que funciona em desktop (1024px+) e mobile (320px+)
- Diferenciação visual clara entre tarefas pendentes e concluídas
- Feedback visual para todas as ações: loading states, erros, confirmações
- Navegação completa por teclado (Tab, Enter, Escape)
- Elementos interativos com labels acessíveis (`aria-label`, `<label>`)
- Contraste de cores adequado (mínimo WCAG AA — ratio 4.5:1 para texto normal)
- Hover e focus states em todos os elementos interativos
- Transições suaves para mudanças de estado
</requirements>

## Subtarefas

- [ ] 6.1 Definir CSS global: reset, tipografia, variáveis de cores, box-sizing
- [ ] 6.2 Estilizar layout principal: container centralizado, largura máxima, padding responsivo
- [ ] 6.3 Estilizar `TodoForm`: campo de texto, botão "Adicionar", mensagem de erro, focus states
- [ ] 6.4 Estilizar `TodoItem`: layout flex, texto riscado para concluídas, hover states, botões de ação
- [ ] 6.5 Estilizar `TodoList`: espaçamento entre itens, mensagem de lista vazia
- [ ] 6.6 Implementar responsividade com media queries (breakpoints: 768px, 480px)
- [ ] 6.7 Adicionar atributos de acessibilidade: `aria-label`, `role`, `<label>`, foco visível
- [ ] 6.8 Verificar contraste de cores (WCAG AA) e navegação por teclado
- [ ] 6.9 Adicionar loading state visual (spinner ou skeleton) durante carregamento inicial

## Detalhes de Implementação

Consultar a seção **"Requisitos de UI/UX"** e **"Requisitos de Acessibilidade"** no [PRD](../../Tasks/PRD.md).

**Pontos de atenção:**
- Usar CSS Modules ou arquivo CSS simples (evitar over-engineering com CSS-in-JS para este escopo)
- Paleta de cores sugerida: tons neutros (branco, cinza) com uma cor de destaque para ações primárias
- Garantir que o botão de remover tenha `aria-label="Remover tarefa: {título}"`
- Checkbox/botão de toggle deve ter `aria-label="Marcar como concluída: {título}"` ou `"Marcar como pendente: {título}"`
- Focus visible (`:focus-visible`) com outline claro em todos os elementos interativos
- Usar `prefers-reduced-motion` para respeitar preferência do usuário

**Responsividade:**
- Desktop: container com `max-width: 600px`, centralizado
- Tablet: manter layout, ajustar padding
- Mobile: campo e botão em stack vertical, touch targets de no mínimo 44x44px

## Critérios de Sucesso

- Interface visualmente polida e profissional (qualidade de portfólio)
- Layout funciona em viewports de 320px a 1920px sem quebrar
- Tarefas concluídas visualmente distintas das pendentes
- Todos os elementos interativos acessíveis por teclado (Tab navega, Enter ativa)
- Contraste de cores atende WCAG AA (verificar com ferramenta de acessibilidade)
- Focus states visíveis em todos os elementos interativos
- Loading state exibido durante carregamento inicial

## Testes da Tarefa

- [ ] **Teste manual:** verificar layout em viewport desktop (1024px+)
- [ ] **Teste manual:** verificar layout em viewport mobile (375px — iPhone SE)
- [ ] **Teste manual:** verificar layout em viewport tablet (768px — iPad)
- [ ] **Teste manual:** navegar toda a interface usando apenas teclado (Tab, Enter, Escape)
- [ ] **Teste manual:** verificar contraste de cores com DevTools ou extensão de acessibilidade
- [ ] **Teste manual:** verificar que tarefas concluídas têm diferenciação visual clara
- [ ] **Teste manual:** verificar loading state ao carregar a página
- [ ] **Teste manual:** verificar hover/focus states em botões e campo de texto
- [ ] **Teste unitário:** verificar que componentes renderizam com classes CSS corretas
- [ ] **Teste unitário:** verificar atributos `aria-label` nos elementos interativos

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `frontend/src/App.css` ou `frontend/src/styles/` — Estilos globais e de componentes (novo/atualizado)
- `frontend/src/components/TodoForm.tsx` — Adicionar classes e atributos de acessibilidade
- `frontend/src/components/TodoItem.tsx` — Adicionar classes e atributos de acessibilidade
- `frontend/src/components/TodoList.tsx` — Adicionar classes e atributos de acessibilidade
- `frontend/src/index.css` — Reset CSS e variáveis globais
- [PRD](../../Tasks/PRD.md) — Seções "Requisitos de UI/UX" e "Requisitos de Acessibilidade"
- [Tech Spec](../../Tasks/TechSpec.md) — Seção "Sequenciamento de Desenvolvimento > Item 6"
