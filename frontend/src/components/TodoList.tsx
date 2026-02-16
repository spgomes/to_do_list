import type { Todo } from "../types/todo";
import type { Tag } from "../types/tag";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  tags?: Tag[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, title: string) => Promise<void>;
  onAddTag?: (todoId: number, tagId: number) => Promise<void>;
  onRemoveTag?: (todoId: number, tagId: number) => Promise<void>;
  tagError?: string;
  tagErrorTodoId?: number | null;
}

export function TodoList({
  todos,
  tags = [],
  onToggle,
  onDelete,
  onEdit,
  onAddTag,
  onRemoveTag,
  tagError,
  tagErrorTodoId,
}: TodoListProps) {
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
          onEdit={onEdit}
          allTags={tags}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          tagError={tagErrorTodoId === todo.id ? tagError : undefined}
        />
      ))}
    </ul>
  );
}
