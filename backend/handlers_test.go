package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

// --- Auth Handler Tests ---

func TestHandleRegister_Success(t *testing.T) {
	db := setupTestDB(t)

	body := `{"email":"new@example.com","password":"secret123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	handleRegister(db)(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp["token"] == "" {
		t.Error("expected non-empty token")
	}
}

func TestHandleRegister_DuplicateEmail(t *testing.T) {
	db := setupTestDB(t)

	hash, _ := bcrypt.GenerateFromPassword([]byte("pass123"), bcrypt.DefaultCost)
	CreateUser(db, "dup@example.com", string(hash))

	body := `{"email":"dup@example.com","password":"pass456"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	handleRegister(db)(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["error"] != "email already registered" {
		t.Errorf("expected 'email already registered', got '%s'", resp["error"])
	}
}

func TestHandleRegister_EmptyEmail(t *testing.T) {
	db := setupTestDB(t)

	body := `{"email":"","password":"secret123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	handleRegister(db)(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestHandleRegister_InvalidEmail(t *testing.T) {
	db := setupTestDB(t)

	body := `{"email":"notanemail","password":"secret123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	handleRegister(db)(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["error"] != "invalid email format" {
		t.Errorf("expected 'invalid email format', got '%s'", resp["error"])
	}
}

func TestHandleRegister_ShortPassword(t *testing.T) {
	db := setupTestDB(t)

	body := `{"email":"user@example.com","password":"12345"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	handleRegister(db)(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["error"] != "password must be at least 6 characters" {
		t.Errorf("expected password length error, got '%s'", resp["error"])
	}
}

func TestHandleLogin_Success(t *testing.T) {
	db := setupTestDB(t)

	hash, _ := bcrypt.GenerateFromPassword([]byte("secret123"), bcrypt.DefaultCost)
	CreateUser(db, "login@example.com", string(hash))

	body := `{"email":"login@example.com","password":"secret123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	handleLogin(db)(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp["token"] == "" {
		t.Error("expected non-empty token")
	}
}

func TestHandleLogin_WrongPassword(t *testing.T) {
	db := setupTestDB(t)

	hash, _ := bcrypt.GenerateFromPassword([]byte("correct"), bcrypt.DefaultCost)
	CreateUser(db, "wrong@example.com", string(hash))

	body := `{"email":"wrong@example.com","password":"incorrect"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	handleLogin(db)(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["error"] != "invalid credentials" {
		t.Errorf("expected 'invalid credentials', got '%s'", resp["error"])
	}
}

func TestHandleLogin_UserNotFound(t *testing.T) {
	db := setupTestDB(t)

	body := `{"email":"nobody@example.com","password":"doesntmatter"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	handleLogin(db)(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestHandleLogin_EmptyFields(t *testing.T) {
	db := setupTestDB(t)

	body := `{"email":"","password":""}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
	w := httptest.NewRecorder()

	handleLogin(db)(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

// --- JWT Tests ---

func TestGenerateAndValidateJWT(t *testing.T) {
	token, err := generateJWT(42)
	if err != nil {
		t.Fatalf("generateJWT failed: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}

	userID, err := validateJWT(token)
	if err != nil {
		t.Fatalf("validateJWT failed: %v", err)
	}
	if userID != 42 {
		t.Errorf("expected userID 42, got %d", userID)
	}
}

func TestValidateJWT_InvalidToken(t *testing.T) {
	_, err := validateJWT("invalid.token.string")
	if err == nil {
		t.Error("expected error for invalid token, got nil")
	}
}

func TestValidateJWT_EmptyToken(t *testing.T) {
	_, err := validateJWT("")
	if err == nil {
		t.Error("expected error for empty token, got nil")
	}
}

// --- JWT Middleware Tests ---

func TestJWTMiddleware_ValidToken(t *testing.T) {
	token, _ := generateJWT(1)

	handler := jwtMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid := getUserIDFromContext(r)
		if uid != 1 {
			t.Errorf("expected userID 1 in context, got %d", uid)
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestJWTMiddleware_MissingHeader(t *testing.T) {
	handler := jwtMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called without authorization")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestJWTMiddleware_InvalidFormat(t *testing.T) {
	handler := jwtMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called with invalid authorization")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	req.Header.Set("Authorization", "NotBearer sometoken")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestJWTMiddleware_InvalidToken(t *testing.T) {
	handler := jwtMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called with invalid token")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	req.Header.Set("Authorization", "Bearer invalidtoken")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

// --- Todo Handler Tests (with auth context) ---

func injectUserID(r *http.Request, userID int64) *http.Request {
	ctx := context.WithValue(r.Context(), userIDKey, userID)
	return r.WithContext(ctx)
}

func TestHandleListTodos_Empty(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	req := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleListTodos(db)(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", ct)
	}

	var todos []Todo
	if err := json.NewDecoder(w.Body).Decode(&todos); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(todos) != 0 {
		t.Errorf("expected 0 todos, got %d", len(todos))
	}
}

func TestHandleCreateTodo_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	body := `{"title":"Buy milk"}`
	req := httptest.NewRequest(http.MethodPost, "/api/todos", bytes.NewBufferString(body))
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleCreateTodo(db)(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}

	var todo Todo
	if err := json.NewDecoder(w.Body).Decode(&todo); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if todo.Title != "Buy milk" {
		t.Errorf("expected title 'Buy milk', got '%s'", todo.Title)
	}
	if todo.ID == 0 {
		t.Error("expected non-zero ID")
	}
	if todo.Completed {
		t.Error("expected new todo to not be completed")
	}
}

func TestHandleCreateTodo_EmptyTitle(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	body := `{"title":""}`
	req := httptest.NewRequest(http.MethodPost, "/api/todos", bytes.NewBufferString(body))
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleCreateTodo(db)(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if errResp["error"] == "" {
		t.Error("expected non-empty error message")
	}
}

func TestHandleCreateTodo_TitleTooLong(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	longTitle := strings.Repeat("a", MaxTitleLength+1)
	body := `{"title":"` + longTitle + `"}`
	req := httptest.NewRequest(http.MethodPost, "/api/todos", bytes.NewBufferString(body))
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleCreateTodo(db)(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if errResp["error"] != "title exceeds maximum length of 255 characters" {
		t.Errorf("expected title too long error, got '%s'", errResp["error"])
	}
}

func TestHandleCreateTodo_InvalidJSON(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	body := `not valid json`
	req := httptest.NewRequest(http.MethodPost, "/api/todos", bytes.NewBufferString(body))
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleCreateTodo(db)(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if errResp["error"] != "invalid JSON body" {
		t.Errorf("expected error 'invalid JSON body', got '%s'", errResp["error"])
	}
}

func TestHandleUpdateTodo_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	body := `{"completed":true}`
	req := httptest.NewRequest(http.MethodPatch, "/api/todos/"+strconv.FormatInt(todo.ID, 10), bytes.NewBufferString(body))
	req.SetPathValue("id", strconv.FormatInt(todo.ID, 10))
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleUpdateTodo(db)(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", w.Code)
	}
}

func TestHandleUpdateTodo_NotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	body := `{"completed":true}`
	req := httptest.NewRequest(http.MethodPatch, "/api/todos/999", bytes.NewBufferString(body))
	req.SetPathValue("id", "999")
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleUpdateTodo(db)(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if errResp["error"] != "todo not found" {
		t.Errorf("expected error 'todo not found', got '%s'", errResp["error"])
	}
}

func TestHandleUpdateTodo_InvalidID(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	body := `{"completed":true}`
	req := httptest.NewRequest(http.MethodPatch, "/api/todos/abc", bytes.NewBufferString(body))
	req.SetPathValue("id", "abc")
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleUpdateTodo(db)(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if errResp["error"] != "invalid todo ID" {
		t.Errorf("expected error 'invalid todo ID', got '%s'", errResp["error"])
	}
}

func TestHandleDeleteTodo_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "To be deleted", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/todos/"+strconv.FormatInt(todo.ID, 10), nil)
	req.SetPathValue("id", strconv.FormatInt(todo.ID, 10))
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleDeleteTodo(db)(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", w.Code)
	}
}

func TestHandleDeleteTodo_NotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	req := httptest.NewRequest(http.MethodDelete, "/api/todos/999", nil)
	req.SetPathValue("id", "999")
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleDeleteTodo(db)(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
		t.Fatalf("failed to decode error response: %v", err)
	}
	if errResp["error"] != "todo not found" {
		t.Errorf("expected error 'todo not found', got '%s'", errResp["error"])
	}
}

// --- Soft Delete Handler Tests ---

func TestHandleDeleteTodo_SoftDelete(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	// Create a todo
	todo, err := CreateTodo(db, "Soft delete me", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	// DELETE the todo
	delReq := httptest.NewRequest(http.MethodDelete, "/api/todos/"+strconv.FormatInt(todo.ID, 10), nil)
	delReq.SetPathValue("id", strconv.FormatInt(todo.ID, 10))
	delReq = injectUserID(delReq, user.ID)
	delW := httptest.NewRecorder()

	handleDeleteTodo(db)(delW, delReq)

	if delW.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", delW.Code)
	}

	// GET todos — should be empty
	listReq := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	listReq = injectUserID(listReq, user.ID)
	listW := httptest.NewRecorder()

	handleListTodos(db)(listW, listReq)

	var todos []Todo
	if err := json.NewDecoder(listW.Body).Decode(&todos); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(todos) != 0 {
		t.Errorf("expected 0 todos after soft delete, got %d", len(todos))
	}

	// Verify record still exists in DB
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM todos WHERE id = ?", todo.ID).Scan(&count)
	if err != nil {
		t.Fatalf("QueryRow failed: %v", err)
	}
	if count != 1 {
		t.Errorf("expected record to persist in DB, got count %d", count)
	}
}

// --- UpdateTodoTitle Handler Tests ---

func TestHandleUpdateTodoTitle_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Original title", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	body := `{"title":"New title"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/todos/"+strconv.FormatInt(todo.ID, 10)+"/title", bytes.NewBufferString(body))
	req.SetPathValue("id", strconv.FormatInt(todo.ID, 10))
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleUpdateTodoTitle(db)(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", w.Code)
	}

	// Verify title was updated via GET
	listReq := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
	listReq = injectUserID(listReq, user.ID)
	listW := httptest.NewRecorder()

	handleListTodos(db)(listW, listReq)

	var todos []Todo
	if err := json.NewDecoder(listW.Body).Decode(&todos); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(todos) != 1 {
		t.Fatalf("expected 1 todo, got %d", len(todos))
	}
	if todos[0].Title != "New title" {
		t.Errorf("expected title 'New title', got '%s'", todos[0].Title)
	}
}

func TestHandleUpdateTodoTitle_EmptyTitle(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Original", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	body := `{"title":""}`
	req := httptest.NewRequest(http.MethodPatch, "/api/todos/"+strconv.FormatInt(todo.ID, 10)+"/title", bytes.NewBufferString(body))
	req.SetPathValue("id", strconv.FormatInt(todo.ID, 10))
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleUpdateTodoTitle(db)(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if errResp["error"] != "title cannot be empty" {
		t.Errorf("expected 'title cannot be empty', got '%s'", errResp["error"])
	}
}

func TestHandleUpdateTodoTitle_NotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	body := `{"title":"Some title"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/todos/999/title", bytes.NewBufferString(body))
	req.SetPathValue("id", "999")
	req = injectUserID(req, user.ID)
	w := httptest.NewRecorder()

	handleUpdateTodoTitle(db)(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}

	var errResp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if errResp["error"] != "todo not found" {
		t.Errorf("expected 'todo not found', got '%s'", errResp["error"])
	}
}

func TestCORSMiddleware(t *testing.T) {
	handler := corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	t.Run("regular request has CORS headers", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		origin := w.Header().Get("Access-Control-Allow-Origin")
		if origin != "http://localhost:5173" {
			t.Errorf("expected Access-Control-Allow-Origin 'http://localhost:5173', got '%s'", origin)
		}

		methods := w.Header().Get("Access-Control-Allow-Methods")
		if methods != "GET, POST, PATCH, DELETE, OPTIONS" {
			t.Errorf("expected Access-Control-Allow-Methods 'GET, POST, PATCH, DELETE, OPTIONS', got '%s'", methods)
		}

		headers := w.Header().Get("Access-Control-Allow-Headers")
		if headers != "Content-Type, Authorization" {
			t.Errorf("expected Access-Control-Allow-Headers 'Content-Type, Authorization', got '%s'", headers)
		}

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}
	})

	t.Run("preflight OPTIONS returns 204", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/todos", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusNoContent {
			t.Errorf("expected status 204 for OPTIONS preflight, got %d", w.Code)
		}

		origin := w.Header().Get("Access-Control-Allow-Origin")
		if origin != "http://localhost:5173" {
			t.Errorf("expected Access-Control-Allow-Origin 'http://localhost:5173', got '%s'", origin)
		}
	})
}

// --- Integration Test (httptest.NewServer + full auth flow) ---

func TestAPIFullAuthAndCRUDFlow(t *testing.T) {
	db := setupTestDB(t)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/auth/register", handleRegister(db))
	mux.HandleFunc("POST /api/auth/login", handleLogin(db))

	protected := http.NewServeMux()
	protected.HandleFunc("GET /api/todos", handleListTodos(db))
	protected.HandleFunc("POST /api/todos", handleCreateTodo(db))
	protected.HandleFunc("PATCH /api/todos/{id}", handleUpdateTodo(db))
	protected.HandleFunc("DELETE /api/todos/{id}", handleDeleteTodo(db))
	mux.Handle("/api/todos", jwtMiddleware(protected))
	mux.Handle("/api/todos/", jwtMiddleware(protected))

	srv := httptest.NewServer(corsMiddleware(mux))
	defer srv.Close()

	client := srv.Client()
	baseURL := srv.URL

	// 1. Register User A
	regBody := `{"email":"userA@test.com","password":"passA123"}`
	resp, err := client.Post(baseURL+"/api/auth/register", "application/json", bytes.NewBufferString(regBody))
	if err != nil {
		t.Fatalf("Step 1 - Register failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Step 1 - expected 201, got %d", resp.StatusCode)
	}
	var regResp map[string]string
	json.NewDecoder(resp.Body).Decode(&regResp)
	resp.Body.Close()
	tokenA := regResp["token"]
	if tokenA == "" {
		t.Fatal("Step 1 - expected non-empty token for User A")
	}

	// 2. Register User B
	regBody = `{"email":"userB@test.com","password":"passB123"}`
	resp, err = client.Post(baseURL+"/api/auth/register", "application/json", bytes.NewBufferString(regBody))
	if err != nil {
		t.Fatalf("Step 2 - Register failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Step 2 - expected 201, got %d", resp.StatusCode)
	}
	json.NewDecoder(resp.Body).Decode(&regResp)
	resp.Body.Close()
	tokenB := regResp["token"]

	// 3. Try to register with duplicate email → 409
	regBody = `{"email":"userA@test.com","password":"different"}`
	resp, err = client.Post(baseURL+"/api/auth/register", "application/json", bytes.NewBufferString(regBody))
	if err != nil {
		t.Fatalf("Step 3 - Register failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("Step 3 - expected 409 for duplicate email, got %d", resp.StatusCode)
	}

	// 4. Login with wrong password → 401
	loginBody := `{"email":"userA@test.com","password":"wrongpassword"}`
	resp, err = client.Post(baseURL+"/api/auth/login", "application/json", bytes.NewBufferString(loginBody))
	if err != nil {
		t.Fatalf("Step 4 - Login failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("Step 4 - expected 401, got %d", resp.StatusCode)
	}

	// 5. Login with correct password → 200
	loginBody = `{"email":"userA@test.com","password":"passA123"}`
	resp, err = client.Post(baseURL+"/api/auth/login", "application/json", bytes.NewBufferString(loginBody))
	if err != nil {
		t.Fatalf("Step 5 - Login failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Step 5 - expected 200, got %d", resp.StatusCode)
	}
	var loginResp map[string]string
	json.NewDecoder(resp.Body).Decode(&loginResp)
	resp.Body.Close()
	if loginResp["token"] == "" {
		t.Fatal("Step 5 - expected non-empty token on login")
	}

	// 6. GET /api/todos without token → 401
	resp, err = client.Get(baseURL + "/api/todos")
	if err != nil {
		t.Fatalf("Step 6 - GET failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("Step 6 - expected 401 without token, got %d", resp.StatusCode)
	}

	// 7. User A creates a todo
	createReq, _ := http.NewRequest(http.MethodPost, baseURL+"/api/todos", bytes.NewBufferString(`{"title":"User A task"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+tokenA)
	resp, err = client.Do(createReq)
	if err != nil {
		t.Fatalf("Step 7 - POST failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Step 7 - expected 201, got %d", resp.StatusCode)
	}
	var createdTodoA Todo
	json.NewDecoder(resp.Body).Decode(&createdTodoA)
	resp.Body.Close()

	// 8. User B creates a todo
	createReq, _ = http.NewRequest(http.MethodPost, baseURL+"/api/todos", bytes.NewBufferString(`{"title":"User B task"}`))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+tokenB)
	resp, err = client.Do(createReq)
	if err != nil {
		t.Fatalf("Step 8 - POST failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Step 8 - expected 201, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// 9. User A lists todos — should see only their own
	listReq, _ := http.NewRequest(http.MethodGet, baseURL+"/api/todos", nil)
	listReq.Header.Set("Authorization", "Bearer "+tokenA)
	resp, err = client.Do(listReq)
	if err != nil {
		t.Fatalf("Step 9 - GET failed: %v", err)
	}
	var todosA []Todo
	json.NewDecoder(resp.Body).Decode(&todosA)
	resp.Body.Close()
	if len(todosA) != 1 {
		t.Fatalf("Step 9 - expected 1 todo for User A, got %d", len(todosA))
	}
	if todosA[0].Title != "User A task" {
		t.Errorf("Step 9 - expected 'User A task', got '%s'", todosA[0].Title)
	}

	// 10. User B lists todos — should see only their own
	listReq, _ = http.NewRequest(http.MethodGet, baseURL+"/api/todos", nil)
	listReq.Header.Set("Authorization", "Bearer "+tokenB)
	resp, err = client.Do(listReq)
	if err != nil {
		t.Fatalf("Step 10 - GET failed: %v", err)
	}
	var todosB []Todo
	json.NewDecoder(resp.Body).Decode(&todosB)
	resp.Body.Close()
	if len(todosB) != 1 {
		t.Fatalf("Step 10 - expected 1 todo for User B, got %d", len(todosB))
	}
	if todosB[0].Title != "User B task" {
		t.Errorf("Step 10 - expected 'User B task', got '%s'", todosB[0].Title)
	}

	// 11. User B tries to delete User A's todo → 404
	delReq, _ := http.NewRequest(http.MethodDelete, baseURL+"/api/todos/"+strconv.FormatInt(createdTodoA.ID, 10), nil)
	delReq.Header.Set("Authorization", "Bearer "+tokenB)
	resp, err = client.Do(delReq)
	if err != nil {
		t.Fatalf("Step 11 - DELETE failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("Step 11 - expected 404, got %d", resp.StatusCode)
	}

	// 12. User A deletes their own todo → 204
	delReq, _ = http.NewRequest(http.MethodDelete, baseURL+"/api/todos/"+strconv.FormatInt(createdTodoA.ID, 10), nil)
	delReq.Header.Set("Authorization", "Bearer "+tokenA)
	resp, err = client.Do(delReq)
	if err != nil {
		t.Fatalf("Step 12 - DELETE failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("Step 12 - expected 204, got %d", resp.StatusCode)
	}

	// 13. User A lists → empty
	listReq, _ = http.NewRequest(http.MethodGet, baseURL+"/api/todos", nil)
	listReq.Header.Set("Authorization", "Bearer "+tokenA)
	resp, err = client.Do(listReq)
	if err != nil {
		t.Fatalf("Step 13 - GET failed: %v", err)
	}
	json.NewDecoder(resp.Body).Decode(&todosA)
	resp.Body.Close()
	if len(todosA) != 0 {
		t.Fatalf("Step 13 - expected 0 todos for User A, got %d", len(todosA))
	}
}
