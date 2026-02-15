# Tarefa 3.0: Testes E2E — Soft Delete + Edição de Título

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Adicionar testes E2E (Playwright) para cobrir os dois novos fluxos:
1. **Soft delete** — tarefa removida não deve aparecer na lista, nem após reload de página
2. **Edição inline de título** — usuário edita o título e a alteração persiste após reload

Os testes devem ser adicionados ao arquivo existente `frontend/e2e/todos.spec.ts`, seguindo o mesmo padrão já estabelecido (helpers `registerViaAPI`, `authenticateInBrowser`, etc.).

**Depende de:** Task 1.0 e Task 2.0

<requirements>
- Adicionar novo `test.describe("Soft Delete")` em `todos.spec.ts`
- Adicionar novo `test.describe("Edição de Título")` em `todos.spec.ts`
- Reusar os helpers existentes: `registerViaAPI`, `authenticateInBrowser`
- Cada teste deve criar seu próprio usuário com `uniqueEmail()` para isolamento
- Os testes não devem depender de estado deixado por outros testes
- Seguir o padrão: criar dados via API → autenticar no browser → interagir via UI → verificar resultado
</requirements>

## Subtarefas

- [ ] 3.1 Adicionar `test.describe("Soft Delete")` com os testes listados abaixo
- [ ] 3.2 Adicionar `test.describe("Edição de Título")` com os testes listados abaixo
- [ ] 3.3 Executar `npx playwright test` e garantir que todos os testes passam

## Detalhes de Implementação

### Estrutura dos testes de soft delete

```ts
test.describe("Soft Delete", () => {
  let token: string;

  test.beforeEach(async ({ request }) => {
    token = await registerViaAPI(request, uniqueEmail(), TEST_PASSWORD);
  });

  test("tarefa removida some da lista imediatamente", async ({ page, request }) => {
    // 1. Criar tarefa via API
    // 2. Autenticar no browser
    // 3. Clicar em Remover + aceitar dialog
    // 4. Verificar que a tarefa não aparece mais na lista
  });

  test("tarefa removida não reaparece após reload da página", async ({ page, request }) => {
    // 1. Criar tarefa via API
    // 2. Deletar via API (soft delete)
    // 3. Autenticar no browser
    // 4. Verificar que a tarefa não aparece (nunca foi exibida)
    // 5. Recarregar a página e verificar novamente
  });

  test("outras tarefas não são afetadas ao remover uma", async ({ page, request }) => {
    // 1. Criar duas tarefas via API
    // 2. Remover apenas a primeira via UI
    // 3. Verificar que a segunda ainda aparece
  });
});
```

### Estrutura dos testes de edição de título

```ts
test.describe("Edição de Título", () => {
  let token: string;

  test.beforeEach(async ({ request }) => {
    token = await registerViaAPI(request, uniqueEmail(), TEST_PASSWORD);
  });

  test("editar título via Enter salva e exibe o novo texto", async ({ page, request }) => {
    // 1. Criar tarefa via API
    // 2. Autenticar no browser
    // 3. Clicar em Editar
    // 4. Limpar input e digitar novo título
    // 5. Pressionar Enter
    // 6. Verificar que o novo título aparece na lista
  });

  test("novo título persiste após reload da página", async ({ page, request }) => {
    // 1. Criar tarefa via API
    // 2. Autenticar no browser, editar título, confirmar
    // 3. Recarregar a página
    // 4. Verificar que o novo título ainda aparece
  });

  test("Escape cancela a edição e restaura o título original", async ({ page, request }) => {
    // 1. Criar tarefa via API
    // 2. Autenticar no browser
    // 3. Clicar em Editar, digitar algo
    // 4. Pressionar Escape
    // 5. Verificar que o título original ainda aparece (não o digitado)
  });

  test("não é possível salvar título vazio", async ({ page, request }) => {
    // 1. Criar tarefa via API
    // 2. Autenticar no browser
    // 3. Clicar em Editar, limpar o input, pressionar Enter
    // 4. Verificar que o modo edição foi cancelado sem alterar o título
    //    OU que o input ainda está visível sem chamar a API
  });
});
```

### Observação sobre o helper `deleteAllTodos`

O helper existente chama `DELETE /api/todos/{id}`. Com soft delete, a lógica continua funcionando — o endpoint continua retornando 204. Nenhuma alteração necessária.

## Critérios de Sucesso

- Todos os testes novos passam sem flaky (rodar `npx playwright test` 2x para confirmar estabilidade)
- Nenhum teste existente é quebrado pelas mudanças
- Os testes cobrem: remoção imediata, persistência após reload, isolamento de outras tarefas, edição com Enter, persistência da edição, cancelamento com Escape e rejeição de título vazio

## Testes da Tarefa

Os testes **são** a tarefa. Executar com:

```bash
cd frontend
npx playwright test
```

Para rodar apenas os novos grupos:

```bash
npx playwright test --grep "Soft Delete|Edição de Título"
```

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `frontend/e2e/todos.spec.ts` — arquivo onde os testes devem ser adicionados
- `frontend/playwright.config.ts` — configuração do Playwright (não alterar)
