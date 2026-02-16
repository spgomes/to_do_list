import { useState, useRef, useEffect } from "react";
import type { Tag } from "../types/tag";
import { TagChip } from "./TagChip";

interface TagSelectorProps {
  todoId: number;
  currentTags: Tag[];
  allTags: Tag[];
  onAdd: (todoId: number, tagId: number) => Promise<void>;
  onRemove: (todoId: number, tagId: number) => Promise<void>;
  disabled?: boolean;
  addTagError?: string;
}

export function TagSelector({
  todoId,
  currentTags,
  allTags,
  onAdd,
  onRemove,
  disabled,
  addTagError,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentIds = new Set(currentTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !currentIds.has(t.id));

  useEffect(() => {
    setError(addTagError ?? null);
  }, [addTagError]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAdd(tagId: number) {
    setAdding(true);
    setError(null);
    try {
      await onAdd(todoId, tagId);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar tag");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(tagId: number) {
    setError(null);
    try {
      await onRemove(todoId, tagId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover tag");
    }
  }

  return (
    <div className="tag-selector" ref={dropdownRef}>
      <div className="tag-selector-chips" role="list" aria-label="Tags da tarefa">
        {currentTags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            onRemove={disabled ? undefined : () => handleRemove(tag.id)}
          />
        ))}
      </div>
      {!disabled && availableTags.length > 0 && (
        <div className="tag-selector-dropdown">
          <button
            type="button"
            className="tag-selector-trigger"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label="Adicionar tag à tarefa"
          >
            + Tag
          </button>
          {open && (
            <ul
              className="tag-selector-menu"
              role="listbox"
              aria-label="Tags disponíveis"
            >
              {availableTags.map((tag) => (
                <li key={tag.id} role="option">
                  <button
                    type="button"
                    className="tag-selector-option"
                    onClick={() => handleAdd(tag.id)}
                    disabled={adding}
                    aria-label={`Adicionar tag ${tag.name}`}
                  >
                    {tag.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {(error || addTagError) && (
        <p className="tag-selector-error" role="alert">
          {error || addTagError}
        </p>
      )}
    </div>
  );
}
