import type { Todo } from "../types/todo.ts";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  function handleToggle() {
    onToggle(todo.id, !todo.completed);
  }

  function handleDelete() {
    if (window.confirm("Tem certeza que deseja remover esta tarefa?")) {
      onDelete(todo.id);
    }
  }

  return (
    <li className={`todo-item ${todo.completed ? "completed" : ""}`}>
      <label className="todo-label">
        <input
          type="checkbox"
          className="todo-checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          aria-label={
            todo.completed
              ? `Marcar como pendente: ${todo.title}`
              : `Marcar como concluída: ${todo.title}`
          }
        />
        <span className="todo-title">{todo.title}</span>
      </label>
      <button
        className="delete-button"
        onClick={handleDelete}
        aria-label={`Remover tarefa: ${todo.title}`}
      >
        Remover
      </button>
    </li>
  );
}
