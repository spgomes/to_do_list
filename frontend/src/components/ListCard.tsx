import { useState } from "react";
import type { Todo } from "../types/todo";
import type { List } from "../types/list";
import { TodoItem } from "./TodoItem";

interface ListCardProps {
  list: List | null;
  todos: Todo[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, title: string) => Promise<void>;
  onCreateTodo: (title: string) => Promise<void>;
  onDropTodo: (todoId: number, targetList: List | null) => Promise<void>;
}

export function ListCard({
  list,
  todos,
  onToggle,
  onDelete,
  onEdit,
  onCreateTodo,
  onDropTodo,
}: ListCardProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDragEnter() {
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const todoIdStr = e.dataTransfer.getData("todoId");
    if (!todoIdStr) return;
    const todoId = Number(todoIdStr);
    if (Number.isNaN(todoId)) return;
    await onDropTodo(todoId, list);
  }

  const title = list?.name ?? "Sem lista";
  const color = list?.color ?? "var(--color-border, #e0e0e0)";

  async function handleInlineSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setFormError("");
    setIsSubmitting(true);
    try {
      await onCreateTodo(trimmed);
      setInputValue("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao adicionar tarefa");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article
      className={`list-card ${isDragOver ? "drag-over" : ""}`}
      data-testid="list-card"
      aria-label={`Lista: ${title}`}
      style={{ borderLeftColor: color }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
            />
          ))}
        </ul>
      )}
      <form onSubmit={handleInlineSubmit} className="list-card-add-form" data-testid="list-card-add-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Nova tarefa..."
          disabled={isSubmitting}
          maxLength={255}
          aria-label={`Adicionar tarefa em ${title}`}
        />
        <button type="submit" disabled={isSubmitting || !inputValue.trim()}>
          {isSubmitting ? "..." : "Adicionar"}
        </button>
        {formError && (
          <p className="list-card-form-error" role="alert">
            {formError}
          </p>
        )}
      </form>
    </article>
  );
}
