import { useEffect, useState, useMemo } from "react";
import type { Todo } from "../types/todo";
import type { List } from "../types/list";
import {
  fetchTodos,
  createTodo,
  updateTodo,
  updateTodoTitle,
  deleteTodo,
  fetchLists,
  createList,
  updateList,
  deleteList,
  addListToTodo,
  removeListFromTodo,
} from "../services/api";
import { TodoForm } from "./TodoForm";
import { ListCard } from "./ListCard";
import { ListsManager } from "./ListsManager";
import { useAuth } from "../contexts/AuthContext";

export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listErrorTodoId, setListErrorTodoId] = useState<number | null>(null);
  const [showListsManager, setShowListsManager] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchTodos(), fetchLists()])
      .then(([todosData, listsData]) => {
        if (!cancelled) {
          setTodos(todosData);
          setLists(listsData);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const listCardsData = useMemo(() => {
    if (lists.length === 0) {
      return [{ list: null as List | null, todos }];
    }
    const result: { list: List | null; todos: Todo[] }[] = lists.map((list) => ({
      list,
      todos: todos.filter((t) => t.lists?.some((l) => l.id === list.id)),
    }));
    const unlisted = todos.filter((t) => !t.lists?.length);
    if (unlisted.length > 0) {
      result.push({ list: null, todos: unlisted });
    }
    return result;
  }, [lists, todos]);

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

  async function handleAddList(todoId: number, listId: number) {
    setListErrorTodoId(todoId);
    setListError(null);
    try {
      await addListToTodo(todoId, listId);
      const updated = await fetchTodos();
      setTodos(updated);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erro ao adicionar lista");
    }
  }

  async function handleRemoveList(todoId: number, listId: number) {
    setListError(null);
    try {
      await removeListFromTodo(todoId, listId);
      const updated = await fetchTodos();
      setTodos(updated);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erro ao remover lista");
      setListErrorTodoId(todoId);
    }
  }

  async function handleCreateList(name: string, color: string) {
    setListError(null);
    try {
      const created = await createList(name, color);
      setLists((prev) => [created, ...prev]);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erro ao criar lista");
      throw err;
    }
  }

  async function handleUpdateList(id: number, name: string, color: string) {
    setListError(null);
    try {
      await updateList(id, name, color);
      setLists((prev) =>
        prev.map((l) => (l.id === id ? { ...l, name, color } : l))
      );
      setTodos((prev) =>
        prev.map((t) => ({
          ...t,
          lists: (t.lists ?? []).map((list) =>
            list.id === id ? { ...list, name, color } : list
          ),
        }))
      );
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erro ao renomear lista");
      throw err;
    }
  }

  async function handleDeleteList(id: number) {
    setListError(null);
    try {
      await deleteList(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
      setTodos((prev) =>
        prev.map((t) => ({
          ...t,
          lists: (t.lists ?? []).filter((list) => list.id !== id),
        }))
      );
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erro ao remover lista");
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
          className="lists-manager-toggle"
          onClick={() => setShowListsManager((v) => !v)}
          aria-expanded={showListsManager}
          aria-controls="lists-manager-section"
        >
          {showListsManager ? "Ocultar gerenciamento de listas" : "Gerenciar listas"}
        </button>
        {showListsManager && (
          <div id="lists-manager-section">
            <ListsManager
              lists={lists}
              onCreateList={handleCreateList}
              onUpdateList={handleUpdateList}
              onDeleteList={handleDeleteList}
              error={listError}
              onClearError={() => setListError(null)}
            />
          </div>
        )}
        <div className="list-cards-grid" role="region" aria-label="Listas temáticas com tarefas">
          {listCardsData.map(({ list, todos: listTodos }) => (
            <ListCard
              key={list?.id ?? "unlisted"}
              list={list}
              todos={listTodos}
              allLists={lists}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEditTodo}
              onAddList={handleAddList}
              onRemoveList={handleRemoveList}
              listError={listError ?? undefined}
              listErrorTodoId={listErrorTodoId}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
