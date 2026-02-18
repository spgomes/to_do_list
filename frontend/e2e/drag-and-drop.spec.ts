import { test, expect, type Page } from "@playwright/test";

const API_URL = "http://localhost:8080/api";

let userCounter = 0;

function uniqueEmail(): string {
  userCounter++;
  return `e2e-drag-${Date.now()}-${userCounter}@test.com`;
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

test.describe("Drag & Drop entre listas (Tarefa 4.0)", () => {
  let token: string;

  test.beforeEach(async ({ request }) => {
    token = await registerViaAPI(request, uniqueEmail(), TEST_PASSWORD);
  });

  test("4.5 - arrastar tarefa avulsa do card Sem lista para o card Trabalho", async ({
    page,
  }) => {
    await authenticateInBrowser(page, token);

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();
    await page.getByLabel(/Nome da nova lista/i).fill("Trabalho");
    await page.getByRole("button", { name: /Cor Azul/i }).click();
    await page.getByRole("button", { name: /Criar lista/i }).click();

    const globalForm = page.getByRole("form", { name: /Adicionar nova tarefa/i });
    await globalForm.getByPlaceholder("Nova tarefa...").fill("Tarefa avulsa");
    await globalForm.getByRole("button", { name: "Adicionar" }).click();

    const cardSemLista = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Sem lista" }) });
    const cardTrabalho = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Trabalho" }) });

    await expect(cardSemLista.getByText("Tarefa avulsa")).toBeVisible();

    const todoItem = page.getByTestId("todo-item").filter({ hasText: "Tarefa avulsa" });
    await todoItem.dragTo(cardTrabalho);

    await expect(cardSemLista.getByText("Tarefa avulsa")).not.toBeVisible();
    await expect(cardTrabalho.getByText("Tarefa avulsa")).toBeVisible();
  });

  test("4.6 - arrastar tarefa entre listas (Trabalho para Pessoal)", async ({
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
    const formTrabalho = cardTrabalho.getByTestId("list-card-add-form");
    await formTrabalho.getByPlaceholder("Nova tarefa...").fill("Tarefa do trabalho");
    await formTrabalho.getByRole("button", { name: "Adicionar" }).click();

    await page.getByLabel(/Nome da nova lista/i).fill("Pessoal");
    await page.getByRole("button", { name: /Cor Rosa/i }).click();
    await page.getByRole("button", { name: /Criar lista/i }).click();

    const cardPessoal = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Pessoal" }) });
    await cardPessoal.scrollIntoViewIfNeeded();

    await expect(cardTrabalho.getByText("Tarefa do trabalho")).toBeVisible();

    const todoItem = page
      .getByTestId("todo-item")
      .filter({ hasText: "Tarefa do trabalho" });
    await todoItem.dragTo(cardPessoal);

    await expect(cardPessoal.getByText("Tarefa do trabalho")).toBeVisible({
      timeout: 10000,
    });
    await expect(cardTrabalho.getByText("Tarefa do trabalho")).not.toBeVisible();
  });

  test("4.7 - arrastar tarefa de uma lista para o card Sem lista", async ({
    page,
  }) => {
    await authenticateInBrowser(page, token);

    const globalForm = page.getByRole("form", { name: /Adicionar nova tarefa/i });
    await globalForm.getByPlaceholder("Nova tarefa...").fill("Tarefa dummy");
    await globalForm.getByRole("button", { name: "Adicionar" }).click();

    await page.getByRole("button", { name: /Gerenciar listas/i }).click();
    await page.getByLabel(/Nome da nova lista/i).fill("Trabalho");
    await page.getByRole("button", { name: /Cor Azul/i }).click();
    await page.getByRole("button", { name: /Criar lista/i }).click();

    const cardTrabalho = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Trabalho" }) });
    const formTrabalho = cardTrabalho.getByTestId("list-card-add-form");
    await formTrabalho.getByPlaceholder("Nova tarefa...").fill("Tarefa para sem lista");
    await formTrabalho.getByRole("button", { name: "Adicionar" }).click();

    const cardSemLista = page
      .getByTestId("list-card")
      .filter({ has: page.getByRole("heading", { name: "Sem lista" }) });
    await cardSemLista.scrollIntoViewIfNeeded();

    await expect(cardTrabalho.getByText("Tarefa para sem lista")).toBeVisible();

    const todoItem = page
      .getByTestId("todo-item")
      .filter({ hasText: "Tarefa para sem lista" });
    await todoItem.dragTo(cardSemLista);

    await expect(cardSemLista.getByText("Tarefa para sem lista")).toBeVisible({
      timeout: 10000,
    });
    await expect(cardTrabalho.getByText("Tarefa para sem lista")).not.toBeVisible();
  });
});
