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

    const cardUrgente = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "urgente" }) });
    await expect(cardUrgente.getByText("Revisar relatório")).toBeVisible();
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

    const cardRemoverDepois = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "remover-depois" }) });
    await expect(cardRemoverDepois.getByText("Tarefa com lista")).toBeVisible();

    const cardSemLista = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Sem lista" }) });
    await cardSemLista.scrollIntoViewIfNeeded();
    const todoItem = page.getByTestId("todo-item").filter({ hasText: "Tarefa com lista" });
    await todoItem.dragTo(cardSemLista);

    await expect(cardRemoverDepois.getByText("Tarefa com lista")).not.toBeVisible();
    await expect(cardSemLista.getByText("Tarefa com lista")).toBeVisible({
      timeout: 10000,
    });
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

    const cardParaDeletar = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "lista-para-deletar" }) });
    await expect(cardParaDeletar.getByText("Tarefa com lista para deletar")).toBeVisible();

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();
    page.on("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("list", { name: /Lista de listas temáticas/i })
      .getByRole("button", { name: /Remover lista lista-para-deletar/i })
      .click();

    await expect(page.getByRole("heading", { name: "lista-para-deletar" })).not.toBeVisible();
    await expect(page.getByText("Tarefa com lista para deletar")).toBeVisible();
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

// ─── Novo fluxo de listas (Tarefa 4.0) ─────────────────────────

test.describe("Novo fluxo de listas - cards e formulário inline", () => {
  let token: string;

  test.beforeEach(async ({ request }) => {
    token = await registerViaAPI(request, uniqueEmail(), TEST_PASSWORD);
  });

  test("4.2 - criar lista com cor (Trabalho, azul) e ver card na tela", async ({
    page,
  }) => {
    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();
    await expect(
      page.getByRole("heading", { name: /Gerenciar listas/i })
    ).toBeVisible();

    await page.getByLabel(/Nome da nova lista/i).fill("Trabalho");
    await page.getByRole("button", { name: /Cor Azul/i }).click();
    await page.getByRole("button", { name: /Criar lista/i }).click();

    const cardTrabalho = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Trabalho" }) });
    await expect(cardTrabalho).toBeVisible();
  });

  test("4.3 - criar tarefa avulsa no TodoForm global e ver no card Sem lista", async ({
    page,
  }) => {
    await authenticateInBrowser(page, token);

    const globalForm = page.getByRole("form", { name: /Adicionar nova tarefa/i });
    await globalForm.getByPlaceholder("Nova tarefa...").fill("Tarefa avulsa");
    await globalForm.getByRole("button", { name: "Adicionar" }).click();

    const cardSemLista = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Sem lista" }) });
    await expect(cardSemLista).toBeVisible();
    await expect(cardSemLista.getByText("Tarefa avulsa")).toBeVisible();
  });

  test("4.4 - criar tarefa dentro do card Trabalho e ver só nesse card", async ({
    page,
  }) => {
    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();
    await page.getByLabel(/Nome da nova lista/i).fill("Trabalho");
    await page.getByRole("button", { name: /Cor Azul/i }).click();
    await page.getByRole("button", { name: /Criar lista/i }).click();

    const cardTrabalho = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Trabalho" }) });
    await expect(cardTrabalho).toBeVisible();

    const formTrabalho = cardTrabalho.getByTestId("list-card-add-form");
    await formTrabalho.getByPlaceholder("Nova tarefa...").fill("Tarefa do trabalho");
    await formTrabalho.getByRole("button", { name: "Adicionar" }).click();

    await expect(cardTrabalho.getByText("Tarefa do trabalho")).toBeVisible();

    const cardSemLista = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Sem lista" }) });
    await expect(cardSemLista.getByText("Tarefa do trabalho")).not.toBeVisible();
  });

  test("4.8 - persistência após reload (lista e tarefas no card correto)", async ({
    page,
  }) => {
    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();
    await page.getByLabel(/Nome da nova lista/i).fill("Trabalho");
    await page.getByRole("button", { name: /Criar lista/i }).click();

    const cardTrabalho = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Trabalho" }) });
    const formTrabalho = cardTrabalho.getByTestId("list-card-add-form");
    await formTrabalho.getByPlaceholder("Nova tarefa...").fill("Tarefa persistente");
    await formTrabalho.getByRole("button", { name: "Adicionar" }).click();

    await expect(cardTrabalho.getByText("Tarefa persistente")).toBeVisible();

    await page.reload();

    const cardTrabalhoAfter = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Trabalho" }) });
    await expect(cardTrabalhoAfter.getByText("Tarefa persistente")).toBeVisible();
  });
});
