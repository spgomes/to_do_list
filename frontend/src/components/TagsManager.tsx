import { useState } from "react";
import type { Tag } from "../types/tag";

interface TagsManagerProps {
  tags: Tag[];
  onCreateTag: (name: string) => Promise<void>;
  onUpdateTag: (id: number, name: string) => Promise<void>;
  onDeleteTag: (id: number) => Promise<void>;
  error: string | null;
  onClearError: () => void;
}

export function TagsManager({
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  error,
  onClearError,
}: TagsManagerProps) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    onClearError();
    try {
      await onCreateTag(name);
      setNewName("");
    } catch {
      // error is shown via props.error
    } finally {
      setCreating(false);
    }
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditValue(tag.name);
    onClearError();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function confirmEdit() {
    if (editingId == null) return;
    const name = editValue.trim();
    if (!name) return;
    setSaving(true);
    onClearError();
    try {
      await onUpdateTag(editingId, name);
      setEditingId(null);
      setEditValue("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tag: Tag) {
    if (!window.confirm(`Remover a tag "${tag.name}"?`)) return;
    setDeletingId(tag.id);
    onClearError();
    try {
      await onDeleteTag(tag.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section
      className="tags-manager"
      aria-labelledby="tags-manager-title"
    >
      <h2 id="tags-manager-title" className="tags-manager-title">
        Gerenciar tags
      </h2>

      {error && (
        <p id="tags-manager-error-msg" className="tags-manager-error" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleCreate} className="tags-manager-form">
        <label htmlFor="new-tag-name" className="visually-hidden">
          Nome da nova tag
        </label>
        <input
          id="new-tag-name"
          type="text"
          className="tags-manager-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova tag"
          disabled={creating}
          maxLength={50}
          aria-describedby={error ? "tags-manager-error-msg" : undefined}
        />
        <button
          type="submit"
          className="tags-manager-create-btn"
          disabled={creating || !newName.trim()}
          aria-label="Criar tag"
        >
          {creating ? "..." : "Criar"}
        </button>
      </form>

      <ul className="tags-manager-list" aria-label="Lista de tags">
        {tags.map((tag) => (
          <li key={tag.id} className="tags-manager-item">
            {editingId === tag.id ? (
              <>
                <input
                  type="text"
                  className="tags-manager-edit-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  disabled={saving}
                  maxLength={50}
                  aria-label={`Renomear tag ${tag.name}`}
                  autoFocus
                />
                <button
                  type="button"
                  className="tags-manager-save-btn"
                  onClick={() => confirmEdit()}
                  disabled={saving || !editValue.trim()}
                  aria-label="Salvar nome"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  className="tags-manager-cancel-btn"
                  onClick={cancelEdit}
                  disabled={saving}
                  aria-label="Cancelar"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span className="tags-manager-tag-name">{tag.name}</span>
                <button
                  type="button"
                  className="tags-manager-edit-btn"
                  onClick={() => startEdit(tag)}
                  aria-label={`Editar tag ${tag.name}`}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="tags-manager-delete-btn"
                  onClick={() => handleDelete(tag)}
                  disabled={deletingId === tag.id}
                  aria-label={`Remover tag ${tag.name}`}
                >
                  {deletingId === tag.id ? "..." : "Remover"}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {tags.length === 0 && (
        <p className="tags-manager-empty">Nenhuma tag cadastrada.</p>
      )}
    </section>
  );
}
