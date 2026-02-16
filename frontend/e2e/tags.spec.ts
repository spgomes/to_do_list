import { test, expect, type Page } from "@playwright/test";

const API_URL = "http://localhost:8080/api";

let userCounter = 0;

function uniqueEmail(): string {
  userCounter++;
  return `e2e-tags-${Date.now()}-${userCounter}@test.com`;
}

const TEST_PASSWORD = "password123";

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

async function authenticateInBrowser(page: Page, token: string) {
  await page.goto("/login");
  await page.evaluate((t) => localStorage.setItem("token", t), token);
  await page.goto("/");
}

test.describe("Tags E2E", () => {
  let token: string;

  test.beforeEach(async ({ request }) => {
    token = await registerViaAPI(request, uniqueEmail(), TEST_PASSWORD);
  });

  test("5.2 - criar tag e validar que aparece na UI", async ({
    page,
    request,
  }) => {
    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar tags/i }).click();

    await expect(
      page.getByRole("heading", { name: /Gerenciar tags/i })
    ).toBeVisible();

    await page
      .getByRole("textbox", { name: /Nome da nova tag/i })
      .fill("trabalho");
    await page.getByRole("button", { name: "Criar" }).click();

    await expect(page.getByText("trabalho").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Editar tag trabalho/i })
    ).toBeVisible();
  });

  test("5.3 - associar tag a uma tarefa e validar chip na lista", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Revisar relatório" },
    });

    const tagResp = await request.post(`${API_URL}/tags`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "urgente" },
    });
    expect(tagResp.ok()).toBeTruthy();
    const tag = (await tagResp.json()) as { id: number };

    const todosResp = await request.get(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const todos = (await todosResp.json()) as { id: number }[];
    const todoId = todos[0].id;

    await request.post(`${API_URL}/todos/${todoId}/tags/${tag.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await authenticateInBrowser(page, token);

    await expect(page.getByText("Revisar relatório")).toBeVisible();
    const todoRow = page.locator("li.todo-item").filter({ hasText: "Revisar relatório" });
    await expect(todoRow.getByText("urgente")).toBeVisible();
  });

  test("5.4 - remover tag de uma tarefa e validar remoção", async ({
    page,
    request,
  }) => {
    const todoResp = await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa com tag" },
    });
    const todo = (await todoResp.json()) as { id: number };

    const tagResp = await request.post(`${API_URL}/tags`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "remover-depois" },
    });
    const tag = (await tagResp.json()) as { id: number };

    await request.post(`${API_URL}/todos/${todo.id}/tags/${tag.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await authenticateInBrowser(page, token);

    const todoRow = page.locator("li.todo-item").filter({ hasText: "Tarefa com tag" });
    await expect(todoRow.getByText("remover-depois")).toBeVisible();

    await todoRow
      .getByRole("button", { name: /Remover tag remover-depois/i })
      .click();

    await expect(todoRow.getByText("remover-depois")).not.toBeVisible();
  });

  test("5.5 - renomear e deletar tag e validar comportamento", async ({
    page,
    request,
  }) => {
    const tagResp = await request.post(`${API_URL}/tags`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "antiga" },
    });
    expect(tagResp.ok()).toBeTruthy();

    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar tags/i }).click();
    await expect(page.getByText("antiga")).toBeVisible();

    await page.getByRole("button", { name: /Editar tag antiga/i }).click();
    await page.getByRole("textbox", { name: /Renomear tag antiga/i }).fill("renomeada");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByText("renomeada")).toBeVisible();
    await expect(page.getByText("antiga")).not.toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /Remover tag renomeada/i }).click();

    await expect(page.getByText("renomeada")).not.toBeVisible();
    await expect(page.getByText(/Nenhuma tag cadastrada/i)).toBeVisible();
  });

  test("5.6 - tentativa de criar tag duplicada exibe feedback de erro", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/tags`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "duplicada" },
    });

    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar tags/i }).click();

    await page
      .getByRole("textbox", { name: /Nome da nova tag/i })
      .fill("duplicada");
    await page.getByRole("button", { name: "Criar" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByText(/tag with this name already exists|já existe/i)
    ).toBeVisible();
  });
});
