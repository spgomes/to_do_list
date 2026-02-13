import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:8080/api/todos";

/**
 * Clean all todos via the API before each test to ensure a fresh state.
 */
async function deleteAllTodos(
  request: import("@playwright/test").APIRequestContext
) {
  const response = await request.get(API_URL);
  const todos = (await response.json()) as { id: number }[];
  for (const todo of todos) {
    await request.delete(`${API_URL}/${todo.id}`);
  }
}

test.beforeEach(async ({ request }) => {
  await deleteAllTodos(request);
});

// ─── 7.9 Empty state ──────────────────────────────────────────

test.describe("Empty state", () => {
  test("shows empty message when no todos exist", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Nenhuma tarefa cadastrada")).toBeVisible();
  });
});

// ─── 7.4 Add todo ─────────────────────────────────────────────

test.describe("Add todo", () => {
  test("adds a todo via button click and it appears in the list", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByPlaceholder("Nova tarefa...").fill("Comprar leite");
    await page.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByText("Comprar leite")).toBeVisible();
    await expect(
      page.getByText("Nenhuma tarefa cadastrada")
    ).not.toBeVisible();
  });

  test("adds a todo via Enter key", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("Nova tarefa...").fill("Estudar Go");
    await page.getByPlaceholder("Nova tarefa...").press("Enter");

    await expect(page.getByText("Estudar Go")).toBeVisible();
  });

  test("clears the input field after adding a todo", async ({ page }) => {
    await page.goto("/");

    const input = page.getByPlaceholder("Nova tarefa...");
    await input.fill("Tarefa temporária");
    await page.getByRole("button", { name: "Adicionar" }).click();

    await expect(input).toHaveValue("");
  });
});

// ─── 7.8 Empty field validation ───────────────────────────────

test.describe("Empty field validation", () => {
  test("shows error message when trying to add empty todo", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByText("O título não pode estar vazio")
    ).toBeVisible();
  });
});

// ─── 7.5 Mark as completed ───────────────────────────────────

test.describe("Mark as completed", () => {
  test("marks a todo as completed with visual differentiation", async ({
    page,
    request,
  }) => {
    // Create a todo via API
    await request.post(API_URL, {
      data: { title: "Tarefa para concluir" },
    });

    await page.goto("/");

    // Verify the todo is visible and pending
    await expect(page.getByText("Tarefa para concluir")).toBeVisible();

    // Click the checkbox to mark as completed (use click instead of check
    // because it's a controlled React component that updates asynchronously)
    const checkbox = page.getByRole("checkbox", {
      name: /Marcar como concluída: Tarefa para concluir/,
    });
    await checkbox.click();

    // Wait for the item to get the completed class
    const todoItem = page.locator("li.todo-item.completed");
    await expect(todoItem).toBeVisible();

    // Verify checkbox is now checked (aria-label changes after toggle)
    const checkedCheckbox = page.getByRole("checkbox", {
      name: /Marcar como pendente: Tarefa para concluir/,
    });
    await expect(checkedCheckbox).toBeChecked();
  });
});

// ─── 7.6 Revert to pending ───────────────────────────────────

test.describe("Revert to pending", () => {
  test("reverts a completed todo back to pending", async ({
    page,
    request,
  }) => {
    // Create a completed todo via API
    const createResp = await request.post(API_URL, {
      data: { title: "Tarefa concluída" },
    });
    const todo = (await createResp.json()) as { id: number };
    await request.patch(`${API_URL}/${todo.id}`, {
      data: { completed: true },
    });

    await page.goto("/");

    // Verify it's completed
    const todoItem = page.locator("li.todo-item.completed");
    await expect(todoItem).toBeVisible();

    // Click checkbox to revert to pending
    const checkbox = page.getByRole("checkbox", {
      name: /Marcar como pendente: Tarefa concluída/,
    });
    await checkbox.click();

    // Verify it's no longer completed
    await expect(page.locator("li.todo-item.completed")).not.toBeVisible();
    await expect(
      page.getByRole("checkbox", {
        name: /Marcar como concluída: Tarefa concluída/,
      })
    ).not.toBeChecked();
  });
});

// ─── 7.7 Remove todo ─────────────────────────────────────────

test.describe("Remove todo", () => {
  test("removes a todo after confirmation dialog", async ({
    page,
    request,
  }) => {
    // Create a todo via API
    await request.post(API_URL, {
      data: { title: "Tarefa para remover" },
    });

    await page.goto("/");
    await expect(page.getByText("Tarefa para remover")).toBeVisible();

    // Set up dialog handler to accept confirmation
    page.on("dialog", (dialog) => dialog.accept());

    // Click the remove button
    await page
      .getByRole("button", { name: /Remover tarefa: Tarefa para remover/ })
      .click();

    // Verify the todo is removed from the list
    await expect(page.getByText("Tarefa para remover")).not.toBeVisible();
    await expect(page.getByText("Nenhuma tarefa cadastrada")).toBeVisible();
  });

  test("does not remove a todo when dialog is dismissed", async ({
    page,
    request,
  }) => {
    // Create a todo via API
    await request.post(API_URL, {
      data: { title: "Tarefa que fica" },
    });

    await page.goto("/");

    // Set up dialog handler to dismiss confirmation
    page.on("dialog", (dialog) => dialog.dismiss());

    await page
      .getByRole("button", { name: /Remover tarefa: Tarefa que fica/ })
      .click();

    // Verify the todo still exists
    await expect(page.getByText("Tarefa que fica")).toBeVisible();
  });
});

// ─── Full CRUD flow ───────────────────────────────────────────

test.describe("Full CRUD flow", () => {
  test("adds 3 todos, completes 1, removes 1, verifies final state", async ({
    page,
  }) => {
    await page.goto("/");

    // Add 3 todos
    const input = page.getByPlaceholder("Nova tarefa...");
    const addButton = page.getByRole("button", { name: "Adicionar" });

    await input.fill("Tarefa A");
    await addButton.click();
    await expect(page.getByText("Tarefa A")).toBeVisible();

    await input.fill("Tarefa B");
    await addButton.click();
    await expect(page.getByText("Tarefa B")).toBeVisible();

    await input.fill("Tarefa C");
    await addButton.click();
    await expect(page.getByText("Tarefa C")).toBeVisible();

    // Mark "Tarefa B" as completed (use click for controlled React checkbox)
    await page
      .getByRole("checkbox", { name: /Marcar como concluída: Tarefa B/ })
      .click();

    // Verify Tarefa B is completed
    const completedItems = page.locator("li.todo-item.completed");
    await expect(completedItems).toHaveCount(1);

    // Remove "Tarefa C"
    page.on("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: /Remover tarefa: Tarefa C/ })
      .click();

    // Wait for Tarefa C to disappear
    await expect(page.getByText("Tarefa C")).not.toBeVisible();

    // Final state: 2 todos — "Tarefa A" (pending), "Tarefa B" (completed)
    const allItems = page.locator("li.todo-item");
    await expect(allItems).toHaveCount(2);
    await expect(page.getByText("Tarefa A")).toBeVisible();
    await expect(page.getByText("Tarefa B")).toBeVisible();
  });
});

// ─── Persistence ──────────────────────────────────────────────

test.describe("Persistence", () => {
  test("todo persists after page reload", async ({ page, request }) => {
    // Create a todo via API
    await request.post(API_URL, {
      data: { title: "Tarefa persistente" },
    });

    // Load the page
    await page.goto("/");
    await expect(page.getByText("Tarefa persistente")).toBeVisible();

    // Reload the page
    await page.reload();

    // Verify the todo is still there
    await expect(page.getByText("Tarefa persistente")).toBeVisible();
  });
});
