import { useEffect, useState } from "react";
import type { Todo } from "../types/todo";
import type { Tag } from "../types/tag";
import {
  fetchTodos,
  createTodo,
  updateTodo,
  updateTodoTitle,
  deleteTodo,
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
  addTagToTodo,
  removeTagFromTodo,
} from "../services/api";
import { TodoForm } from "./TodoForm";
import { TodoList } from "./TodoList";
import { TagsManager } from "./TagsManager";
import { useAuth } from "../contexts/AuthContext";

export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagErrorTodoId, setTagErrorTodoId] = useState<number | null>(null);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    Promise.all([fetchTodos(), fetchTags()])
      .then(([todosData, tagsData]) => {
        setTodos(todosData);
        setTags(tagsData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(title: string) {
    try {
      const newTodo = await createTodo(title);
      setTodos((prev) => [newTodo, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar tarefa");
    }
  }

  async function handleToggle(id: number, completed: boolean) {
    try {
      await updateTodo(id, completed);
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed } : t))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar tarefa");
    }
  }

  async function handleEditTodo(id: number, title: string) {
    await updateTodoTitle(id, title);
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title } : t))
    );
  }

  async function handleDelete(id: number) {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover tarefa");
    }
  }

  async function handleAddTag(todoId: number, tagId: number) {
    setTagErrorTodoId(todoId);
    setTagError(null);
    try {
      await addTagToTodo(todoId, tagId);
      const updated = await fetchTodos();
      setTodos(updated);
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Erro ao adicionar tag");
    }
  }

  async function handleRemoveTag(todoId: number, tagId: number) {
    setTagError(null);
    try {
      await removeTagFromTodo(todoId, tagId);
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todoId
            ? {
                ...t,
                tags: (t.tags ?? []).filter((tag) => tag.id !== tagId),
              }
            : t
        )
      );
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Erro ao remover tag");
      setTagErrorTodoId(todoId);
    }
  }

  async function handleCreateTag(name: string) {
    setTagError(null);
    try {
      const created = await createTag(name);
      setTags((prev) => [created, ...prev]);
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Erro ao criar tag");
      throw err;
    }
  }

  async function handleUpdateTag(id: number, name: string) {
    setTagError(null);
    try {
      await updateTag(id, name);
      setTags((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name } : t))
      );
      setTodos((prev) =>
        prev.map((t) => ({
          ...t,
          tags: (t.tags ?? []).map((tag) =>
            tag.id === id ? { ...tag, name } : tag
          ),
        }))
      );
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Erro ao renomear tag");
      throw err;
    }
  }

  async function handleDeleteTag(id: number) {
    setTagError(null);
    try {
      await deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      setTodos((prev) =>
        prev.map((t) => ({
          ...t,
          tags: (t.tags ?? []).filter((tag) => tag.id !== id),
        }))
      );
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Erro ao remover tag");
      throw err;
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container" role="status" aria-label="Carregando tarefas">
          <div className="loading-spinner" aria-hidden="true"></div>
          <p className="loading-text">Carregando tarefas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-row">
            <h1 className="app-title">To-Do List</h1>
            <button className="logout-button" onClick={logout}>
              Logout
            </button>
          </div>
        </header>
        <main>
          <p className="error-banner" role="alert">Erro: {error}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <h1 className="app-title">To-Do List</h1>
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main>
        <TodoForm onAdd={handleAdd} />
        <button
          type="button"
          className="tags-manager-toggle"
          onClick={() => setShowTagsManager((v) => !v)}
          aria-expanded={showTagsManager}
          aria-controls="tags-manager-section"
        >
          {showTagsManager ? "Ocultar gerenciamento de tags" : "Gerenciar tags"}
        </button>
        {showTagsManager && (
          <div id="tags-manager-section">
            <TagsManager
              tags={tags}
              onCreateTag={handleCreateTag}
              onUpdateTag={handleUpdateTag}
              onDeleteTag={handleDeleteTag}
              error={tagError}
              onClearError={() => setTagError(null)}
            />
          </div>
        )}
        <TodoList
          todos={todos}
          tags={tags}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEdit={handleEditTodo}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          tagError={tagError}
          tagErrorTodoId={tagErrorTodoId}
        />
      </main>
    </div>
  );
}
