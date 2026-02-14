// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../contexts/AuthContext.tsx";
import { RegisterPage } from "../../pages/RegisterPage.tsx";

vi.mock("../../services/auth.ts", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
}));

import { registerUser } from "../../services/auth.ts";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("RegisterPage", () => {
  it("renders register form with email, password, confirm password and submit", () => {
    renderRegisterPage();

    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
    expect(screen.getByRole("button", { name: "Register" })).toBeDefined();
  });

  it("shows error when email is empty", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Email is required");
    });
  });

  it("shows error when password is too short", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "12345");
    await user.type(screen.getByLabelText("Confirm Password"), "12345");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Password must be at least 6 characters"
      );
    });
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password456");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Passwords do not match"
      );
    });
  });

  it("calls registerUser on valid form submission", async () => {
    const user = userEvent.setup();
    vi.mocked(registerUser).mockResolvedValue({ token: "jwt-token" });
    renderRegisterPage();

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith("test@test.com", "password123");
    });
  });

  it("shows error when email is already registered", async () => {
    const user = userEvent.setup();
    vi.mocked(registerUser).mockRejectedValue(
      new Error("email already registered")
    );
    renderRegisterPage();

    await user.type(screen.getByLabelText("Email"), "dup@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "email already registered"
      );
    });
  });

  it("has link to login page", () => {
    renderRegisterPage();

    expect(screen.getByText("Login")).toBeDefined();
  });

  it("has aria-label on form element", () => {
    renderRegisterPage();

    expect(screen.getByRole("form", { name: "Registration form" })).toBeDefined();
  });
});
