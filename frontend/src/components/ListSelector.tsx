import { useState, useRef, useEffect } from "react";
import type { List } from "../types/list";
import { ListChip } from "./ListChip";

interface ListSelectorProps {
  todoId: number;
  currentLists: List[];
  allLists: List[];
  onAdd: (todoId: number, listId: number) => Promise<void>;
  onRemove: (todoId: number, listId: number) => Promise<void>;
  disabled?: boolean;
  addListError?: string;
}

export function ListSelector({
  todoId,
  currentLists,
  allLists,
  onAdd,
  onRemove,
  disabled,
  addListError,
}: ListSelectorProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentIds = new Set(currentLists.map((l) => l.id));
  const availableLists = allLists.filter((l) => !currentIds.has(l.id));

  useEffect(() => {
    setError(addListError ?? null);
  }, [addListError]);

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

  async function handleAdd(listId: number) {
    setAdding(true);
    setError(null);
    try {
      await onAdd(todoId, listId);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar lista");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(listId: number) {
    setError(null);
    try {
      await onRemove(todoId, listId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover lista");
    }
  }

  return (
    <div className="tag-selector" ref={dropdownRef}>
      <div className="tag-selector-chips" role="list" aria-label="Listas da tarefa">
        {currentLists.map((list) => (
          <ListChip
            key={list.id}
            list={list}
            onRemove={disabled ? undefined : () => handleRemove(list.id)}
          />
        ))}
      </div>
      {!disabled && availableLists.length > 0 && (
        <div className="tag-selector-dropdown">
          <button
            type="button"
            className="tag-selector-trigger"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label="Adicionar lista à tarefa"
          >
            + Lista
          </button>
          {open && (
            <ul
              className="tag-selector-menu"
              role="listbox"
              aria-label="Listas disponíveis"
            >
              {availableLists.map((list) => (
                <li key={list.id} role="option">
                  <button
                    type="button"
                    className="tag-selector-option"
                    onClick={() => handleAdd(list.id)}
                    disabled={adding}
                    aria-label={`Adicionar lista ${list.name}`}
                  >
                    {list.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {(error || addListError) && (
        <p className="tag-selector-error" role="alert">
          {error || addListError}
        </p>
      )}
    </div>
  );
}
