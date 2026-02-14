import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUser, loginUser } from "./auth.ts";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("registerUser", () => {
  it("sends POST to register endpoint and returns token", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ token: "jwt-token" }, 201));

    const result = await registerUser("user@test.com", "password123");

    expect(result).toEqual({ token: "jwt-token" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "password123" }),
      }
    );
  });

  it("throws error on 409 conflict (duplicate email)", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "email already registered" }, 409)
    );

    await expect(registerUser("dup@test.com", "pass123")).rejects.toThrow(
      "email already registered"
    );
  });

  it("throws error on 400 bad request", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "password must be at least 6 characters" }, 400)
    );

    await expect(registerUser("user@test.com", "short")).rejects.toThrow(
      "password must be at least 6 characters"
    );
  });
});

describe("loginUser", () => {
  it("sends POST to login endpoint and returns token", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ token: "jwt-token" }, 200));

    const result = await loginUser("user@test.com", "password123");

    expect(result).toEqual({ token: "jwt-token" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "password123" }),
      }
    );
  });

  it("throws error on 401 unauthorized", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "invalid credentials" }, 401)
    );

    await expect(loginUser("user@test.com", "wrong")).rejects.toThrow(
      "invalid credentials"
    );
  });
});
