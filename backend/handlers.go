package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
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

// handleListTodos returns all todos as a JSON array.
// GET /api/todos → 200 []Todo
func handleListTodos(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		todos, err := GetAllTodos(db)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to fetch todos")
			return
		}
		writeJSON(w, http.StatusOK, todos)
	}
}

// handleCreateTodo creates a new todo from the request body.
// POST /api/todos → 201 Todo
func handleCreateTodo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Title string `json:"title"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		todo, err := CreateTodo(db, req.Title)
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

// handleUpdateTodo updates the completed status of a todo.
// PATCH /api/todos/{id} → 204
func handleUpdateTodo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		if err := UpdateTodoStatus(db, id, req.Completed); err != nil {
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

// handleDeleteTodo removes a todo permanently.
// DELETE /api/todos/{id} → 204
func handleDeleteTodo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid todo ID")
			return
		}

		if err := DeleteTodo(db, id); err != nil {
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
