package main

import (
	"database/sql"
	"errors"
	"strings"
	"testing"
)

// setupTestDB creates a fresh in-memory SQLite database for testing.
func setupTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := InitDB(":memory:")
	if err != nil {
		t.Fatalf("InitDB(:memory:) failed: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

// --- Unit Tests ---

func TestInitDB(t *testing.T) {
	db := setupTestDB(t)

	// Verify that the todos table exists by querying its schema
	var name string
	err := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='todos'").Scan(&name)
	if err != nil {
		t.Fatalf("expected todos table to exist, got error: %v", err)
	}
	if name != "todos" {
		t.Errorf("expected table name 'todos', got '%s'", name)
	}
}

func TestCreateTodo_Success(t *testing.T) {
	db := setupTestDB(t)

	todo, err := CreateTodo(db, "Buy groceries")
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	if todo.ID == 0 {
		t.Error("expected non-zero ID")
	}
	if todo.Title != "Buy groceries" {
		t.Errorf("expected title 'Buy groceries', got '%s'", todo.Title)
	}
	if todo.Completed {
		t.Error("expected new todo to be not completed")
	}
	if todo.CreatedAt == "" {
		t.Error("expected non-empty CreatedAt")
	}
}

func TestCreateTodo_EmptyTitle(t *testing.T) {
	db := setupTestDB(t)

	testCases := []struct {
		name  string
		title string
	}{
		{"empty string", ""},
		{"whitespace only", "   "},
		{"tab only", "\t"},
		{"newline only", "\n"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := CreateTodo(db, tc.title)
			if err == nil {
				t.Error("expected error for empty title, got nil")
			}
			if !errors.Is(err, ErrEmptyTitle) {
				t.Errorf("expected ErrEmptyTitle, got: %v", err)
			}
		})
	}
}

func TestCreateTodo_TitleTooLong(t *testing.T) {
	db := setupTestDB(t)

	longTitle := strings.Repeat("a", MaxTitleLength+1)
	_, err := CreateTodo(db, longTitle)
	if err == nil {
		t.Error("expected error for title exceeding max length, got nil")
	}
	if !errors.Is(err, ErrTitleTooLong) {
		t.Errorf("expected ErrTitleTooLong, got: %v", err)
	}
}

func TestCreateTodo_TitleAtMaxLength(t *testing.T) {
	db := setupTestDB(t)

	maxTitle := strings.Repeat("a", MaxTitleLength)
	todo, err := CreateTodo(db, maxTitle)
	if err != nil {
		t.Fatalf("CreateTodo with max length title failed: %v", err)
	}
	if len(todo.Title) != MaxTitleLength {
		t.Errorf("expected title length %d, got %d", MaxTitleLength, len(todo.Title))
	}
}

func TestGetAllTodos_Empty(t *testing.T) {
	db := setupTestDB(t)

	todos, err := GetAllTodos(db)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}

	if len(todos) != 0 {
		t.Errorf("expected 0 todos, got %d", len(todos))
	}

	// Verify it returns an empty slice, not nil
	if todos == nil {
		t.Error("expected empty slice, got nil")
	}
}

func TestGetAllTodos_MultipleTodos(t *testing.T) {
	db := setupTestDB(t)

	titles := []string{"First task", "Second task", "Third task"}
	for _, title := range titles {
		if _, err := CreateTodo(db, title); err != nil {
			t.Fatalf("CreateTodo(%q) failed: %v", title, err)
		}
	}

	todos, err := GetAllTodos(db)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}

	if len(todos) != 3 {
		t.Fatalf("expected 3 todos, got %d", len(todos))
	}

	// Verify ordering is by created_at DESC (most recent first).
	// Since all were created nearly simultaneously with the same datetime('now'),
	// the order may depend on insertion order. We at least verify all titles are present.
	foundTitles := make(map[string]bool)
	for _, todo := range todos {
		foundTitles[todo.Title] = true
	}
	for _, title := range titles {
		if !foundTitles[title] {
			t.Errorf("expected to find todo with title %q", title)
		}
	}
}

func TestUpdateTodoStatus_Success(t *testing.T) {
	db := setupTestDB(t)

	todo, err := CreateTodo(db, "Test task")
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	// Mark as completed
	if err := UpdateTodoStatus(db, todo.ID, true); err != nil {
		t.Fatalf("UpdateTodoStatus(completed=true) failed: %v", err)
	}

	// Verify with GetAllTodos
	todos, err := GetAllTodos(db)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}
	if len(todos) != 1 {
		t.Fatalf("expected 1 todo, got %d", len(todos))
	}
	if !todos[0].Completed {
		t.Error("expected todo to be completed")
	}

	// Revert back to pending
	if err := UpdateTodoStatus(db, todo.ID, false); err != nil {
		t.Fatalf("UpdateTodoStatus(completed=false) failed: %v", err)
	}

	todos, err = GetAllTodos(db)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}
	if todos[0].Completed {
		t.Error("expected todo to be pending after revert")
	}
}

func TestUpdateTodoStatus_NotFound(t *testing.T) {
	db := setupTestDB(t)

	err := UpdateTodoStatus(db, 999, true)
	if err == nil {
		t.Error("expected error for non-existent ID, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

func TestDeleteTodo_Success(t *testing.T) {
	db := setupTestDB(t)

	todo, err := CreateTodo(db, "To be deleted")
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	if err := DeleteTodo(db, todo.ID); err != nil {
		t.Fatalf("DeleteTodo failed: %v", err)
	}

	// Verify the todo no longer exists
	todos, err := GetAllTodos(db)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}
	if len(todos) != 0 {
		t.Errorf("expected 0 todos after deletion, got %d", len(todos))
	}
}

func TestDeleteTodo_NotFound(t *testing.T) {
	db := setupTestDB(t)

	err := DeleteTodo(db, 999)
	if err == nil {
		t.Error("expected error for non-existent ID, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

// --- Integration Test ---

func TestCRUDFlow(t *testing.T) {
	db := setupTestDB(t)

	// 1. List — should be empty
	todos, err := GetAllTodos(db)
	if err != nil {
		t.Fatalf("Step 1 - GetAllTodos failed: %v", err)
	}
	if len(todos) != 0 {
		t.Fatalf("Step 1 - expected 0 todos, got %d", len(todos))
	}

	// 2. Create two todos
	todo1, err := CreateTodo(db, "Task one")
	if err != nil {
		t.Fatalf("Step 2 - CreateTodo(Task one) failed: %v", err)
	}
	todo2, err := CreateTodo(db, "Task two")
	if err != nil {
		t.Fatalf("Step 2 - CreateTodo(Task two) failed: %v", err)
	}

	// 3. List — should have 2 todos
	todos, err = GetAllTodos(db)
	if err != nil {
		t.Fatalf("Step 3 - GetAllTodos failed: %v", err)
	}
	if len(todos) != 2 {
		t.Fatalf("Step 3 - expected 2 todos, got %d", len(todos))
	}

	// 4. Mark todo1 as completed
	if err := UpdateTodoStatus(db, todo1.ID, true); err != nil {
		t.Fatalf("Step 4 - UpdateTodoStatus failed: %v", err)
	}

	// 5. Verify todo1 is completed
	todos, err = GetAllTodos(db)
	if err != nil {
		t.Fatalf("Step 5 - GetAllTodos failed: %v", err)
	}
	for _, todo := range todos {
		if todo.ID == todo1.ID && !todo.Completed {
			t.Error("Step 5 - expected todo1 to be completed")
		}
		if todo.ID == todo2.ID && todo.Completed {
			t.Error("Step 5 - expected todo2 to still be pending")
		}
	}

	// 6. Delete todo1
	if err := DeleteTodo(db, todo1.ID); err != nil {
		t.Fatalf("Step 6 - DeleteTodo(todo1) failed: %v", err)
	}

	// 7. Verify only todo2 remains
	todos, err = GetAllTodos(db)
	if err != nil {
		t.Fatalf("Step 7 - GetAllTodos failed: %v", err)
	}
	if len(todos) != 1 {
		t.Fatalf("Step 7 - expected 1 todo, got %d", len(todos))
	}
	if todos[0].ID != todo2.ID {
		t.Errorf("Step 7 - expected remaining todo to be todo2 (ID=%d), got ID=%d", todo2.ID, todos[0].ID)
	}

	// 8. Delete todo2
	if err := DeleteTodo(db, todo2.ID); err != nil {
		t.Fatalf("Step 8 - DeleteTodo(todo2) failed: %v", err)
	}

	// 9. List — should be empty again
	todos, err = GetAllTodos(db)
	if err != nil {
		t.Fatalf("Step 9 - GetAllTodos failed: %v", err)
	}
	if len(todos) != 0 {
		t.Fatalf("Step 9 - expected 0 todos, got %d", len(todos))
	}
}
