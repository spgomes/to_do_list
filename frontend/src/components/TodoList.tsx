import type { Todo } from "../types/todo";
import type { List } from "../types/list";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  lists?: List[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, title: string) => Promise<void>;
  onAddList?: (todoId: number, listId: number) => Promise<void>;
  onRemoveList?: (todoId: number, listId: number) => Promise<void>;
  listError?: string;
  listErrorTodoId?: number | null;
}

export function TodoList({
  todos,
  lists = [],
  onToggle,
  onDelete,
  onEdit,
  onAddList,
  onRemoveList,
  listError,
  listErrorTodoId,
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
          allLists={lists}
          onAddList={onAddList}
          onRemoveList={onRemoveList}
          listError={listErrorTodoId === todo.id ? listError : undefined}
        />
      ))}
    </ul>
  );
}
