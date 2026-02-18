// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../../contexts/AuthContext.tsx";
import { ProtectedRoute } from "../ProtectedRoute.tsx";
import { TodoApp } from "../TodoApp.tsx";
import { LoginPage } from "../../pages/LoginPage.tsx";
import { RegisterPage } from "../../pages/RegisterPage.tsx";

const mockTodos = [
  { id: 1, title: "Test task", completed: false, created_at: "2025-01-01" },
  { id: 2, title: "Done task", completed: true, created_at: "2025-01-02" },
];

vi.mock("../../services/api.ts", () => ({
  fetchTodos: vi.fn(),
  fetchTodosByList: vi.fn(),
  fetchLists: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  updateTodoTitle: vi.fn(),
  deleteTodo: vi.fn(),
  createList: vi.fn(),
  updateList: vi.fn(),
  deleteList: vi.fn(),
  addListToTodo: vi.fn(),
  removeListFromTodo: vi.fn(),
}));

vi.mock("../../services/auth.ts", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
}));

import { fetchTodos, fetchLists } from "../../services/api.ts";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(fetchLists).mockResolvedValue([]);
});

function renderApp(initialEntries = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TodoApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("App", () => {
  it("redirects to login when not authenticated", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Login" })).toBeDefined();
    });
  });

  it("shows todo app when authenticated", async () => {
    localStorage.setItem("token", "fake-token");
    vi.mocked(fetchTodos).mockResolvedValue(mockTodos);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Test task")).toBeDefined();
      expect(screen.getByText("Done task")).toBeDefined();
    });
  });

  it("shows loading spinner with role status during load when authenticated", () => {
    localStorage.setItem("token", "fake-token");
    vi.mocked(fetchTodos).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchLists).mockReturnValue(new Promise(() => {}));

    renderApp();

    const loadingContainer = screen.getByRole("status");
    expect(loadingContainer).toBeDefined();
    expect(loadingContainer.getAttribute("aria-label")).toBe("Carregando tarefas");
  });

  it("shows error banner with role alert on API error when authenticated", async () => {
    localStorage.setItem("token", "fake-token");
    vi.mocked(fetchTodos).mockRejectedValue(new Error("Network error"));

    renderApp();

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain("Network error");
    });
  });

  it("renders header and main sections after loading when authenticated", async () => {
    localStorage.setItem("token", "fake-token");
    vi.mocked(fetchTodos).mockResolvedValue(mockTodos);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("To-Do List")).toBeDefined();
      expect(screen.getByRole("main")).toBeDefined();
    });
  });

  it("shows logout button when authenticated", async () => {
    localStorage.setItem("token", "fake-token");
    vi.mocked(fetchTodos).mockResolvedValue(mockTodos);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Logout")).toBeDefined();
    });
  });
});
