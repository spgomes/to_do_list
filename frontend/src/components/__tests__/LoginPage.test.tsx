// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../contexts/AuthContext.tsx";
import { LoginPage } from "../../pages/LoginPage.tsx";

vi.mock("../../services/auth.ts", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

import { loginUser } from "../../services/auth.ts";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  it("renders login form with email, password fields and submit button", () => {
    renderLoginPage();

    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByRole("button", { name: "Login" })).toBeDefined();
  });

  it("shows error when email is empty", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Email is required");
    });
  });

  it("shows error when password is empty", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Password is required");
    });
  });

  it("calls loginUser on valid form submission", async () => {
    const user = userEvent.setup();
    vi.mocked(loginUser).mockResolvedValue({ token: "jwt-token" });
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith("test@test.com", "password123");
    });
  });

  it("shows error on invalid credentials", async () => {
    const user = userEvent.setup();
    vi.mocked(loginUser).mockRejectedValue(new Error("invalid credentials"));
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("invalid credentials");
    });
  });

  it("has link to register page", () => {
    renderLoginPage();

    expect(screen.getByText("Register")).toBeDefined();
  });

  it("has aria-label on form element", () => {
    renderLoginPage();

    expect(screen.getByRole("form", { name: "Login form" })).toBeDefined();
  });
});
