import { test, expect, type Page } from "@playwright/test";

const API_URL = "http://localhost:8080/api";

let userCounter = 0;

function uniqueEmail(): string {
  userCounter++;
  return `e2e-user-${Date.now()}-${userCounter}@test.com`;
}

const TEST_PASSWORD = "password123";

/**
 * Register a user via the API and return the token.
 */
async function registerViaAPI(
  request: import("@playwright/test").APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const resp = await request.post(`${API_URL}/auth/register`, {
    data: { email, password },
  });
  expect(resp.ok()).toBeTruthy();
  const body = (await resp.json()) as { token: string };
  return body.token;
}

/**
 * Login a user via the API and return the token.
 */
async function loginViaAPI(
  request: import("@playwright/test").APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const resp = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  expect(resp.ok()).toBeTruthy();
  const body = (await resp.json()) as { token: string };
  return body.token;
}

/**
 * Set the token in localStorage and navigate to the home page.
 */
async function authenticateInBrowser(page: Page, token: string) {
  await page.goto("/login");
  await page.evaluate((t) => localStorage.setItem("token", t), token);
  await page.goto("/");
}

/**
 * Delete all todos for a user via API.
 */
async function deleteAllTodos(
  request: import("@playwright/test").APIRequestContext,
  token: string
) {
  const response = await request.get(`${API_URL}/todos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) return;
  const todos = (await response.json()) as { id: number }[];
  for (const todo of todos) {
    await request.delete(`${API_URL}/todos/${todo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

// ─── Auth: Redirect without login ──────────────────────────────

test.describe("Auth: Unauthenticated redirect", () => {
  test("redirects to /login when accessing / without authentication", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Login" })
    ).toBeVisible();
  });
});

// ─── Auth: Register ────────────────────────────────────────────

test.describe("Auth: Register", () => {
  test("registers a new user and redirects to the todo list", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/register");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Confirm Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Register" }).click();

    // Should redirect to the home page with the todo list
    await expect(page).toHaveURL("/");
    await expect(page.getByText("To-Do List")).toBeVisible();
  });

  test("shows error when registering with duplicate email", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();
    // Register once via API
    await registerViaAPI(request, email, TEST_PASSWORD);

    // Try registering again via UI
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Confirm Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
  });
});

// ─── Auth: Login ───────────────────────────────────────────────

test.describe("Auth: Login", () => {
  test("logs in with valid credentials and shows todo list", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();
    await registerViaAPI(request, email, TEST_PASSWORD);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("To-Do List")).toBeVisible();
  });

  test("shows error with invalid credentials", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();
    await registerViaAPI(request, email, TEST_PASSWORD);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
  });
});

// ─── Auth: Logout ──────────────────────────────────────────────

test.describe("Auth: Logout", () => {
  test("logout redirects to /login and prevents access", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();
    const token = await registerViaAPI(request, email, TEST_PASSWORD);
    await authenticateInBrowser(page, token);

    // Verify we're on the home page
    await expect(page.getByText("To-Do List")).toBeVisible();

    // Click logout
    await page.getByText("Logout").click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Login" })
    ).toBeVisible();

    // Trying to navigate to / should redirect back to /login
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Auth: User isolation ──────────────────────────────────────

test.describe("Auth: User isolation", () => {
  test("two users do not see each other's todos", async ({
    page,
    request,
  }) => {
    // Create two users
    const emailA = uniqueEmail();
    const emailB = uniqueEmail();
    const tokenA = await registerViaAPI(request, emailA, TEST_PASSWORD);
    const tokenB = await registerViaAPI(request, emailB, TEST_PASSWORD);

    // Create a todo for user A via API
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: { title: "Tarefa do Usuário A" },
    });

    // Create a todo for user B via API
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: { title: "Tarefa do Usuário B" },
    });

    // Login as user A and verify they only see their own todo
    await authenticateInBrowser(page, tokenA);
    await expect(page.getByText("Tarefa do Usuário A")).toBeVisible();
    await expect(page.getByText("Tarefa do Usuário B")).not.toBeVisible();

    // Switch to user B
    await authenticateInBrowser(page, tokenB);
    await expect(page.getByText("Tarefa do Usuário B")).toBeVisible();
    await expect(page.getByText("Tarefa do Usuário A")).not.toBeVisible();
  });
});

// ─── Todo CRUD (authenticated) ─────────────────────────────────

test.describe("Todo CRUD (authenticated)", () => {
  let token: string;
  let email: string;

  test.beforeEach(async ({ request }) => {
    email = uniqueEmail();
    token = await registerViaAPI(request, email, TEST_PASSWORD);
  });

  test("shows empty message when no todos exist", async ({ page }) => {
    await authenticateInBrowser(page, token);

    await expect(page.getByText("Nenhuma tarefa cadastrada")).toBeVisible();
  });

  test("adds a todo via button click and it appears in the list", async ({
    page,
  }) => {
    await authenticateInBrowser(page, token);

    await page.getByPlaceholder("Nova tarefa...").fill("Comprar leite");
    await page.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByText("Comprar leite")).toBeVisible();
    await expect(
      page.getByText("Nenhuma tarefa cadastrada")
    ).not.toBeVisible();
  });

  test("adds a todo via Enter key", async ({ page }) => {
    await authenticateInBrowser(page, token);

    await page.getByPlaceholder("Nova tarefa...").fill("Estudar Go");
    await page.getByPlaceholder("Nova tarefa...").press("Enter");

    await expect(page.getByText("Estudar Go")).toBeVisible();
  });

  test("clears the input field after adding a todo", async ({ page }) => {
    await authenticateInBrowser(page, token);

    const input = page.getByPlaceholder("Nova tarefa...");
    await input.fill("Tarefa temporária");
    await page.getByRole("button", { name: "Adicionar" }).click();

    await expect(input).toHaveValue("");
  });

  test("shows error message when trying to add empty todo", async ({
    page,
  }) => {
    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByText("O título não pode estar vazio")
    ).toBeVisible();
  });

  test("marks a todo as completed with visual differentiation", async ({
    page,
    request,
  }) => {
    // Create a todo via API
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa para concluir" },
    });

    await authenticateInBrowser(page, token);

    await expect(page.getByText("Tarefa para concluir")).toBeVisible();

    const checkbox = page.getByRole("checkbox", {
      name: /Marcar como concluída: Tarefa para concluir/,
    });
    await checkbox.click();

    const todoItem = page.locator("li.todo-item.completed");
    await expect(todoItem).toBeVisible();

    const checkedCheckbox = page.getByRole("checkbox", {
      name: /Marcar como pendente: Tarefa para concluir/,
    });
    await expect(checkedCheckbox).toBeChecked();
  });

  test("reverts a completed todo back to pending", async ({
    page,
    request,
  }) => {
    // Create a completed todo via API
    const createResp = await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa concluída" },
    });
    const todo = (await createResp.json()) as { id: number };
    await request.patch(`${API_URL}/todos/${todo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { completed: true },
    });

    await authenticateInBrowser(page, token);

    const todoItem = page.locator("li.todo-item.completed");
    await expect(todoItem).toBeVisible();

    const checkbox = page.getByRole("checkbox", {
      name: /Marcar como pendente: Tarefa concluída/,
    });
    await checkbox.click();

    await expect(page.locator("li.todo-item.completed")).not.toBeVisible();
    await expect(
      page.getByRole("checkbox", {
        name: /Marcar como concluída: Tarefa concluída/,
      })
    ).not.toBeChecked();
  });

  test("removes a todo after confirmation dialog", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa para remover" },
    });

    await authenticateInBrowser(page, token);
    await expect(page.getByText("Tarefa para remover")).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: /Remover tarefa: Tarefa para remover/ })
      .click();

    await expect(page.getByText("Tarefa para remover")).not.toBeVisible();
    await expect(page.getByText("Nenhuma tarefa cadastrada")).toBeVisible();
  });

  test("does not remove a todo when dialog is dismissed", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa que fica" },
    });

    await authenticateInBrowser(page, token);

    page.on("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("button", { name: /Remover tarefa: Tarefa que fica/ })
      .click();

    await expect(page.getByText("Tarefa que fica")).toBeVisible();
  });

  test("creates a todo after login and verifies it appears", async ({
    page,
  }) => {
    // Login via UI instead of direct token injection
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("To-Do List")).toBeVisible();

    // Create a todo
    await page.getByPlaceholder("Nova tarefa...").fill("Tarefa após login");
    await page.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByText("Tarefa após login")).toBeVisible();
  });

  test("todo persists after page reload", async ({ page, request }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa persistente" },
    });

    await authenticateInBrowser(page, token);
    await expect(page.getByText("Tarefa persistente")).toBeVisible();

    await page.reload();

    await expect(page.getByText("Tarefa persistente")).toBeVisible();
  });
});

// ─── Full CRUD flow (authenticated) ─────────────────────────────

test.describe("Full CRUD flow (authenticated)", () => {
  test("adds 3 todos, completes 1, removes 1, verifies final state", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();
    const token = await registerViaAPI(request, email, TEST_PASSWORD);
    await authenticateInBrowser(page, token);

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

    // Mark "Tarefa B" as completed
    await page
      .getByRole("checkbox", { name: /Marcar como concluída: Tarefa B/ })
      .click();

    const completedItems = page.locator("li.todo-item.completed");
    await expect(completedItems).toHaveCount(1);

    // Remove "Tarefa C"
    page.on("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: /Remover tarefa: Tarefa C/ })
      .click();

    await expect(page.getByText("Tarefa C")).not.toBeVisible();

    // Final state: 2 todos
    const allItems = page.locator("li.todo-item");
    await expect(allItems).toHaveCount(2);
    await expect(page.getByText("Tarefa A")).toBeVisible();
    await expect(page.getByText("Tarefa B")).toBeVisible();
  });
});

// ─── Soft Delete ───────────────────────────────────────────────

test.describe("Soft Delete", () => {
  let token: string;

  test.beforeEach(async ({ request }) => {
    token = await registerViaAPI(request, uniqueEmail(), TEST_PASSWORD);
  });

  test("tarefa removida some da lista imediatamente", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa para remover" },
    });

    await authenticateInBrowser(page, token);
    await expect(page.getByText("Tarefa para remover")).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: /Remover tarefa: Tarefa para remover/ })
      .click();

    await expect(page.getByText("Tarefa para remover")).not.toBeVisible();
  });

  test("tarefa removida não reaparece após reload da página", async ({
    page,
    request,
  }) => {
    const createResp = await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa deletada via API" },
    });
    const todo = (await createResp.json()) as { id: number };

    await request.delete(`${API_URL}/todos/${todo.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await authenticateInBrowser(page, token);
    await expect(
      page.getByText("Tarefa deletada via API")
    ).not.toBeVisible();

    await page.reload();
    await expect(
      page.getByText("Tarefa deletada via API")
    ).not.toBeVisible();
  });

  test("outras tarefas não são afetadas ao remover uma", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Primeira tarefa" },
    });
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Segunda tarefa" },
    });

    await authenticateInBrowser(page, token);
    await expect(page.getByText("Primeira tarefa")).toBeVisible();
    await expect(page.getByText("Segunda tarefa")).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: /Remover tarefa: Primeira tarefa/ })
      .click();

    await expect(page.getByText("Primeira tarefa")).not.toBeVisible();
    await expect(page.getByText("Segunda tarefa")).toBeVisible();
  });
});

// ─── Edição de Título ──────────────────────────────────────────

test.describe("Edição de Título", () => {
  let token: string;

  test.beforeEach(async ({ request }) => {
    token = await registerViaAPI(request, uniqueEmail(), TEST_PASSWORD);
  });

  test("editar título via Enter salva e exibe o novo texto", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Título original" },
    });

    await authenticateInBrowser(page, token);
    await expect(page.getByText("Título original")).toBeVisible();

    await page
      .getByRole("button", { name: /Editar tarefa: Título original/ })
      .click();

    const editInput = page.getByLabel("Editar título da tarefa");
    await editInput.clear();
    await editInput.fill("Título editado");
    await editInput.press("Enter");

    await expect(page.getByText("Título editado")).toBeVisible();
    await expect(page.getByText("Título original")).not.toBeVisible();
  });

  test("novo título persiste após reload da página", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Título antes do reload" },
    });

    await authenticateInBrowser(page, token);

    await page
      .getByRole("button", {
        name: /Editar tarefa: Título antes do reload/,
      })
      .click();

    const editInput = page.getByLabel("Editar título da tarefa");
    await editInput.clear();
    await editInput.fill("Título após reload");
    await editInput.press("Enter");

    await expect(page.getByText("Título após reload")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Título após reload")).toBeVisible();
  });

  test("Escape cancela a edição e restaura o título original", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Título original" },
    });

    await authenticateInBrowser(page, token);

    await page
      .getByRole("button", { name: /Editar tarefa: Título original/ })
      .click();

    const editInput = page.getByLabel("Editar título da tarefa");
    await editInput.fill("Texto descartado");
    await editInput.press("Escape");

    await expect(page.getByText("Título original")).toBeVisible();
    await expect(page.getByText("Texto descartado")).not.toBeVisible();
  });

  test("não é possível salvar título vazio", async ({ page, request }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Título que permanece" },
    });

    await authenticateInBrowser(page, token);

    await page
      .getByRole("button", {
        name: /Editar tarefa: Título que permanece/,
      })
      .click();

    const editInput = page.getByLabel("Editar título da tarefa");
    await editInput.clear();
    await editInput.press("Enter");

    await expect(page.getByText("Título que permanece")).toBeVisible();
  });
});
