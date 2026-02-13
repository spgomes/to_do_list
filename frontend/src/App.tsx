import { useEffect, useState } from "react";
import type { Todo } from "./types/todo.ts";
import { fetchTodos, createTodo, updateTodo, deleteTodo } from "./services/api.ts";
import { TodoForm } from "./components/TodoForm.tsx";
import { TodoList } from "./components/TodoList.tsx";
import "./App.css";

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodos()
      .then(setTodos)
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

  async function handleDelete(id: number) {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover tarefa");
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
          <h1 className="app-title">To-Do List</h1>
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
        <h1 className="app-title">To-Do List</h1>
      </header>
      <main>
        <TodoForm onAdd={handleAdd} />
        <TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
      </main>
    </div>
  );
}

export default App;
