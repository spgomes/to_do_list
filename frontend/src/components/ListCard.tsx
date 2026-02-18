import type { Todo } from "../types/todo";
import type { List } from "../types/list";
import { TodoItem } from "./TodoItem";

interface ListCardProps {
  list: List | null;
  todos: Todo[];
  allLists: List[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, title: string) => Promise<void>;
  onAddList?: (todoId: number, listId: number) => Promise<void>;
  onRemoveList?: (todoId: number, listId: number) => Promise<void>;
  listError?: string;
  listErrorTodoId?: number | null;
}

export function ListCard({
  list,
  todos,
  allLists,
  onToggle,
  onDelete,
  onEdit,
  onAddList,
  onRemoveList,
  listError,
  listErrorTodoId,
}: ListCardProps) {
  const title = list?.name ?? "Sem lista";
  const color = list?.color ?? "var(--color-border, #e0e0e0)";

  return (
    <article
      className="list-card"
      aria-label={`Lista: ${title}`}
      style={{ borderLeftColor: color }}
    >
      <h2 className="list-card-title" style={{ borderBottomColor: color }}>
        {title}
      </h2>
      {todos.length === 0 ? (
        <p className="list-card-empty">Nenhuma tarefa</p>
      ) : (
        <ul className="todo-list list-card-tasks" aria-label={`Tarefas de ${title}`}>
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              allLists={allLists}
              onAddList={onAddList}
              onRemoveList={onRemoveList}
              listError={listErrorTodoId === todo.id ? listError : undefined}
            />
          ))}
        </ul>
      )}
    </article>
  );
}
