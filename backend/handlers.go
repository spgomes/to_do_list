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

// handleListTodos returns all todos for the authenticated user as a JSON array, with tags per todo.
// GET /api/todos → 200 []Todo (each with tags)
// GET /api/todos?list_id=123 → 200 []Todo (filtered by list)
func handleListTodos(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		var todos []Todo
		var err error
		if listIDStr := r.URL.Query().Get("list_id"); listIDStr != "" {
			listID, parseErr := strconv.ParseInt(listIDStr, 10, 64)
			if parseErr != nil {
				writeError(w, http.StatusBadRequest, "invalid list_id")
				return
			}
			todos, err = ListTodosByList(db, listID, userID)
			if err != nil {
				if errors.Is(err, ErrListNotFound) {
					writeError(w, http.StatusNotFound, "list not found")
					return
				}
				writeError(w, http.StatusInternalServerError, "failed to fetch todos")
				return
			}
			// ListTodosByList already populates Lists on each todo; no need to populate tags
			writeJSON(w, http.StatusOK, todos)
			return
		}
		todos, err = GetAllTodos(db, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to fetch todos")
			return
		}
		for i := range todos {
			tags, err := ListTodoTags(db, todos[i].ID, userID)
			if err != nil {
				todos[i].Tags = nil
			} else {
				todos[i].Tags = tags
			}
			lists, err := ListTodoLists(db, todos[i].ID, userID)
			if err != nil {
				todos[i].Lists = nil
			} else {
				todos[i].Lists = lists
			}
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

// handleUpdateTodoTitle updates only the title of a todo for the authenticated user.
// PATCH /api/todos/{id}/title → 204
func handleUpdateTodoTitle(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid todo ID")
			return
		}

		var req struct {
			Title string `json:"title"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		if err := UpdateTodoTitle(db, id, req.Title, userID); err != nil {
			if errors.Is(err, ErrEmptyTitle) {
				writeError(w, http.StatusBadRequest, "title cannot be empty")
				return
			}
			if errors.Is(err, ErrTitleTooLong) {
				writeError(w, http.StatusBadRequest, "title exceeds maximum length of 255 characters")
				return
			}
			if errors.Is(err, ErrNotFound) {
				writeError(w, http.StatusNotFound, "todo not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to update todo title")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// handleDeleteTodo soft-deletes a todo for the authenticated user.
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

// --- Tag Handlers ---

// handleListTags returns all tags for the authenticated user.
// GET /api/tags → 200 []Tag
func handleListTags(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		tags, err := ListTags(db, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to fetch tags")
			return
		}
		writeJSON(w, http.StatusOK, tags)
	}
}

// handleCreateTag creates a new tag for the authenticated user.
// POST /api/tags → 201 Tag
func handleCreateTag(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		var req struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		tag, err := CreateTag(db, req.Name, userID)
		if err != nil {
			if errors.Is(err, ErrEmptyTagName) {
				writeError(w, http.StatusBadRequest, "tag name cannot be empty")
				return
			}
			if errors.Is(err, ErrTagNameTooLong) {
				writeError(w, http.StatusBadRequest, "tag name exceeds maximum length of 50 characters")
				return
			}
			if errors.Is(err, ErrDuplicateTag) {
				writeError(w, http.StatusConflict, "tag with this name already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to create tag")
			return
		}

		writeJSON(w, http.StatusCreated, tag)
	}
}

// handleUpdateTag updates the name of a tag for the authenticated user.
// PATCH /api/tags/{id} → 204
func handleUpdateTag(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid tag ID")
			return
		}

		var req struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		if err := UpdateTagName(db, id, req.Name, userID); err != nil {
			if errors.Is(err, ErrEmptyTagName) {
				writeError(w, http.StatusBadRequest, "tag name cannot be empty")
				return
			}
			if errors.Is(err, ErrTagNameTooLong) {
				writeError(w, http.StatusBadRequest, "tag name exceeds maximum length of 50 characters")
				return
			}
			if errors.Is(err, ErrDuplicateTag) {
				writeError(w, http.StatusConflict, "tag with this name already exists")
				return
			}
			if errors.Is(err, ErrTagNotFound) {
				writeError(w, http.StatusNotFound, "tag not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to update tag")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// handleDeleteTag deletes a tag for the authenticated user.
// DELETE /api/tags/{id} → 204
func handleDeleteTag(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid tag ID")
			return
		}

		if err := DeleteTag(db, id, userID); err != nil {
			if errors.Is(err, ErrTagNotFound) {
				writeError(w, http.StatusNotFound, "tag not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to delete tag")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// handleAddTagToTodo associates a tag with a todo for the authenticated user.
// POST /api/todos/{id}/tags/{tagId} → 204
func handleAddTagToTodo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		todoIDStr := r.PathValue("id")
		tagIDStr := r.PathValue("tagId")
		todoID, err := strconv.ParseInt(todoIDStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid todo ID")
			return
		}
		tagID, err := strconv.ParseInt(tagIDStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid tag ID")
			return
		}

		if err := AddTagToTodo(db, todoID, tagID, userID); err != nil {
			if errors.Is(err, ErrNotFound) {
				writeError(w, http.StatusNotFound, "todo not found")
				return
			}
			if errors.Is(err, ErrTagNotFound) {
				writeError(w, http.StatusNotFound, "tag not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to add tag to todo")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// handleRemoveTagFromTodo removes the association between a tag and a todo.
// DELETE /api/todos/{id}/tags/{tagId} → 204
func handleRemoveTagFromTodo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		todoIDStr := r.PathValue("id")
		tagIDStr := r.PathValue("tagId")
		todoID, err := strconv.ParseInt(todoIDStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid todo ID")
			return
		}
		tagID, err := strconv.ParseInt(tagIDStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid tag ID")
			return
		}

		if err := RemoveTagFromTodo(db, todoID, tagID, userID); err != nil {
			if errors.Is(err, ErrNotFound) {
				writeError(w, http.StatusNotFound, "todo or tag association not found")
				return
			}
			if errors.Is(err, ErrTagNotFound) {
				writeError(w, http.StatusNotFound, "tag not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to remove tag from todo")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// --- List Handlers ---

// handleListTodosByList returns all todos for a specific list for the authenticated user.
// GET /api/lists/{id}/todos → 200 []Todo (each with lists populated)
func handleListTodosByList(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		idStr := r.PathValue("id")
		listID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid list ID")
			return
		}

		todos, err := ListTodosByList(db, listID, userID)
		if err != nil {
			if errors.Is(err, ErrListNotFound) {
				writeError(w, http.StatusNotFound, "list not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to fetch todos")
			return
		}

		writeJSON(w, http.StatusOK, todos)
	}
}

// handleListLists returns all lists for the authenticated user.
// GET /api/lists → 200 []List
func handleListLists(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		lists, err := ListLists(db, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to fetch lists")
			return
		}
		writeJSON(w, http.StatusOK, lists)
	}
}

// handleCreateList creates a new list for the authenticated user.
// POST /api/lists → 201 List
func handleCreateList(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		var req struct {
			Name  string `json:"name"`
			Color string `json:"color"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		list, err := CreateList(db, req.Name, req.Color, userID)
		if err != nil {
			if errors.Is(err, ErrEmptyListName) {
				writeError(w, http.StatusBadRequest, "list name cannot be empty")
				return
			}
			if errors.Is(err, ErrListNameTooLong) {
				writeError(w, http.StatusBadRequest, "list name exceeds maximum length of 50 characters")
				return
			}
			if errors.Is(err, ErrDuplicateList) {
				writeError(w, http.StatusConflict, "list with this name already exists")
				return
			}
			if errors.Is(err, ErrInvalidColor) {
				writeError(w, http.StatusBadRequest, "color must be a valid pastel hex from the palette")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to create list")
			return
		}

		writeJSON(w, http.StatusCreated, list)
	}
}

// handleUpdateList updates the name and/or color of a list for the authenticated user.
// PATCH /api/lists/{id} → 204
func handleUpdateList(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid list ID")
			return
		}

		var req struct {
			Name  string `json:"name"`
			Color string `json:"color"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		existing, err := GetListByID(db, id, userID)
		if err != nil {
			if errors.Is(err, ErrListNotFound) {
				writeError(w, http.StatusNotFound, "list not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to fetch list")
			return
		}
		name := req.Name
		if name == "" {
			name = existing.Name
		}
		color := req.Color
		if color == "" {
			color = existing.Color
		}

		if err := UpdateList(db, id, name, color, userID); err != nil {
			if errors.Is(err, ErrEmptyListName) {
				writeError(w, http.StatusBadRequest, "list name cannot be empty")
				return
			}
			if errors.Is(err, ErrListNameTooLong) {
				writeError(w, http.StatusBadRequest, "list name exceeds maximum length of 50 characters")
				return
			}
			if errors.Is(err, ErrDuplicateList) {
				writeError(w, http.StatusConflict, "list with this name already exists")
				return
			}
			if errors.Is(err, ErrListNotFound) {
				writeError(w, http.StatusNotFound, "list not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to update list")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// handleDeleteList deletes a list for the authenticated user.
// DELETE /api/lists/{id} → 204
func handleDeleteList(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid list ID")
			return
		}

		if err := DeleteList(db, id, userID); err != nil {
			if errors.Is(err, ErrListNotFound) {
				writeError(w, http.StatusNotFound, "list not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to delete list")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// handleAddListToTodo associates a list with a todo for the authenticated user.
// POST /api/todos/{id}/lists/{listId} → 204
func handleAddListToTodo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		todoIDStr := r.PathValue("id")
		listIDStr := r.PathValue("listId")
		todoID, err := strconv.ParseInt(todoIDStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid todo ID")
			return
		}
		listID, err := strconv.ParseInt(listIDStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid list ID")
			return
		}

		if err := AddListToTodo(db, todoID, listID, userID); err != nil {
			if errors.Is(err, ErrNotFound) {
				writeError(w, http.StatusNotFound, "todo not found")
				return
			}
			if errors.Is(err, ErrListNotFound) {
				writeError(w, http.StatusNotFound, "list not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to add list to todo")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// handleRemoveListFromTodo removes the association between a list and a todo.
// DELETE /api/todos/{id}/lists/{listId} → 204
func handleRemoveListFromTodo(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r)
		todoIDStr := r.PathValue("id")
		listIDStr := r.PathValue("listId")
		todoID, err := strconv.ParseInt(todoIDStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid todo ID")
			return
		}
		listID, err := strconv.ParseInt(listIDStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid list ID")
			return
		}

		if err := RemoveListFromTodo(db, todoID, listID, userID); err != nil {
			if errors.Is(err, ErrNotFound) {
				writeError(w, http.StatusNotFound, "todo or list association not found")
				return
			}
			if errors.Is(err, ErrListNotFound) {
				writeError(w, http.StatusNotFound, "list not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to remove list from todo")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
