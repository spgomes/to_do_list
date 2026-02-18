// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  createTodoInList: vi.fn(),
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

import {
  fetchTodos,
  fetchLists,
  createTodo,
  createTodoInList,
  addListToTodo,
  removeListFromTodo,
} from "../../services/api.ts";

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

  it("inline form in Sem lista card calls createTodo and not createTodoInList", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "fake-token");
    vi.mocked(fetchTodos).mockResolvedValue([]);
    vi.mocked(createTodo).mockResolvedValue({
      id: 10,
      title: "New in unlisted",
      completed: false,
      created_at: "2025-01-10",
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByLabelText("Adicionar tarefa em Sem lista")).toBeDefined();
    });

    const semListaCard = screen.getByRole("article", { name: "Lista: Sem lista" });
    const input = screen.getByLabelText("Adicionar tarefa em Sem lista");
    await user.type(input, "New in unlisted");
    const addButton = semListaCard.querySelector('button[type="submit"]');
    await user.click(addButton!);

    await waitFor(() => {
      expect(createTodo).toHaveBeenCalledWith("New in unlisted");
      expect(createTodoInList).not.toHaveBeenCalled();
    });
  });

  it("inline form in named list card calls createTodoInList with list id", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "fake-token");
    const mockLists = [
      { id: 1, name: "Trabalho", color: "#BBDEFB", created_at: "2025-01-01" },
    ];
    vi.mocked(fetchTodos).mockResolvedValue([]);
    vi.mocked(fetchLists).mockResolvedValue(mockLists);
    vi.mocked(createTodoInList).mockResolvedValue({
      id: 20,
      title: "Task in list",
      completed: false,
      created_at: "2025-01-20",
      lists: [{ id: 1, name: "Trabalho", color: "#BBDEFB", created_at: "2025-01-01" }],
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByLabelText("Adicionar tarefa em Trabalho")).toBeDefined();
    });

    const input = screen.getByLabelText("Adicionar tarefa em Trabalho");
    await user.type(input, "Task in list");
    const addButtons = screen.getAllByRole("button", { name: "Adicionar" });
    const listCardAddButton = addButtons.find(
      (btn) => btn.closest("article")?.getAttribute("aria-label") === "Lista: Trabalho"
    );
    await user.click(listCardAddButton!);

    await waitFor(() => {
      expect(createTodoInList).toHaveBeenCalledWith(1, "Task in list");
    });
  });

  it("handleDropTodo does not call API when dropping on same list", async () => {
    localStorage.setItem("token", "fake-token");
    const mockLists = [
      { id: 1, name: "Trabalho", color: "#BBDEFB", created_at: "2025-01-01" },
    ];
    const todosInList = [
      {
        id: 5,
        title: "Task in Trabalho",
        completed: false,
        created_at: "2025-01-05",
        lists: [{ id: 1, name: "Trabalho", color: "#BBDEFB", created_at: "2025-01-01" }],
      },
    ];
    vi.mocked(fetchTodos).mockResolvedValue(todosInList);
    vi.mocked(fetchLists).mockResolvedValue(mockLists);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Task in Trabalho")).toBeDefined();
    });

    const trabalhoCard = screen.getByRole("article", { name: "Lista: Trabalho" });
    fireEvent.drop(trabalhoCard, {
      dataTransfer: { getData: (key: string) => (key === "todoId" ? "5" : "") },
    });

    await waitFor(() => {
      expect(removeListFromTodo).not.toHaveBeenCalled();
      expect(addListToTodo).not.toHaveBeenCalled();
    });
  });

  it("handleDropTodo calls removeListFromTodo then addListToTodo when moving between lists", async () => {
    localStorage.setItem("token", "fake-token");
    const mockLists = [
      { id: 1, name: "Pessoal", color: "#F8BBD9", created_at: "2025-01-01" },
      { id: 2, name: "Trabalho", color: "#BBDEFB", created_at: "2025-01-02" },
    ];
    const todosWithList = [
      {
        id: 5,
        title: "Task in Pessoal",
        completed: false,
        created_at: "2025-01-05",
        lists: [{ id: 1, name: "Pessoal", color: "#F8BBD9", created_at: "2025-01-01" }],
      },
    ];
    vi.mocked(fetchTodos).mockResolvedValue(todosWithList);
    vi.mocked(fetchLists).mockResolvedValue(mockLists);
    vi.mocked(removeListFromTodo).mockResolvedValue(undefined);
    vi.mocked(addListToTodo).mockResolvedValue(undefined);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Task in Pessoal")).toBeDefined();
    });

    const trabalhoCard = screen.getByRole("article", { name: "Lista: Trabalho" });
    fireEvent.drop(trabalhoCard, {
      dataTransfer: { getData: (key: string) => (key === "todoId" ? "5" : "") },
    });

    await waitFor(() => {
      expect(removeListFromTodo).toHaveBeenCalledWith(5, 1);
      expect(addListToTodo).toHaveBeenCalledWith(5, 2);
      const removeOrder = vi.mocked(removeListFromTodo).mock.invocationCallOrder[0];
      const addOrder = vi.mocked(addListToTodo).mock.invocationCallOrder[0];
      expect(removeOrder).toBeLessThan(addOrder);
    });
  });

  it("handleDropTodo updates state optimistically when moving todo", async () => {
    localStorage.setItem("token", "fake-token");
    const mockLists = [
      { id: 1, name: "Pessoal", color: "#F8BBD9", created_at: "2025-01-01" },
      { id: 2, name: "Trabalho", color: "#BBDEFB", created_at: "2025-01-02" },
    ];
    const todosWithList = [
      {
        id: 5,
        title: "Task in Pessoal",
        completed: false,
        created_at: "2025-01-05",
        lists: [{ id: 1, name: "Pessoal", color: "#F8BBD9", created_at: "2025-01-01" }],
      },
    ];
    vi.mocked(fetchTodos).mockResolvedValue(todosWithList);
    vi.mocked(fetchLists).mockResolvedValue(mockLists);
    let resolveRemove: () => void;
    vi.mocked(removeListFromTodo).mockImplementation(
      () => new Promise((r) => { resolveRemove = r; })
    );
    vi.mocked(addListToTodo).mockResolvedValue(undefined);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Task in Pessoal")).toBeDefined();
    });

    const trabalhoCard = screen.getByRole("article", { name: "Lista: Trabalho" });
    fireEvent.drop(trabalhoCard, {
      dataTransfer: { getData: (key: string) => (key === "todoId" ? "5" : "") },
    });

    await waitFor(() => {
      expect(screen.getByRole("article", { name: "Lista: Trabalho" }).textContent).toContain(
        "Task in Pessoal"
      );
    });

    (resolveRemove! as () => void)();
  });

  it("handleDropTodo reverts state and shows error when API fails", async () => {
    localStorage.setItem("token", "fake-token");
    const mockLists = [
      { id: 1, name: "Pessoal", color: "#F8BBD9", created_at: "2025-01-01" },
      { id: 2, name: "Trabalho", color: "#BBDEFB", created_at: "2025-01-02" },
    ];
    const todosWithList = [
      {
        id: 5,
        title: "Task in Pessoal",
        completed: false,
        created_at: "2025-01-05",
        lists: [{ id: 1, name: "Pessoal", color: "#F8BBD9", created_at: "2025-01-01" }],
      },
    ];
    vi.mocked(fetchTodos).mockResolvedValue(todosWithList);
    vi.mocked(fetchLists).mockResolvedValue(mockLists);
    vi.mocked(removeListFromTodo).mockRejectedValue(new Error("Network error"));
    vi.mocked(addListToTodo).mockResolvedValue(undefined);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Task in Pessoal")).toBeDefined();
    });

    const trabalhoCard = screen.getByRole("article", { name: "Lista: Trabalho" });
    fireEvent.drop(trabalhoCard, {
      dataTransfer: { getData: (key: string) => (key === "todoId" ? "5" : "") },
    });

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("Network error");
    });

    expect(removeListFromTodo).toHaveBeenCalledWith(5, 1);
  });
});
