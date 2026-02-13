import { useState } from "react";

interface TodoFormProps {
  onAdd: (title: string) => Promise<void>;
}

export function TodoForm({ onAdd }: TodoFormProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("O título não pode estar vazio");
      return;
    }
    setError("");
    await onAdd(trimmed);
    setTitle("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setTitle("");
      setError("");
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Adicionar nova tarefa">
      <div className="todo-form">
        <input
          type="text"
          className="todo-form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nova tarefa..."
          aria-label="Título da tarefa"
          maxLength={255}
        />
        <button type="submit" className="todo-form-button">
          Adicionar
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
