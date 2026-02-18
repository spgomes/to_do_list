# Tarefa 4.0: Testes E2E — Novo fluxo de listas e drag & drop

<critical>Ler os arquivos Tasks/PRD.md e Tasks/TechSpec.md antes de implementar. Sua tarefa será invalidada se você não ler esses arquivos.</critical>

## Visão Geral

Implementar testes E2E com **Playwright** cobrindo o novo fluxo completo de uso das listas. Esta tarefa depende das **Tarefas 1.0, 2.0 e 3.0** estarem concluídas e funcionando.

Os testes devem simular um usuário real no navegador: fazer login, criar listas, criar tarefas (avulsas e dentro de listas) e arrastar tarefas entre listas.

<requirements>
- Os testes E2E devem ser independentes entre si — cada teste começa com estado limpo (ou cria seu próprio estado)
- Os testes devem usar a aplicação rodando localmente (backend + frontend)
- Deve haver um mecanismo de setup para criar usuário de teste (ou reutilizar login via API antes de cada teste)
- Cobrir todos os fluxos descritos nas subtarefas abaixo
- Os testes devem passar de forma estável (sem flakiness de timing — usar `await page.waitForSelector` ou locators do Playwright em vez de `page.waitForTimeout`)
</requirements>

## Subtarefas

- [ ] 4.1 **Setup**: configurar um usuário de teste (email/senha fixos) e fazer login via UI ou diretamente via `request.post('/api/auth/login')` para obter o token antes de cada teste
- [ ] 4.2 **Criar lista com cor**: acessar "Gerenciar listas", preencher nome "Trabalho", selecionar cor azul (#BBDEFB), clicar em "Criar" → verificar que o card "Trabalho" aparece na tela com a cor correta
- [ ] 4.3 **Criar tarefa avulsa**: usar o `TodoForm` global no topo, digitar "Tarefa avulsa", clicar em "Adicionar" → verificar que a tarefa aparece no card "Sem lista"
- [ ] 4.4 **Criar tarefa dentro de uma lista**: usar o formulário inline dentro do card "Trabalho", digitar "Tarefa do trabalho", clicar em "Adicionar" → verificar que a tarefa aparece no card "Trabalho" e não no card "Sem lista"
- [ ] 4.5 **Arrastar tarefa avulsa para uma lista**: arrastar "Tarefa avulsa" do card "Sem lista" para o card "Trabalho" → verificar que a tarefa saiu do card "Sem lista" e apareceu no card "Trabalho"
- [ ] 4.6 **Arrastar tarefa entre listas**: criar segunda lista "Pessoal", arrastar "Tarefa do trabalho" do card "Trabalho" para o card "Pessoal" → verificar que a tarefa mudou de card
- [ ] 4.7 **Arrastar tarefa de volta para "Sem lista"**: arrastar uma tarefa de um card de lista para o card "Sem lista" → verificar que a tarefa aparece no card "Sem lista"
- [ ] 4.8 **Persistência após reload**: após criar lista e tarefas, recarregar a página → verificar que o estado é mantido (tarefas no card correto)

## Detalhes de Implementação

### Drag & Drop com Playwright

O Playwright possui suporte nativo a drag & drop via `page.dragAndDrop(source, target)` ou via `locator.dragTo(target)`. Use `locator.dragTo()` por ser mais confiável:

```typescript
// Arrastar "Tarefa avulsa" para o card "Trabalho"
const todoItem = page.locator('[data-testid="todo-item"]', { hasText: "Tarefa avulsa" });
const targetCard = page.locator('[data-testid="list-card"]', { hasText: "Trabalho" });
await todoItem.dragTo(targetCard);
```

**Importante:** Adicionar `data-testid` nos componentes onde necessário:
- `TodoItem` → `data-testid="todo-item"`
- `ListCard` → `data-testid="list-card"`
- Formulário inline do `ListCard` → `data-testid="list-card-add-form"`

### Setup de usuário de teste

Usar `test.beforeEach` com a API de `request` do Playwright para criar usuário e fazer login:

```typescript
test.beforeEach(async ({ page, request }) => {
  // Registrar usuário (pode falhar se já existir — ignorar erro)
  await request.post('/api/auth/register', {
    data: { email: 'e2e@test.com', password: 'senha123' }
  }).catch(() => {});

  // Fazer login via UI
  await page.goto('/login');
  await page.fill('[aria-label="Email"]', 'e2e@test.com');
  await page.fill('[aria-label="Senha"]', 'senha123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
});
```

### Estrutura dos arquivos de teste

```
frontend/
└── e2e/
    ├── lists.spec.ts        # Testes 4.2, 4.3, 4.4, 4.8
    └── drag-and-drop.spec.ts # Testes 4.5, 4.6, 4.7
```

## Critérios de Sucesso

- Todos os 7 cenários de teste passam de forma estável
- Os testes são independentes (não dependem de ordem de execução)
- O relatório do Playwright não apresenta warnings de timing (`waitForTimeout`)
- `npx playwright test` executa sem erros no ambiente local

## Testes da Tarefa

Os testes desta tarefa **são** os testes E2E. Não há testes de unidade adicionais — apenas garantir que os cenários listados nas subtarefas passam.

Verificar também que os testes E2E existentes (se houver) continuam passando.

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- [frontend/e2e/lists.spec.ts](frontend/e2e/lists.spec.ts) — novo arquivo de testes E2E de listas
- [frontend/e2e/drag-and-drop.spec.ts](frontend/e2e/drag-and-drop.spec.ts) — novo arquivo de testes E2E de drag & drop
- [frontend/src/components/TodoItem.tsx](frontend/src/components/TodoItem.tsx) — adicionar `data-testid="todo-item"`
- [frontend/src/components/ListCard.tsx](frontend/src/components/ListCard.tsx) — adicionar `data-testid="list-card"` e `data-testid="list-card-add-form"`
- [frontend/playwright.config.ts](frontend/playwright.config.ts) — configuração do Playwright (baseURL, etc.)
