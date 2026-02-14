package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/mail"
	"strconv"

	"golang.org/x/crypto/bcrypt"
)

// writeJSON writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("failed to encode JSON response", "error", err)
	}
}

// writeError writes a JSON error response with the given status code.
func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// handleRegister creates a new user account.
// POST /api/auth/register → 201 { "token": "..." }
func handleRegister(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		if req.Email == "" {
			writeError(w, http.StatusBadRequest, "email is required")
			return
		}
		if _, err := mail.ParseAddress(req.Email); err != nil {
			writeError(w, http.StatusBadRequest, "invalid email format")
			return
		}
		if len(req.Password) < 6 {
			writeError(w, http.StatusBadRequest, "password must be at least 6 characters")
			return
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to process password")
			return
		}

		user, err := CreateUser(db, req.Email, string(hash))
		if err != nil {
			if errors.Is(err, ErrDuplicateEmail) {
				writeError(w, http.StatusConflict, "email already registered")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to create user")
			return
		}

		token, err := generateJWT(user.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to generate token")
			return
		}

		writeJSON(w, http.StatusCreated, map[string]string{"token": token})
	}
}

// handleLogin authenticates a user and returns a JWT token.
// POST /api/auth/login → 200 { "token": "..." }
func handleLogin(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		if req.Email == "" || req.Password == "" {
			writeError(w, http.StatusBadRequest, "email and password are required")
			return
		}

		user, err := GetUserByEmail(db, req.Email)
		if err != nil {
			if errors.Is(err, ErrUserNotFound) {
				writeError(w, http.StatusUnauthorized, "invalid credentials")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to authenticate")
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}

		token, err := generateJWT(user.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to generate token")
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"token": token})
	}
}

// handleListTodos returns all todos for the authenticated user as a JSON array.
// GET /api/todos → 200 []Todo
func handleListTodos(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		todos, err := GetAllTodos(db, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to fetch todos")
			return
		}
		writeJSON(w, http.StatusOK, todos)
	}
}

// handleCreateTodo creates a new todo from the request body for the authenticated user.
// POST /api/todos → 201 Todo
func handleCreateTodo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		var req struct {
			Title string `json:"title"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		todo, err := CreateTodo(db, req.Title, userID)
		if err != nil {
			if errors.Is(err, ErrEmptyTitle) {
				writeError(w, http.StatusBadRequest, "title cannot be empty")
				return
			}
			if errors.Is(err, ErrTitleTooLong) {
				writeError(w, http.StatusBadRequest, "title exceeds maximum length of 255 characters")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to create todo")
			return
		}

		writeJSON(w, http.StatusCreated, todo)
	}
}

// handleUpdateTodo updates the completed status of a todo for the authenticated user.
// PATCH /api/todos/{id} → 204
func handleUpdateTodo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid todo ID")
			return
		}

		var req struct {
			Completed bool `json:"completed"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		if err := UpdateTodoStatus(db, id, req.Completed, userID); err != nil {
			if errors.Is(err, ErrNotFound) {
				writeError(w, http.StatusNotFound, "todo not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to update todo")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// handleDeleteTodo removes a todo permanently for the authenticated user.
// DELETE /api/todos/{id} → 204
func handleDeleteTodo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid todo ID")
			return
		}

		if err := DeleteTodo(db, id, userID); err != nil {
			if errors.Is(err, ErrNotFound) {
				writeError(w, http.StatusNotFound, "todo not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to delete todo")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
