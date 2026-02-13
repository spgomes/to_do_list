// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../../App.tsx";

const mockTodos = [
  { id: 1, title: "Test task", completed: false, created_at: "2025-01-01" },
  { id: 2, title: "Done task", completed: true, created_at: "2025-01-02" },
];

vi.mock("../../services/api.ts", () => ({
  fetchTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

import { fetchTodos } from "../../services/api.ts";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("App", () => {
  it("loads and displays todos from the API", async () => {
    vi.mocked(fetchTodos).mockResolvedValue(mockTodos);

    render(<App />);

    expect(screen.getByText("Carregando tarefas...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Test task")).toBeDefined();
      expect(screen.getByText("Done task")).toBeDefined();
    });
  });

  it("shows loading spinner with role status during load", () => {
    vi.mocked(fetchTodos).mockReturnValue(new Promise(() => {}));

    render(<App />);

    const loadingContainer = screen.getByRole("status");
    expect(loadingContainer).toBeDefined();
    expect(loadingContainer.getAttribute("aria-label")).toBe("Carregando tarefas");
  });

  it("shows error banner with role alert on API error", async () => {
    vi.mocked(fetchTodos).mockRejectedValue(new Error("Network error"));

    render(<App />);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain("Network error");
    });
  });

  it("renders header and main sections after loading", async () => {
    vi.mocked(fetchTodos).mockResolvedValue(mockTodos);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("To-Do List")).toBeDefined();
      expect(screen.getByRole("main")).toBeDefined();
    });
  });
});
