import { test, expect, type Page } from "@playwright/test";

const API_URL = "http://localhost:8080/api";

let userCounter = 0;

function uniqueEmail(): string {
  userCounter++;
  return `e2e-lists-${Date.now()}-${userCounter}@test.com`;
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

test.describe("Listas Temáticas E2E", () => {
  let token: string;

  test.beforeEach(async ({ request }) => {
    token = await registerViaAPI(request, uniqueEmail(), TEST_PASSWORD);
  });

  test("5.2 - criar lista com nome e cor pastel e ver na interface", async ({
    page,
  }) => {
    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();

    await expect(
      page.getByRole("heading", { name: /Gerenciar listas/i })
    ).toBeVisible();

    await page.getByLabel(/Nome da nova lista/i).fill("trabalho");
    // Selecionar cor Lavanda (#E1BEE7) - segundo botão do ColorPicker
    await page.getByRole("button", { name: /Cor Lavanda/i }).click();
    await page.getByRole("button", { name: /Criar lista/i }).click();

    await expect(
      page.locator("#lists-manager-section").getByText("trabalho")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Editar lista trabalho/i })
    ).toBeVisible();
  });

  test("5.3 - associar lista a uma tarefa e validar chip colorido", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Revisar relatório" },
    });

    const listResp = await request.post(`${API_URL}/lists`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "urgente", color: "#F8BBD9" },
    });
    expect(listResp.ok()).toBeTruthy();
    const list = (await listResp.json()) as { id: number };

    const todosResp = await request.get(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const todos = (await todosResp.json()) as { id: number }[];
    const todoId = todos[0].id;

    await request.post(`${API_URL}/todos/${todoId}/lists/${list.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await authenticateInBrowser(page, token);

    await expect(page.getByText("Revisar relatório")).toBeVisible();
    const todoRow = page
      .locator("li.todo-item")
      .filter({ hasText: "Revisar relatório" });
    await expect(todoRow.getByText("urgente")).toBeVisible();
  });

  test("5.4 - remover lista de uma tarefa e validar remoção", async ({
    page,
    request,
  }) => {
    const todoResp = await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa com lista" },
    });
    const todo = (await todoResp.json()) as { id: number };

    const listResp = await request.post(`${API_URL}/lists`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "remover-depois", color: "#BBDEFB" },
    });
    const list = (await listResp.json()) as { id: number };

    await request.post(`${API_URL}/todos/${todo.id}/lists/${list.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await authenticateInBrowser(page, token);

    const todoRow = page
      .locator("li.todo-item")
      .filter({ hasText: "Tarefa com lista" });
    await expect(todoRow.getByText("remover-depois")).toBeVisible();

    await todoRow
      .getByRole("button", { name: /Remover lista remover-depois/i })
      .click();

    await expect(todoRow.getByText("remover-depois")).not.toBeVisible();
  });

  test("5.5 - editar lista (nome e cor) e validar alterações", async ({
    page,
    request,
  }) => {
    const listResp = await request.post(`${API_URL}/lists`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "antiga", color: "#F8BBD9" },
    });
    expect(listResp.ok()).toBeTruthy();

    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();
    await expect(
      page.locator("#lists-manager-section").getByText("antiga")
    ).toBeVisible();

    await page.getByRole("button", { name: /Editar lista antiga/i }).click();
    await page
      .getByRole("textbox", { name: /Renomear lista antiga/i })
      .fill("renomeada");
    await page
      .getByRole("group", { name: /Cor da lista/i })
      .getByRole("button", { name: /Cor Lavanda/i })
      .click();
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(
      page.locator("#lists-manager-section").getByText("renomeada")
    ).toBeVisible();
    await expect(
      page.locator("#lists-manager-section").getByText("antiga")
    ).not.toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: /Remover lista renomeada/i })
      .click();

    await expect(
      page.locator("#lists-manager-section").getByText("renomeada")
    ).not.toBeVisible();
    await expect(page.getByText(/Nenhuma lista cadastrada/i)).toBeVisible();
  });

  test("5.6 - deletar lista e validar que tarefas são atualizadas", async ({
    page,
    request,
  }) => {
    const todoResp = await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa com lista para deletar" },
    });
    const todo = (await todoResp.json()) as { id: number };

    const listResp = await request.post(`${API_URL}/lists`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "lista-para-deletar", color: "#B2DFDB" },
    });
    const list = (await listResp.json()) as { id: number };

    await request.post(`${API_URL}/todos/${todo.id}/lists/${list.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await authenticateInBrowser(page, token);

    const todoRow = page
      .locator("li.todo-item")
      .filter({ hasText: "Tarefa com lista para deletar" });
    await expect(todoRow.getByText("lista-para-deletar")).toBeVisible();

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page
      .getByRole("list", { name: /Lista de listas temáticas/i })
      .getByRole("button", { name: /Remover lista lista-para-deletar/i })
      .click();

    await expect(page.locator("text=lista-para-deletar")).toHaveCount(0);
  });

  test("5.7 - tentar criar lista duplicada exibe feedback de erro", async ({
    page,
    request,
  }) => {
    await request.post(`${API_URL}/lists`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "duplicada", color: "#F8BBD9" },
    });

    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();

    await page.getByLabel(/Nome da nova lista/i).fill("duplicada");
    await page.getByRole("button", { name: /Criar lista/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByText(/list with this name already exists|já existe/i)
    ).toBeVisible();
  });

  test("6.11 - selecionar lista e ver apenas tarefas da lista", async ({
    page,
    request,
  }) => {
    const todoAResp = await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa na lista A" },
    });
    const todoA = (await todoAResp.json()) as { id: number };

    const todoBResp = await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa na lista B" },
    });
    const todoB = (await todoBResp.json()) as { id: number };

    const listAResp = await request.post(`${API_URL}/lists`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "Lista A", color: "#F8BBD9" },
    });
    const listA = (await listAResp.json()) as { id: number };

    const listBResp = await request.post(`${API_URL}/lists`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "Lista B", color: "#BBDEFB" },
    });
    const listB = (await listBResp.json()) as { id: number };

    await request.post(`${API_URL}/todos/${todoA.id}/lists/${listA.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await request.post(`${API_URL}/todos/${todoB.id}/lists/${listB.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const listATodosResp = await request.get(
      `${API_URL}/todos?list_id=${listA.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(listATodosResp.ok()).toBeTruthy();
    const listATodos = (await listATodosResp.json()) as {
      id: number;
      title: string;
    }[];
    expect(listATodos.some((t) => t.title === "Tarefa na lista A")).toBeTruthy();

    await authenticateInBrowser(page, token);

    await expect(page.getByText("Tarefa na lista A")).toBeVisible();
    await expect(page.getByText("Tarefa na lista B")).toBeVisible();

    const filterSelect = page.getByRole("combobox", {
      name: /Selecionar lista para filtrar tarefas/i,
    });
    const todosResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/todos") &&
        resp.url().includes("list_id=") &&
        resp.status() === 200
    );
    await filterSelect.selectOption({ value: String(listA.id) });
    await todosResponse;

    await expect(
      page.locator(".todo-list").getByText("Tarefa na lista A")
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Tarefa na lista B")).not.toBeVisible();

    await filterSelect.selectOption({ value: String(listB.id) });

    await expect(page.getByText("Tarefa na lista A")).not.toBeVisible();
    await expect(page.getByText("Tarefa na lista B")).toBeVisible({
      timeout: 10000,
    });

    await filterSelect.selectOption({ value: "all" });

    await expect(page.getByText("Tarefa na lista A")).toBeVisible();
    await expect(page.getByText("Tarefa na lista B")).toBeVisible();
  });

  test("6.11b - adicionar tarefa à lista e ver atualização ao filtrar", async ({
    page,
    request,
  }) => {
    const listResp = await request.post(`${API_URL}/lists`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { name: "Lista para adicionar", color: "#B2DFDB" },
    });
    const list = (await listResp.json()) as { id: number };

    await request.post(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Tarefa sem lista" },
    });

    await authenticateInBrowser(page, token);

    const filterSelect = page.getByRole("combobox", {
      name: /Selecionar lista para filtrar tarefas/i,
    });
    const emptyListResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/todos") &&
        resp.url().includes("list_id=") &&
        resp.status() === 200
    );
    await filterSelect.selectOption({ value: String(list.id) });
    await emptyListResponse;

    await expect(
      page.locator(".empty-message").getByText(/Nenhuma tarefa cadastrada/i)
    ).toBeVisible({ timeout: 15000 });

    await filterSelect.selectOption({ value: "all" });
    await expect(page.getByText("Tarefa sem lista")).toBeVisible();

    const todoRow = page
      .locator("li.todo-item")
      .filter({ hasText: "Tarefa sem lista" });
    await todoRow.getByRole("button", { name: /Adicionar lista/i }).click();
    await page
      .getByRole("listbox", { name: /Listas disponíveis/i })
      .getByRole("option", { name: /Lista para adicionar/i })
      .click();

    await filterSelect.selectOption({ value: String(list.id) });
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Tarefa sem lista")).toBeVisible();
  });

  test("5.8 - botão Criar desabilitado quando nome está vazio", async ({
    page,
  }) => {
    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();

    const createButton = page.getByRole("button", { name: /Criar lista/i });
    await expect(createButton).toBeDisabled();

    await page.getByLabel(/Nome da nova lista/i).fill("   ");
    await expect(createButton).toBeDisabled();

    await page.getByLabel(/Nome da nova lista/i).fill("valido");
    await expect(createButton).toBeEnabled();
  });
});
