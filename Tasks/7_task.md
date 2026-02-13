# Tarefa 7.0: Testes End-to-End com Playwright

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Configurar o Playwright e implementar testes end-to-end que validam os fluxos completos da aplicação no navegador. Estes testes garantem que a integração entre frontend, backend e banco de dados funciona corretamente do ponto de vista do usuário final.

**Dependências:** Tarefa 5.0 (aplicação funcional) e Tarefa 6.0 (estilização e acessibilidade finalizadas).

<requirements>
- Playwright instalado e configurado no projeto
- Testes E2E cobrindo os 4 fluxos principais: adicionar, listar, marcar como concluída, remover
- Teste de validação de campo vazio e feedback visual
- Teste de reversão de status (concluída → pendente)
- Teste de estado vazio (mensagem "Nenhuma tarefa cadastrada")
- Testes executáveis com um único comando
- Setup/teardown que garante estado limpo do banco entre testes
</requirements>

## Subtarefas

- [ ] 7.1 Instalar Playwright: `npm init playwright@latest` no diretório do frontend (ou raiz)
- [ ] 7.2 Configurar `playwright.config.ts`: base URL, web server (iniciar backend + frontend automaticamente), browser(s)
- [ ] 7.3 Criar script de setup para garantir banco de dados limpo antes de cada teste
- [ ] 7.4 Implementar teste E2E: adicionar tarefa e verificar que aparece na lista
- [ ] 7.5 Implementar teste E2E: marcar tarefa como concluída e verificar diferenciação visual
- [ ] 7.6 Implementar teste E2E: reverter tarefa concluída para pendente
- [ ] 7.7 Implementar teste E2E: remover tarefa com confirmação e verificar remoção da lista
- [ ] 7.8 Implementar teste E2E: tentar adicionar tarefa com campo vazio e verificar feedback de erro
- [ ] 7.9 Implementar teste E2E: verificar estado vazio (mensagem "Nenhuma tarefa cadastrada")
- [ ] 7.10 Executar todos os testes E2E e garantir que passam

## Detalhes de Implementação

Consultar a seção **"Testes de E2E"** na [techspec.md](../../Tasks/TechSpec.md).

**Configuração sugerida do Playwright:**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:5173',
  webServer: [
    {
      command: 'cd ../backend && go run .',
      port: 8080,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

**Pontos de atenção:**
- Para garantir estado limpo, considerar: (a) deletar o arquivo `todos.db` antes de cada suite de testes, ou (b) usar API DELETE para limpar tarefas no `beforeEach`
- Usar `page.getByRole()`, `page.getByText()` e `page.getByPlaceholder()` para seletores acessíveis
- Para confirmação de deleção (`window.confirm`), usar `page.on('dialog', dialog => dialog.accept())`
- Verificar diferenciação visual de tarefa concluída com `toHaveCSS('text-decoration', ...)` ou verificando classe CSS
- Configurar timeout adequado para esperar o backend iniciar

**Estrutura de arquivos sugerida:**
```
frontend/
├── e2e/
│   └── todos.spec.ts    # Todos os testes E2E
├── playwright.config.ts
```

## Critérios de Sucesso

- `npx playwright test` executa todos os testes E2E com sucesso
- Testes cobrem os 4 fluxos CRUD completos
- Testes validam feedback visual (campo vazio, lista vazia, tarefa concluída)
- Testes são independentes (cada teste começa com estado limpo)
- Testes rodam de forma determinística (sem flaky tests)

## Testes da Tarefa

- [ ] **E2E:** Página carrega e exibe mensagem de lista vazia
- [ ] **E2E:** Adicionar tarefa — digitar título, clicar Adicionar, verificar que aparece na lista
- [ ] **E2E:** Adicionar tarefa via Enter — digitar título, pressionar Enter, verificar que aparece
- [ ] **E2E:** Validação de campo vazio — clicar Adicionar sem título, verificar mensagem de erro
- [ ] **E2E:** Marcar como concluída — clicar checkbox/botão, verificar diferenciação visual (texto riscado)
- [ ] **E2E:** Reverter para pendente — clicar novamente no checkbox/botão, verificar que texto volta ao normal
- [ ] **E2E:** Remover tarefa — clicar remover, aceitar confirmação, verificar que desaparece da lista
- [ ] **E2E:** Fluxo completo — adicionar 3 tarefas, concluir 1, remover 1, verificar estado final da lista
- [ ] **E2E:** Persistência — adicionar tarefa, recarregar página, verificar que tarefa ainda está na lista

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `frontend/e2e/todos.spec.ts` — Testes E2E (novo)
- `frontend/playwright.config.ts` — Configuração do Playwright (novo)
- `frontend/package.json` — Adicionar Playwright como dependência de dev
- `backend/main.go` — Backend precisa estar rodando para os testes
- [PRD](../../Tasks/PRD.md) — Fluxo principal e requisitos funcionais
- [Tech Spec](../../Tasks/TechSpec.md) — Seção "Testes de E2E"
