import { useState } from "react";
import type { List } from "../types/list";
import { PASTEL_COLORS } from "../types/list";
import { ColorPicker } from "./ColorPicker";

interface ListsManagerProps {
  lists: List[];
  onCreateList: (name: string, color: string) => Promise<void>;
  onUpdateList: (id: number, name: string, color: string) => Promise<void>;
  onDeleteList: (id: number) => Promise<void>;
}

export function ListsManager({
  lists,
  onCreateList,
  onUpdateList,
  onDeleteList,
}: ListsManagerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PASTEL_COLORS[0].hex);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editColor, setEditColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await onCreateList(name, newColor);
      setNewName("");
      setNewColor(PASTEL_COLORS[0].hex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar lista");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(list: List) {
    setEditingId(list.id);
    setEditValue(list.name);
    setEditColor(list.color);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
    setEditColor("");
  }

  async function confirmEdit() {
    if (editingId == null) return;
    const name = editValue.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      await onUpdateList(editingId, name, editColor);
      setEditingId(null);
      setEditValue("");
      setEditColor("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao renomear lista");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(list: List) {
    if (!window.confirm(`Remover a lista "${list.name}"?`)) return;
    setDeletingId(list.id);
    setError(null);
    try {
      await onDeleteList(list.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover lista");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section
      className="lists-manager"
      aria-labelledby="lists-manager-title"
    >
      <h2 id="lists-manager-title" className="lists-manager-title">
        Gerenciar listas
      </h2>

      {error && (
        <p id="lists-manager-error-msg" className="lists-manager-error" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleCreate} className="lists-manager-form">
        <label htmlFor="new-list-name" className="visually-hidden">
          Nome da nova lista
        </label>
        <input
          id="new-list-name"
          type="text"
          className="lists-manager-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova lista"
          disabled={creating}
          maxLength={50}
          aria-describedby={error ? "lists-manager-error-msg" : undefined}
        />
        <div className="lists-manager-color-wrapper">
          <ColorPicker
            value={newColor}
            onChange={setNewColor}
            disabled={creating}
            aria-label="Cor da nova lista"
          />
        </div>
        <button
          type="submit"
          className="lists-manager-create-btn"
          disabled={creating || !newName.trim()}
          aria-label="Criar lista"
        >
          {creating ? "..." : "Criar"}
        </button>
      </form>

      <ul className="lists-manager-list" aria-label="Lista de listas temáticas">
        {lists.map((list) => (
          <li key={list.id} className="lists-manager-item">
            {editingId === list.id ? (
              <>
                <input
                  type="text"
                  className="lists-manager-edit-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  disabled={saving}
                  maxLength={50}
                  aria-label={`Renomear lista ${list.name}`}
                  autoFocus
                />
                <ColorPicker
                  value={editColor}
                  onChange={setEditColor}
                  disabled={saving}
                  aria-label="Cor da lista"
                />
                <button
                  type="button"
                  className="lists-manager-save-btn"
                  onClick={() => confirmEdit()}
                  disabled={saving || !editValue.trim()}
                  aria-label="Salvar nome"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  className="lists-manager-cancel-btn"
                  onClick={cancelEdit}
                  disabled={saving}
                  aria-label="Cancelar"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <span
                  className="lists-manager-list-name"
                  style={{ backgroundColor: list.color, padding: "2px 8px", borderRadius: "4px" }}
                >
                  {list.name}
                </span>
                <button
                  type="button"
                  className="lists-manager-edit-btn"
                  onClick={() => startEdit(list)}
                  aria-label={`Editar lista ${list.name}`}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="lists-manager-delete-btn"
                  onClick={() => handleDelete(list)}
                  disabled={deletingId === list.id}
                  aria-label={`Remover lista ${list.name}`}
                >
                  {deletingId === list.id ? "..." : "Remover"}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {lists.length === 0 && (
        <p className="lists-manager-empty">Nenhuma lista cadastrada.</p>
      )}
    </section>
  );
}
