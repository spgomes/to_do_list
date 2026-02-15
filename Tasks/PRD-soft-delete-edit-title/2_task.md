# Tarefa 2.0: Frontend — Edição Inline de Título

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Permitir que o usuário edite o título de uma tarefa diretamente na lista, sem modal ou página separada.
Ao clicar no título (ou em um botão "Editar"), o texto vira um `<input>`. Confirmação com Enter ou blur; cancelamento com Escape.

**Depende de:** Task 1.0 (endpoint `PATCH /api/todos/{id}/title` deve estar disponível)

<requirements>
- Adicionar função `updateTodoTitle(id, title)` em `services/api.ts`
- `TodoItem.tsx` deve ter dois modos: visualização e edição
  - Modo edição: substituir o `<span>` do título por `<input type="text">`
  - Entrar no modo edição ao clicar no botão "Editar" (ou duplo clique no título)
  - Confirmar (salvar) ao pressionar Enter ou ao perder foco (blur)
  - Cancelar (descartar) ao pressionar Escape — restaura o título original
  - Não salvar se o título estiver vazio ou igual ao original
- Enquanto salva, o input deve ficar desabilitado (`disabled`) para evitar duplo envio
- Em caso de erro da API, exibir `alert()` com a mensagem e manter o modo edição aberto
- Atualizar o estado local após salvar com sucesso (sem refetch)
- Manter acessibilidade: `aria-label` no input e no botão Editar
- `onEdit` deve ser passado como prop em `TodoItemProps` (similar ao `onDelete`)
</requirements>

## Subtarefas

- [ ] 2.1 Adicionar `updateTodoTitle(id: number, title: string): Promise<void>` em `api.ts`
- [ ] 2.2 Adicionar prop `onEdit: (id: number, title: string) => Promise<void>` em `TodoItemProps`
- [ ] 2.3 Adicionar estado `isEditing` e `editValue` com `useState` em `TodoItem.tsx`
- [ ] 2.4 Renderizar `<input>` quando `isEditing === true`, `<span>` quando `false`
- [ ] 2.5 Implementar handlers: `handleEditStart`, `handleEditConfirm`, `handleEditCancel`
- [ ] 2.6 Adicionar botão "Editar" visível apenas no modo visualização
- [ ] 2.7 Conectar `onEdit` em `TodoApp.tsx` (ou onde `TodoItem` é usado) chamando `updateTodoTitle`
- [ ] 2.8 Escrever e executar testes

## Detalhes de Implementação

### Estado no TodoItem

```tsx
const [isEditing, setIsEditing] = useState(false);
const [editValue, setEditValue] = useState(todo.title);
const [isSaving, setIsSaving] = useState(false);
```

### Lógica de confirmação

```tsx
async function handleEditConfirm() {
  const trimmed = editValue.trim();
  if (!trimmed || trimmed === todo.title) {
    setIsEditing(false);
    return;
  }
  setIsSaving(true);
  try {
    await onEdit(todo.id, trimmed);
    setIsEditing(false);
  } catch (err) {
    alert(err instanceof Error ? err.message : "Erro ao salvar");
  } finally {
    setIsSaving(false);
  }
}
```

### Renderização condicional

```tsx
{isEditing ? (
  <input
    type="text"
    value={editValue}
    disabled={isSaving}
    onChange={e => setEditValue(e.target.value)}
    onBlur={handleEditConfirm}
    onKeyDown={e => {
      if (e.key === "Enter") handleEditConfirm();
      if (e.key === "Escape") handleEditCancel();
    }}
    aria-label="Editar título da tarefa"
    autoFocus
  />
) : (
  <span className="todo-title">{todo.title}</span>
)}
```

### Conexão em TodoApp (ou componente pai)

```tsx
async function handleEditTodo(id: number, title: string) {
  await updateTodoTitle(id, title);
  setTodos(prev => prev.map(t => t.id === id ? { ...t, title } : t));
}
```

## Critérios de Sucesso

- Clicar em "Editar" transforma o título em um campo de texto editável
- Enter ou blur salva e retorna para modo visualização com o novo título
- Escape cancela e restaura o título original sem chamar a API
- Título vazio não dispara chamada à API
- Título igual ao original não dispara chamada à API
- Input fica desabilitado durante o salvamento
- Erro da API exibe alert e mantém o modo edição aberto
- Testes passam com `npm test`

## Testes da Tarefa

### Testes unitários/componente (Vitest + Testing Library)

- [ ] `TodoItem — modo edição aparece ao clicar em Editar`
- [ ] `TodoItem — Enter confirma e chama onEdit com novo título`
- [ ] `TodoItem — Escape cancela sem chamar onEdit`
- [ ] `TodoItem — blur confirma e chama onEdit`
- [ ] `TodoItem — título vazio não chama onEdit`
- [ ] `TodoItem — título igual ao original não chama onEdit`
- [ ] `TodoItem — input fica disabled durante salvamento`
- [ ] `updateTodoTitle — faz PATCH /todos/{id}/title com body correto`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `frontend/src/services/api.ts` — camada HTTP
- `frontend/src/types/todo.ts` — interface Todo (não precisa alterar)
- `frontend/src/components/TodoItem.tsx` — componente principal desta task
- `frontend/src/components/TodoApp.tsx` — conectar `onEdit` prop
