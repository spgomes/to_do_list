package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

// --- Unit Tests (httptest.NewRecorder) ---

func TestHandleListTodos_Empty(t *testing.T) {
	db := setupTestDB(t)

	req := httptest.NewRequest(http.MethodGet, "/api/todos", nil)
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

	body := `{"title":"Buy milk"}`
	req := httptest.NewRequest(http.MethodPost, "/api/todos", bytes.NewBufferString(body))
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

	body := `{"title":""}`
	req := httptest.NewRequest(http.MethodPost, "/api/todos", bytes.NewBufferString(body))
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

	longTitle := strings.Repeat("a", MaxTitleLength+1)
	body := `{"title":"` + longTitle + `"}`
	req := httptest.NewRequest(http.MethodPost, "/api/todos", bytes.NewBufferString(body))
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

	body := `not valid json`
	req := httptest.NewRequest(http.MethodPost, "/api/todos", bytes.NewBufferString(body))
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

	todo, err := CreateTodo(db, "Test task")
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	body := `{"completed":true}`
	req := httptest.NewRequest(http.MethodPatch, "/api/todos/"+strconv.FormatInt(todo.ID, 10), bytes.NewBufferString(body))
	req.SetPathValue("id", strconv.FormatInt(todo.ID, 10))
	w := httptest.NewRecorder()

	handleUpdateTodo(db)(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", w.Code)
	}
}

func TestHandleUpdateTodo_NotFound(t *testing.T) {
	db := setupTestDB(t)

	body := `{"completed":true}`
	req := httptest.NewRequest(http.MethodPatch, "/api/todos/999", bytes.NewBufferString(body))
	req.SetPathValue("id", "999")
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

	body := `{"completed":true}`
	req := httptest.NewRequest(http.MethodPatch, "/api/todos/abc", bytes.NewBufferString(body))
	req.SetPathValue("id", "abc")
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

	todo, err := CreateTodo(db, "To be deleted")
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/todos/"+strconv.FormatInt(todo.ID, 10), nil)
	req.SetPathValue("id", strconv.FormatInt(todo.ID, 10))
	w := httptest.NewRecorder()

	handleDeleteTodo(db)(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", w.Code)
	}
}

func TestHandleDeleteTodo_NotFound(t *testing.T) {
	db := setupTestDB(t)

	req := httptest.NewRequest(http.MethodDelete, "/api/todos/999", nil)
	req.SetPathValue("id", "999")
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
		if headers != "Content-Type" {
			t.Errorf("expected Access-Control-Allow-Headers 'Content-Type', got '%s'", headers)
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

// --- Integration Test (httptest.NewServer + SQLite in-memory) ---

func TestAPIFullCRUDFlow(t *testing.T) {
	db := setupTestDB(t)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/todos", handleListTodos(db))
	mux.HandleFunc("POST /api/todos", handleCreateTodo(db))
	mux.HandleFunc("PATCH /api/todos/{id}", handleUpdateTodo(db))
	mux.HandleFunc("DELETE /api/todos/{id}", handleDeleteTodo(db))

	srv := httptest.NewServer(corsMiddleware(mux))
	defer srv.Close()

	client := srv.Client()
	baseURL := srv.URL

	// 1. GET /api/todos — should return empty array
	resp, err := client.Get(baseURL + "/api/todos")
	if err != nil {
		t.Fatalf("Step 1 - GET failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Step 1 - expected 200, got %d", resp.StatusCode)
	}
	var todos []Todo
	json.NewDecoder(resp.Body).Decode(&todos)
	resp.Body.Close()
	if len(todos) != 0 {
		t.Fatalf("Step 1 - expected 0 todos, got %d", len(todos))
	}

	// 2. POST /api/todos — create a todo
	createBody := `{"title":"Integration test task"}`
	resp, err = client.Post(baseURL+"/api/todos", "application/json", bytes.NewBufferString(createBody))
	if err != nil {
		t.Fatalf("Step 2 - POST failed: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Step 2 - expected 201, got %d", resp.StatusCode)
	}
	var createdTodo Todo
	json.NewDecoder(resp.Body).Decode(&createdTodo)
	resp.Body.Close()
	if createdTodo.Title != "Integration test task" {
		t.Errorf("Step 2 - expected title 'Integration test task', got '%s'", createdTodo.Title)
	}
	if createdTodo.ID == 0 {
		t.Error("Step 2 - expected non-zero ID")
	}

	// 3. GET /api/todos — should return 1 todo
	resp, err = client.Get(baseURL + "/api/todos")
	if err != nil {
		t.Fatalf("Step 3 - GET failed: %v", err)
	}
	json.NewDecoder(resp.Body).Decode(&todos)
	resp.Body.Close()
	if len(todos) != 1 {
		t.Fatalf("Step 3 - expected 1 todo, got %d", len(todos))
	}
	if todos[0].Completed {
		t.Error("Step 3 - expected todo to be pending")
	}

	// 4. PATCH /api/todos/{id} — mark as completed
	patchBody := `{"completed":true}`
	patchReq, _ := http.NewRequest(http.MethodPatch, baseURL+"/api/todos/"+strconv.FormatInt(createdTodo.ID, 10), bytes.NewBufferString(patchBody))
	patchReq.Header.Set("Content-Type", "application/json")
	resp, err = client.Do(patchReq)
	if err != nil {
		t.Fatalf("Step 4 - PATCH failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("Step 4 - expected 204, got %d", resp.StatusCode)
	}

	// 5. GET /api/todos — verify completed
	resp, err = client.Get(baseURL + "/api/todos")
	if err != nil {
		t.Fatalf("Step 5 - GET failed: %v", err)
	}
	json.NewDecoder(resp.Body).Decode(&todos)
	resp.Body.Close()
	if len(todos) != 1 {
		t.Fatalf("Step 5 - expected 1 todo, got %d", len(todos))
	}
	if !todos[0].Completed {
		t.Error("Step 5 - expected todo to be completed")
	}

	// 6. DELETE /api/todos/{id} — remove the todo
	delReq, _ := http.NewRequest(http.MethodDelete, baseURL+"/api/todos/"+strconv.FormatInt(createdTodo.ID, 10), nil)
	resp, err = client.Do(delReq)
	if err != nil {
		t.Fatalf("Step 6 - DELETE failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("Step 6 - expected 204, got %d", resp.StatusCode)
	}

	// 7. GET /api/todos — should be empty again
	resp, err = client.Get(baseURL + "/api/todos")
	if err != nil {
		t.Fatalf("Step 7 - GET failed: %v", err)
	}
	json.NewDecoder(resp.Body).Decode(&todos)
	resp.Body.Close()
	if len(todos) != 0 {
		t.Fatalf("Step 7 - expected 0 todos, got %d", len(todos))
	}
}
