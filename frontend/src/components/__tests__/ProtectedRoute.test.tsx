// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../../contexts/AuthContext.tsx";
import { ProtectedRoute } from "../ProtectedRoute.tsx";

beforeEach(() => {
  localStorage.clear();
});

describe("ProtectedRoute", () => {
  it("renders children when authenticated", () => {
    localStorage.setItem("token", "valid-token");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Protected Content")).toBeDefined();
  });

  it("redirects to /login when not authenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Login Page")).toBeDefined();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });
});
