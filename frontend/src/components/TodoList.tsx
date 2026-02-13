import type { Todo } from "../types/todo.ts";
import { TodoItem } from "./TodoItem.tsx";

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="empty-message">Nenhuma tarefa cadastrada</p>;
  }

  return (
    <ul className="todo-list" aria-label="Lista de tarefas">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
