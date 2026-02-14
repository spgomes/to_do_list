// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../../contexts/AuthContext.tsx";

function TestComponent() {
  const { token, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? "null"}</span>
      <span data-testid="auth">{isAuthenticated ? "yes" : "no"}</span>
      <button onClick={() => login("test-token")}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("AuthContext", () => {
  it("starts unauthenticated when no token in localStorage", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("token").textContent).toBe("null");
    expect(screen.getByTestId("auth").textContent).toBe("no");
  });

  it("starts authenticated when token exists in localStorage", () => {
    localStorage.setItem("token", "existing-token");

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("token").textContent).toBe("existing-token");
    expect(screen.getByTestId("auth").textContent).toBe("yes");
  });

  it("login stores token in state and localStorage", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await user.click(screen.getByText("Login"));

    expect(screen.getByTestId("token").textContent).toBe("test-token");
    expect(screen.getByTestId("auth").textContent).toBe("yes");
    expect(localStorage.getItem("token")).toBe("test-token");
  });

  it("logout removes token from state and localStorage", async () => {
    localStorage.setItem("token", "existing-token");
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("auth").textContent).toBe("yes");

    await user.click(screen.getByText("Logout"));

    expect(screen.getByTestId("token").textContent).toBe("null");
    expect(screen.getByTestId("auth").textContent).toBe("no");
    expect(localStorage.getItem("token")).toBeNull();
  });
});
