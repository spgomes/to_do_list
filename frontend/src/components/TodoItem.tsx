import { useState } from "react";
import type { Todo } from "../types/todo";
import type { Tag } from "../types/tag";
import { TagSelector } from "./TagSelector";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number, title: string) => Promise<void>;
  allTags?: Tag[];
  onAddTag?: (todoId: number, tagId: number) => Promise<void>;
  onRemoveTag?: (todoId: number, tagId: number) => Promise<void>;
  tagError?: string;
}

export function TodoItem({
  todo,
  onToggle,
  onDelete,
  onEdit,
  allTags = [],
  onAddTag,
  onRemoveTag,
  tagError,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(todo.title);
  const [isSaving, setIsSaving] = useState(false);

  function handleToggle() {
    onToggle(todo.id, !todo.completed);
  }

  function handleDelete() {
    if (window.confirm("Tem certeza que deseja remover esta tarefa?")) {
      onDelete(todo.id);
    }
  }

  function handleEditStart() {
    setEditValue(todo.title);
    setIsEditing(true);
  }

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

  function handleEditCancel() {
    setEditValue(todo.title);
    setIsEditing(false);
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
        {isEditing ? (
          <input
            type="text"
            className="todo-title-edit"
            value={editValue}
            disabled={isSaving}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditConfirm}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleEditConfirm();
              }
              if (e.key === "Escape") {
                handleEditCancel();
              }
            }}
            aria-label="Editar título da tarefa"
            autoFocus
          />
        ) : (
          <span
            className="todo-title"
            onDoubleClick={handleEditStart}
          >
            {todo.title}
          </span>
        )}
      </label>
      {!isEditing && (
        <button
          type="button"
          className="edit-button"
          onClick={handleEditStart}
          aria-label={`Editar tarefa: ${todo.title}`}
        >
          Editar
        </button>
      )}
      <button
        type="button"
        className="delete-button"
        onClick={handleDelete}
        aria-label={`Remover tarefa: ${todo.title}`}
      >
        Remover
      </button>
      {allTags.length > 0 && onAddTag && onRemoveTag && (
        <div className="todo-item-tags">
          <TagSelector
            todoId={todo.id}
            currentTags={todo.tags ?? []}
            allTags={allTags}
            onAdd={onAddTag}
            onRemove={onRemoveTag}
            disabled={isEditing}
            addTagError={tagError}
          />
        </div>
      )}
    </li>
  );
}
