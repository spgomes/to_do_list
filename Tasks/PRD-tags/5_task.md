# Tarefa 5.0: Testes E2E — Fluxos ponta-a-ponta de tags

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Garantir que a funcionalidade de tags funciona do ponto de vista do usuário final, cobrindo o fluxo completo frontend + backend. Implementar testes E2E com Playwright para criar tags, associar tags a tarefas, remover tags e validar feedback de erros.

<requirements>
- Criar testes E2E com Playwright cobrindo os fluxos principais de tags
- Garantir que testes são determinísticos (setup/teardown de dados)
- Cobrir casos de erro relevantes (ex: duplicidade, validação)
- Rodar via `npm run test:e2e` (script já existe)
</requirements>

## Subtarefas

- [x] 5.1 Definir estratégia de dados de teste (ex: iniciar backend com DB limpo para E2E)
- [x] 5.2 Criar teste E2E: criar tag e validar que aparece na UI
- [x] 5.3 Criar teste E2E: associar tag a uma tarefa e validar chip na lista
- [x] 5.4 Criar teste E2E: remover tag de uma tarefa e validar remoção
- [x] 5.5 Criar teste E2E: renomear e deletar tag (e validar comportamento esperado)
- [x] 5.6 Criar teste E2E: tentativa de criar tag duplicada (validar feedback de erro)

## Detalhes de Implementação

Referência: `./techspec.md`

- Seções relevantes:
  - **Abordagem de Testes → Testes de E2E**
  - **Validações e Erros**

Notas:
- Preferir seletores acessíveis (`getByRole`, `getByLabel`, `getByText`) para estabilidade
- Evitar flakiness: aguardar estados de UI (ex: loading) e respostas concluídas

## Critérios de Sucesso

- Testes E2E cobrem os principais cenários de negócio de tags
- Testes rodam de forma consistente em ambiente local
- Falhas retornam mensagens claras e ajudam a diagnosticar problemas

## Testes da Tarefa

- [x] Testes de unidade
  - (Não aplicável; foco é E2E)
- [x] Testes de integração
  - (Não aplicável; foco é E2E)
- [x] Testes E2E executados: 5 cenários em `frontend/e2e/tags.spec.ts` (5.2–5.6); todos passando junto com a suíte completa (31 testes).

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `Tasks/PRD-tags/PRD.md`
- `Tasks/PRD-tags/techspec.md`
- `frontend/package.json`
- `frontend/e2e/` (ou pasta equivalente de testes Playwright)
