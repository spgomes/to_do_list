# Tarefa 5.0: Auth Pages e Responsivo

<critical>Ler o arquivo C:\Users\silvi\.claude\plans\abstract-booping-newt.md antes de implementar. Sua tarefa será invalidada se você não ler esse arquivo.</critical>

## Visão Geral

Aplica a estética de papel nas páginas de Login e Registro, e garante que toda a aplicação funciona bem em telas menores (tablet 768px e mobile 480px). É a tarefa de acabamento — ao final, toda a app deve ter visual consistente de caderno/papel em qualquer dispositivo.

**Depende das Tarefas 1.0 a 4.0** — usa todas as variáveis, fontes e padrões definidos anteriormente.

<requirements>
- A `.auth-card` deve parecer uma folha de papel solta: fundo `var(--color-surface)`, sombra de pilha de papel (`box-shadow` em 3 camadas), sem `border-radius` excessivo (~4px)
- O `.auth-title` deve usar `var(--font-family-display)` (Caveat), tamanho ~2.5rem
- Os `.auth-input` devem seguir o mesmo estilo underline da Tarefa 4.0: apenas `border-bottom`, sem borda de caixa
- O `.auth-button` deve seguir o mesmo estilo de botão primário da Tarefa 4.0 (hover lift + active press + ripple)
- A `.auth-page` deve exibir o fundo de linhas pautadas (herdado do `body`) — não adicionar fundo sólido que cubra as linhas
- O `.auth-card` pode ter uma leve rotação de `-0.5deg` para parecer uma folha jogada sobre a mesa
- O `.auth-link` deve ter cor `var(--color-primary)` com underline e hover mais escuro
- **Responsivo — Mobile (480px)**:
  - `.app`: padding reduzido, sem margem lateral
  - `.todo-form`: empilhar em coluna (já existia, manter)
  - `.todo-form-button`: largura 100%
  - `.list-cards-grid`: 1 coluna
  - Cards não devem ter rotação em mobile (muito conteúdo + tela pequena = confuso)
  - `.app::before` (margem vermelha) deve ser ocultada em mobile (`display: none`)
- **Responsivo — Tablet (768px)**:
  - `.list-cards-grid`: máximo 2 colunas
  - Título do header ligeiramente menor
  - `.app::before` mantida mas deslocada para acompanhar o novo padding
- A `auth-card` em mobile (480px) deve ocupar toda a largura, sem sombra (mais simples para telas pequenas)
</requirements>

## Subtarefas

- [ ] 5.1 Atualizar `.auth-card` em `App.css`: fundo de superfície, sombra de pilha, `border-radius: 4px`, `transform: rotate(-0.5deg)`
- [ ] 5.2 Atualizar `.auth-title` em `App.css`: `font-family: var(--font-family-display)`, tamanho ~2.5rem
- [ ] 5.3 Atualizar `.auth-input` em `App.css`: trocar `border: 2px solid` por `border-bottom: 2px solid`, fundo transparente, sem `border-radius`
- [ ] 5.4 Atualizar `.auth-button` em `App.css`: reusar os mesmos estilos do `.todo-form-button` (hover lift, active press, border-bottom carimbo, ripple)
- [ ] 5.5 Verificar `.auth-page` em `App.css`: remover qualquer `background-color` sólido que cubra as linhas do body
- [ ] 5.6 Atualizar `@media (max-width: 768px)` em `App.css`: 2 colunas no grid, título menor, ajustar `left` do `::before`
- [ ] 5.7 Atualizar `@media (max-width: 480px)` em `App.css`:
  - `.list-cards-grid`: `grid-template-columns: 1fr`
  - Remover rotações dos cards (`:nth-child(odd/even) { transform: none }`)
  - Ocultar `.app::before` (`display: none`)
  - `.auth-card`: largura 100%, sem sombra, sem rotação, sem `border-radius`

## Detalhes de Implementação

### Auth card como folha de papel

```css
.auth-card {
  background-color: var(--color-surface);
  background-image: repeating-linear-gradient(
    transparent,
    transparent 27px,
    rgba(212, 200, 176, 0.35) 27px,
    rgba(212, 200, 176, 0.35) 28px
  );
  border-radius: 4px;
  box-shadow:
    2px 3px 5px rgba(42, 36, 24, 0.1),
    4px 6px 10px rgba(42, 36, 24, 0.07),
    0 1px 2px rgba(42, 36, 24, 0.05);
  transform: rotate(-0.5deg);
  max-width: 420px;
  width: 100%;
  padding: var(--spacing-2xl);
}
```

### Inputs de auth com underline

```css
.auth-input {
  border: none;
  border-bottom: 2px solid var(--color-border);
  border-radius: 0;
  background: transparent;
  padding: var(--spacing-sm) var(--spacing-xs);
  transition: border-bottom-color var(--transition-fast);
  min-height: 44px;
}

.auth-input:focus-visible {
  border-bottom-color: var(--color-primary);
  box-shadow: 0 2px 0 var(--color-primary);
  outline: none;
}
```

### Responsivo mobile — remover rotações e margem

```css
@media (max-width: 480px) {
  .list-cards-grid {
    grid-template-columns: 1fr;
  }

  /* Remover rotação dos cards em mobile */
  .list-card:nth-child(odd),
  .list-card:nth-child(even) {
    transform: none;
  }

  /* Ocultar margem de caderno em mobile */
  .app::before {
    display: none;
  }

  /* Auth card simples em mobile */
  .auth-card {
    transform: none;
    box-shadow: none;
    border-radius: 0;
    background-image: none;
    padding: var(--spacing-xl) var(--spacing-lg);
  }
}
```

### Responsivo tablet

```css
@media (max-width: 768px) {
  .list-cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }

  .app-title {
    font-size: 2.2rem;
  }

  .app::before {
    left: 32px; /* acompanha o padding reduzido */
  }
}
```

## Critérios de Sucesso

- Página de Login/Registro tem visual consistente com o restante da app (fundo pautado, card de papel, fonte Caveat no título)
- O formulário de auth usa inputs com underline (sem caixa)
- O botão de entrar/cadastrar tem o mesmo efeito de press dos demais botões
- Em telas de 768px: o grid de cards exibe no máximo 2 colunas
- Em telas de 480px: grid em coluna única, sem rotação dos cards, sem margem vermelha, auth card sem rotação
- `npm run test` continua passando
- A aplicação inteira é visualmente consistente — nenhum elemento "fora do tema" (cinza puro, azul Apple, borda de caixa em input)

## Testes da Tarefa

- [ ] **Regressão unitária**: rodar `npm run test` — esta tarefa não altera TSX (apenas CSS), todos os testes devem passar
- [ ] **Checklist visual manual — Desktop (1280px+)**:
  - [ ] Página de login tem fundo pautado visível
  - [ ] Card de login/registro parece uma folha de papel (linhas internas + sombra + leve rotação)
  - [ ] Título do card está em Caveat
  - [ ] Inputs de email/senha têm apenas linha embaixo
  - [ ] Botão de entrar tem efeito de press e ripple
- [ ] **Checklist visual manual — Tablet (768px)**:
  - [ ] Grid de cards: máximo 2 colunas
  - [ ] Margem vermelha ainda visível, ajustada ao padding
  - [ ] Título do header ligeiramente menor
- [ ] **Checklist visual manual — Mobile (480px)**:
  - [ ] Grid: coluna única
  - [ ] Cards sem rotação (layout limpo em tela pequena)
  - [ ] Margem vermelha ocultada
  - [ ] Formulário principal em coluna (input em cima, botão embaixo)
  - [ ] Auth card: sem sombra, sem rotação, largura total

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- [frontend/src/App.css](frontend/src/App.css) — seções `.auth-*` e `@media` queries (linhas finais do arquivo)
- [frontend/src/pages/LoginPage.tsx](frontend/src/pages/LoginPage.tsx) — confirmar que usa as classes `.auth-page`, `.auth-card`, `.auth-title`, `.auth-input`, `.auth-button` (não deve precisar de alteração TSX)
- [frontend/src/pages/RegisterPage.tsx](frontend/src/pages/RegisterPage.tsx) — idem LoginPage
