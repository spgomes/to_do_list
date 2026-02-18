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

// createTestUser is a helper that creates a user and returns the user.
func createTestUser(t *testing.T, db *sql.DB, email, passwordHash string) User {
	t.Helper()
	user, err := CreateUser(db, email, passwordHash)
	if err != nil {
		t.Fatalf("CreateUser(%q) failed: %v", email, err)
	}
	return user
}

// --- InitDB Tests ---

func TestInitDB(t *testing.T) {
	db := setupTestDB(t)

	// Verify that the todos table exists
	var name string
	err := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='todos'").Scan(&name)
	if err != nil {
		t.Fatalf("expected todos table to exist, got error: %v", err)
	}
	if name != "todos" {
		t.Errorf("expected table name 'todos', got '%s'", name)
	}

	// Verify that the users table exists
	err = db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").Scan(&name)
	if err != nil {
		t.Fatalf("expected users table to exist, got error: %v", err)
	}
	if name != "users" {
		t.Errorf("expected table name 'users', got '%s'", name)
	}
}

// --- User Tests ---

func TestCreateUser_Success(t *testing.T) {
	db := setupTestDB(t)

	user, err := CreateUser(db, "test@example.com", "$2a$10$hashedpassword")
	if err != nil {
		t.Fatalf("CreateUser failed: %v", err)
	}

	if user.ID == 0 {
		t.Error("expected non-zero ID")
	}
	if user.Email != "test@example.com" {
		t.Errorf("expected email 'test@example.com', got '%s'", user.Email)
	}
	if user.PasswordHash != "$2a$10$hashedpassword" {
		t.Errorf("expected password hash to match")
	}
	if user.CreatedAt == "" {
		t.Error("expected non-empty CreatedAt")
	}
}

func TestCreateUser_DuplicateEmail(t *testing.T) {
	db := setupTestDB(t)

	_, err := CreateUser(db, "dup@example.com", "hash1")
	if err != nil {
		t.Fatalf("first CreateUser failed: %v", err)
	}

	_, err = CreateUser(db, "dup@example.com", "hash2")
	if err == nil {
		t.Error("expected error for duplicate email, got nil")
	}
	if !errors.Is(err, ErrDuplicateEmail) {
		t.Errorf("expected ErrDuplicateEmail, got: %v", err)
	}
}

func TestCreateUser_EmptyEmail(t *testing.T) {
	db := setupTestDB(t)

	// SQLite will reject empty email since it's NOT NULL but not checked at Go level;
	// The handler validates this, but the DB function accepts whatever is given.
	// We test the handler validation separately.
	user, err := CreateUser(db, "", "somehash")
	if err != nil {
		// acceptable - DB constraint might reject it
		return
	}
	if user.Email != "" {
		t.Errorf("expected empty email, got '%s'", user.Email)
	}
}

func TestGetUserByEmail_Found(t *testing.T) {
	db := setupTestDB(t)

	created, err := CreateUser(db, "find@example.com", "hashvalue")
	if err != nil {
		t.Fatalf("CreateUser failed: %v", err)
	}

	found, err := GetUserByEmail(db, "find@example.com")
	if err != nil {
		t.Fatalf("GetUserByEmail failed: %v", err)
	}

	if found.ID != created.ID {
		t.Errorf("expected ID %d, got %d", created.ID, found.ID)
	}
	if found.Email != "find@example.com" {
		t.Errorf("expected email 'find@example.com', got '%s'", found.Email)
	}
	if found.PasswordHash != "hashvalue" {
		t.Errorf("expected password hash 'hashvalue', got '%s'", found.PasswordHash)
	}
}

func TestGetUserByEmail_NotFound(t *testing.T) {
	db := setupTestDB(t)

	_, err := GetUserByEmail(db, "notexist@example.com")
	if err == nil {
		t.Error("expected error for non-existent email, got nil")
	}
	if !errors.Is(err, ErrUserNotFound) {
		t.Errorf("expected ErrUserNotFound, got: %v", err)
	}
}

// --- Todo CRUD Tests with userID ---

func TestCreateTodo_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Buy groceries", user.ID)
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
	if todo.UserID != user.ID {
		t.Errorf("expected UserID %d, got %d", user.ID, todo.UserID)
	}
}

func TestCreateTodo_EmptyTitle(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

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
			_, err := CreateTodo(db, tc.title, user.ID)
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
	user := createTestUser(t, db, "user@test.com", "hash")

	longTitle := strings.Repeat("a", MaxTitleLength+1)
	_, err := CreateTodo(db, longTitle, user.ID)
	if err == nil {
		t.Error("expected error for title exceeding max length, got nil")
	}
	if !errors.Is(err, ErrTitleTooLong) {
		t.Errorf("expected ErrTitleTooLong, got: %v", err)
	}
}

func TestCreateTodo_TitleAtMaxLength(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	maxTitle := strings.Repeat("a", MaxTitleLength)
	todo, err := CreateTodo(db, maxTitle, user.ID)
	if err != nil {
		t.Fatalf("CreateTodo with max length title failed: %v", err)
	}
	if len(todo.Title) != MaxTitleLength {
		t.Errorf("expected title length %d, got %d", MaxTitleLength, len(todo.Title))
	}
}

func TestGetAllTodos_Empty(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todos, err := GetAllTodos(db, user.ID)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}

	if len(todos) != 0 {
		t.Errorf("expected 0 todos, got %d", len(todos))
	}

	if todos == nil {
		t.Error("expected empty slice, got nil")
	}
}

func TestGetAllTodos_MultipleTodos(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	titles := []string{"First task", "Second task", "Third task"}
	for _, title := range titles {
		if _, err := CreateTodo(db, title, user.ID); err != nil {
			t.Fatalf("CreateTodo(%q) failed: %v", title, err)
		}
	}

	todos, err := GetAllTodos(db, user.ID)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}

	if len(todos) != 3 {
		t.Fatalf("expected 3 todos, got %d", len(todos))
	}

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

func TestGetAllTodos_UserIsolation(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db, "user1@test.com", "hash1")
	user2 := createTestUser(t, db, "user2@test.com", "hash2")

	CreateTodo(db, "User1 Task A", user1.ID)
	CreateTodo(db, "User1 Task B", user1.ID)
	CreateTodo(db, "User2 Task C", user2.ID)

	todos1, err := GetAllTodos(db, user1.ID)
	if err != nil {
		t.Fatalf("GetAllTodos(user1) failed: %v", err)
	}
	if len(todos1) != 2 {
		t.Errorf("expected 2 todos for user1, got %d", len(todos1))
	}

	todos2, err := GetAllTodos(db, user2.ID)
	if err != nil {
		t.Fatalf("GetAllTodos(user2) failed: %v", err)
	}
	if len(todos2) != 1 {
		t.Errorf("expected 1 todo for user2, got %d", len(todos2))
	}
	if todos2[0].Title != "User2 Task C" {
		t.Errorf("expected 'User2 Task C', got '%s'", todos2[0].Title)
	}
}

func TestUpdateTodoStatus_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	if err := UpdateTodoStatus(db, todo.ID, true, user.ID); err != nil {
		t.Fatalf("UpdateTodoStatus(completed=true) failed: %v", err)
	}

	todos, err := GetAllTodos(db, user.ID)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}
	if len(todos) != 1 {
		t.Fatalf("expected 1 todo, got %d", len(todos))
	}
	if !todos[0].Completed {
		t.Error("expected todo to be completed")
	}

	if err := UpdateTodoStatus(db, todo.ID, false, user.ID); err != nil {
		t.Fatalf("UpdateTodoStatus(completed=false) failed: %v", err)
	}

	todos, err = GetAllTodos(db, user.ID)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}
	if todos[0].Completed {
		t.Error("expected todo to be pending after revert")
	}
}

func TestUpdateTodoStatus_NotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	err := UpdateTodoStatus(db, 999, true, user.ID)
	if err == nil {
		t.Error("expected error for non-existent ID, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

func TestUpdateTodoStatus_WrongUser(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db, "user1@test.com", "hash1")
	user2 := createTestUser(t, db, "user2@test.com", "hash2")

	todo, err := CreateTodo(db, "User1 task", user1.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	err = UpdateTodoStatus(db, todo.ID, true, user2.ID)
	if err == nil {
		t.Error("expected error when wrong user tries to update, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

func TestDeleteTodo_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "To be deleted", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	if err := DeleteTodo(db, todo.ID, user.ID); err != nil {
		t.Fatalf("DeleteTodo failed: %v", err)
	}

	todos, err := GetAllTodos(db, user.ID)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}
	if len(todos) != 0 {
		t.Errorf("expected 0 todos after deletion, got %d", len(todos))
	}
}

func TestDeleteTodo_NotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	err := DeleteTodo(db, 999, user.ID)
	if err == nil {
		t.Error("expected error for non-existent ID, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

func TestDeleteTodo_WrongUser(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db, "user1@test.com", "hash1")
	user2 := createTestUser(t, db, "user2@test.com", "hash2")

	todo, err := CreateTodo(db, "User1 task", user1.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	err = DeleteTodo(db, todo.ID, user2.ID)
	if err == nil {
		t.Error("expected error when wrong user tries to delete, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}

	// Verify the todo still exists for user1
	todos, err := GetAllTodos(db, user1.ID)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}
	if len(todos) != 1 {
		t.Errorf("expected 1 todo still exists for user1, got %d", len(todos))
	}
}

// --- Soft Delete Tests ---

func TestSoftDeleteTodo_HidesFromList(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "To be soft deleted", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	if err := DeleteTodo(db, todo.ID, user.ID); err != nil {
		t.Fatalf("DeleteTodo failed: %v", err)
	}

	todos, err := GetAllTodos(db, user.ID)
	if err != nil {
		t.Fatalf("GetAllTodos failed: %v", err)
	}
	if len(todos) != 0 {
		t.Errorf("expected 0 todos after soft delete, got %d", len(todos))
	}
}

func TestSoftDeleteTodo_RecordPersists(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Persistent record", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	if err := DeleteTodo(db, todo.ID, user.ID); err != nil {
		t.Fatalf("DeleteTodo failed: %v", err)
	}

	// Verify the record still exists in the database with deleted_at set
	var deletedAt sql.NullString
	err = db.QueryRow("SELECT deleted_at FROM todos WHERE id = ?", todo.ID).Scan(&deletedAt)
	if err != nil {
		t.Fatalf("QueryRow failed: %v", err)
	}
	if !deletedAt.Valid {
		t.Error("expected deleted_at to be set, got NULL")
	}
}

func TestSoftDeleteTodo_NotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	err := DeleteTodo(db, 999, user.ID)
	if err == nil {
		t.Error("expected error for non-existent ID, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

// --- UpdateTodoTitle Tests ---

func TestUpdateTodoTitle_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Original title", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	if err := UpdateTodoTitle(db, todo.ID, "Updated title", user.ID); err != nil {
		t.Fatalf("UpdateTodoTitle failed: %v", err)
	}

	// Verify with direct query
	var title string
	err = db.QueryRow("SELECT title FROM todos WHERE id = ?", todo.ID).Scan(&title)
	if err != nil {
		t.Fatalf("QueryRow failed: %v", err)
	}
	if title != "Updated title" {
		t.Errorf("expected title 'Updated title', got '%s'", title)
	}
}

func TestUpdateTodoTitle_EmptyTitle(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Some title", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	err = UpdateTodoTitle(db, todo.ID, "", user.ID)
	if err == nil {
		t.Error("expected error for empty title, got nil")
	}
	if !errors.Is(err, ErrEmptyTitle) {
		t.Errorf("expected ErrEmptyTitle, got: %v", err)
	}
}

func TestUpdateTodoTitle_TooLong(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Some title", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	longTitle := strings.Repeat("a", MaxTitleLength+1)
	err = UpdateTodoTitle(db, todo.ID, longTitle, user.ID)
	if err == nil {
		t.Error("expected error for title too long, got nil")
	}
	if !errors.Is(err, ErrTitleTooLong) {
		t.Errorf("expected ErrTitleTooLong, got: %v", err)
	}
}

func TestUpdateTodoTitle_WrongUser(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db, "user1@test.com", "hash1")
	user2 := createTestUser(t, db, "user2@test.com", "hash2")

	todo, err := CreateTodo(db, "User1 task", user1.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	err = UpdateTodoTitle(db, todo.ID, "Hijacked title", user2.ID)
	if err == nil {
		t.Error("expected error when wrong user tries to update title, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

// --- Integration Test ---

func TestCRUDFlow(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	// 1. List — should be empty
	todos, err := GetAllTodos(db, user.ID)
	if err != nil {
		t.Fatalf("Step 1 - GetAllTodos failed: %v", err)
	}
	if len(todos) != 0 {
		t.Fatalf("Step 1 - expected 0 todos, got %d", len(todos))
	}

	// 2. Create two todos
	todo1, err := CreateTodo(db, "Task one", user.ID)
	if err != nil {
		t.Fatalf("Step 2 - CreateTodo(Task one) failed: %v", err)
	}
	todo2, err := CreateTodo(db, "Task two", user.ID)
	if err != nil {
		t.Fatalf("Step 2 - CreateTodo(Task two) failed: %v", err)
	}

	// 3. List — should have 2 todos
	todos, err = GetAllTodos(db, user.ID)
	if err != nil {
		t.Fatalf("Step 3 - GetAllTodos failed: %v", err)
	}
	if len(todos) != 2 {
		t.Fatalf("Step 3 - expected 2 todos, got %d", len(todos))
	}

	// 4. Mark todo1 as completed
	if err := UpdateTodoStatus(db, todo1.ID, true, user.ID); err != nil {
		t.Fatalf("Step 4 - UpdateTodoStatus failed: %v", err)
	}

	// 5. Verify todo1 is completed
	todos, err = GetAllTodos(db, user.ID)
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
	if err := DeleteTodo(db, todo1.ID, user.ID); err != nil {
		t.Fatalf("Step 6 - DeleteTodo(todo1) failed: %v", err)
	}

	// 7. Verify only todo2 remains
	todos, err = GetAllTodos(db, user.ID)
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
	if err := DeleteTodo(db, todo2.ID, user.ID); err != nil {
		t.Fatalf("Step 8 - DeleteTodo(todo2) failed: %v", err)
	}

	// 9. List — should be empty again
	todos, err = GetAllTodos(db, user.ID)
	if err != nil {
		t.Fatalf("Step 9 - GetAllTodos failed: %v", err)
	}
	if len(todos) != 0 {
		t.Fatalf("Step 9 - expected 0 todos, got %d", len(todos))
	}
}

// --- Tag Tests ---

func TestInitDB_CreatesTagsTables(t *testing.T) {
	db := setupTestDB(t)

	// Verify that the tags table exists
	var name string
	err := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'").Scan(&name)
	if err != nil {
		t.Fatalf("expected tags table to exist, got error: %v", err)
	}
	if name != "tags" {
		t.Errorf("expected table name 'tags', got '%s'", name)
	}

	// Verify that the todo_tags table exists
	err = db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='todo_tags'").Scan(&name)
	if err != nil {
		t.Fatalf("expected todo_tags table to exist, got error: %v", err)
	}
	if name != "todo_tags" {
		t.Errorf("expected table name 'todo_tags', got '%s'", name)
	}
}

func TestCreateTag_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	tag, err := CreateTag(db, "work", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	if tag.ID == 0 {
		t.Error("expected non-zero ID")
	}
	if tag.Name != "work" {
		t.Errorf("expected name 'work', got '%s'", tag.Name)
	}
	if tag.CreatedAt == "" {
		t.Error("expected non-empty CreatedAt")
	}
	if tag.UserID != user.ID {
		t.Errorf("expected UserID %d, got %d", user.ID, tag.UserID)
	}
}

func TestCreateTag_EmptyName(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	testCases := []struct {
		name string
		tagName string
	}{
		{"empty string", ""},
		{"whitespace only", "   "},
		{"tab only", "\t"},
		{"newline only", "\n"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := CreateTag(db, tc.tagName, user.ID)
			if err == nil {
				t.Error("expected error for empty tag name, got nil")
			}
			if !errors.Is(err, ErrEmptyTagName) {
				t.Errorf("expected ErrEmptyTagName, got: %v", err)
			}
		})
	}
}

func TestCreateTag_NameTooLong(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	longName := strings.Repeat("a", MaxTagNameLength+1)
	_, err := CreateTag(db, longName, user.ID)
	if err == nil {
		t.Error("expected error for tag name exceeding max length, got nil")
	}
	if !errors.Is(err, ErrTagNameTooLong) {
		t.Errorf("expected ErrTagNameTooLong, got: %v", err)
	}
}

func TestCreateTag_NameAtMaxLength(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	maxName := strings.Repeat("a", MaxTagNameLength)
	tag, err := CreateTag(db, maxName, user.ID)
	if err != nil {
		t.Fatalf("CreateTag with max length name failed: %v", err)
	}
	if len(tag.Name) != MaxTagNameLength {
		t.Errorf("expected tag name length %d, got %d", MaxTagNameLength, len(tag.Name))
	}
}

func TestCreateTag_DuplicateName(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	_, err := CreateTag(db, "duplicate", user.ID)
	if err != nil {
		t.Fatalf("first CreateTag failed: %v", err)
	}

	_, err = CreateTag(db, "duplicate", user.ID)
	if err == nil {
		t.Error("expected error for duplicate tag name, got nil")
	}
	if !errors.Is(err, ErrDuplicateTag) {
		t.Errorf("expected ErrDuplicateTag, got: %v", err)
	}
}

func TestCreateTag_TrimsWhitespace(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	tag, err := CreateTag(db, "  work  ", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}
	if tag.Name != "work" {
		t.Errorf("expected trimmed name 'work', got '%s'", tag.Name)
	}
}

func TestListTags_Empty(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	tags, err := ListTags(db, user.ID)
	if err != nil {
		t.Fatalf("ListTags failed: %v", err)
	}

	if len(tags) != 0 {
		t.Errorf("expected 0 tags, got %d", len(tags))
	}

	if tags == nil {
		t.Error("expected empty slice, got nil")
	}
}

func TestListTags_MultipleTags(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	names := []string{"work", "home", "personal"}
	for _, name := range names {
		if _, err := CreateTag(db, name, user.ID); err != nil {
			t.Fatalf("CreateTag(%q) failed: %v", name, err)
		}
	}

	tags, err := ListTags(db, user.ID)
	if err != nil {
		t.Fatalf("ListTags failed: %v", err)
	}

	if len(tags) != 3 {
		t.Fatalf("expected 3 tags, got %d", len(tags))
	}

	foundNames := make(map[string]bool)
	for _, tag := range tags {
		foundNames[tag.Name] = true
	}
	for _, name := range names {
		if !foundNames[name] {
			t.Errorf("expected to find tag with name %q", name)
		}
	}
}

func TestListTags_UserIsolation(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db, "user1@test.com", "hash1")
	user2 := createTestUser(t, db, "user2@test.com", "hash2")

	CreateTag(db, "User1 Tag", user1.ID)
	CreateTag(db, "User2 Tag", user2.ID)

	tags1, err := ListTags(db, user1.ID)
	if err != nil {
		t.Fatalf("ListTags(user1) failed: %v", err)
	}
	if len(tags1) != 1 {
		t.Errorf("expected 1 tag for user1, got %d", len(tags1))
	}
	if tags1[0].Name != "User1 Tag" {
		t.Errorf("expected 'User1 Tag', got '%s'", tags1[0].Name)
	}

	tags2, err := ListTags(db, user2.ID)
	if err != nil {
		t.Fatalf("ListTags(user2) failed: %v", err)
	}
	if len(tags2) != 1 {
		t.Errorf("expected 1 tag for user2, got %d", len(tags2))
	}
	if tags2[0].Name != "User2 Tag" {
		t.Errorf("expected 'User2 Tag', got '%s'", tags2[0].Name)
	}
}

func TestUpdateTagName_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	tag, err := CreateTag(db, "oldname", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	if err := UpdateTagName(db, tag.ID, "newname", user.ID); err != nil {
		t.Fatalf("UpdateTagName failed: %v", err)
	}

	// Verify with direct query
	var name string
	err = db.QueryRow("SELECT name FROM tags WHERE id = ?", tag.ID).Scan(&name)
	if err != nil {
		t.Fatalf("QueryRow failed: %v", err)
	}
	if name != "newname" {
		t.Errorf("expected name 'newname', got '%s'", name)
	}
}

func TestUpdateTagName_EmptyName(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	tag, err := CreateTag(db, "somename", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	err = UpdateTagName(db, tag.ID, "", user.ID)
	if err == nil {
		t.Error("expected error for empty name, got nil")
	}
	if !errors.Is(err, ErrEmptyTagName) {
		t.Errorf("expected ErrEmptyTagName, got: %v", err)
	}
}

func TestUpdateTagName_TooLong(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	tag, err := CreateTag(db, "somename", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	longName := strings.Repeat("a", MaxTagNameLength+1)
	err = UpdateTagName(db, tag.ID, longName, user.ID)
	if err == nil {
		t.Error("expected error for name too long, got nil")
	}
	if !errors.Is(err, ErrTagNameTooLong) {
		t.Errorf("expected ErrTagNameTooLong, got: %v", err)
	}
}

func TestUpdateTagName_DuplicateName(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	_, err := CreateTag(db, "tag1", user.ID)
	if err != nil {
		t.Fatalf("CreateTag(tag1) failed: %v", err)
	}

	tag2, err := CreateTag(db, "tag2", user.ID)
	if err != nil {
		t.Fatalf("CreateTag(tag2) failed: %v", err)
	}

	// Try to rename tag2 to tag1
	err = UpdateTagName(db, tag2.ID, "tag1", user.ID)
	if err == nil {
		t.Error("expected error for duplicate name, got nil")
	}
	if !errors.Is(err, ErrDuplicateTag) {
		t.Errorf("expected ErrDuplicateTag, got: %v", err)
	}
}

func TestUpdateTagName_WrongUser(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db, "user1@test.com", "hash1")
	user2 := createTestUser(t, db, "user2@test.com", "hash2")

	tag, err := CreateTag(db, "User1 Tag", user1.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	err = UpdateTagName(db, tag.ID, "Hijacked", user2.ID)
	if err == nil {
		t.Error("expected error when wrong user tries to update, got nil")
	}
	if !errors.Is(err, ErrTagNotFound) {
		t.Errorf("expected ErrTagNotFound, got: %v", err)
	}
}

func TestDeleteTag_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	tag, err := CreateTag(db, "To be deleted", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	if err := DeleteTag(db, tag.ID, user.ID); err != nil {
		t.Fatalf("DeleteTag failed: %v", err)
	}

	tags, err := ListTags(db, user.ID)
	if err != nil {
		t.Fatalf("ListTags failed: %v", err)
	}
	if len(tags) != 0 {
		t.Errorf("expected 0 tags after deletion, got %d", len(tags))
	}
}

func TestDeleteTag_NotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	err := DeleteTag(db, 999, user.ID)
	if err == nil {
		t.Error("expected error for non-existent ID, got nil")
	}
	if !errors.Is(err, ErrTagNotFound) {
		t.Errorf("expected ErrTagNotFound, got: %v", err)
	}
}

func TestDeleteTag_WrongUser(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db, "user1@test.com", "hash1")
	user2 := createTestUser(t, db, "user2@test.com", "hash2")

	tag, err := CreateTag(db, "User1 Tag", user1.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	err = DeleteTag(db, tag.ID, user2.ID)
	if err == nil {
		t.Error("expected error when wrong user tries to delete, got nil")
	}
	if !errors.Is(err, ErrTagNotFound) {
		t.Errorf("expected ErrTagNotFound, got: %v", err)
	}

	// Verify the tag still exists for user1
	tags, err := ListTags(db, user1.ID)
	if err != nil {
		t.Fatalf("ListTags failed: %v", err)
	}
	if len(tags) != 1 {
		t.Errorf("expected 1 tag still exists for user1, got %d", len(tags))
	}
}

// --- Todo-Tag Relationship Tests ---

func TestAddTagToTodo_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	tag, err := CreateTag(db, "work", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	if err := AddTagToTodo(db, todo.ID, tag.ID, user.ID); err != nil {
		t.Fatalf("AddTagToTodo failed: %v", err)
	}

	// Verify the association
	tags, err := ListTodoTags(db, todo.ID, user.ID)
	if err != nil {
		t.Fatalf("ListTodoTags failed: %v", err)
	}
	if len(tags) != 1 {
		t.Fatalf("expected 1 tag, got %d", len(tags))
	}
	if tags[0].ID != tag.ID {
		t.Errorf("expected tag ID %d, got %d", tag.ID, tags[0].ID)
	}
}

func TestAddTagToTodo_Idempotent(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	tag, err := CreateTag(db, "work", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	// Add the same tag twice
	if err := AddTagToTodo(db, todo.ID, tag.ID, user.ID); err != nil {
		t.Fatalf("first AddTagToTodo failed: %v", err)
	}
	if err := AddTagToTodo(db, todo.ID, tag.ID, user.ID); err != nil {
		t.Fatalf("second AddTagToTodo failed: %v", err)
	}

	// Verify only one association exists
	tags, err := ListTodoTags(db, todo.ID, user.ID)
	if err != nil {
		t.Fatalf("ListTodoTags failed: %v", err)
	}
	if len(tags) != 1 {
		t.Fatalf("expected 1 tag (idempotent), got %d", len(tags))
	}
}

func TestAddTagToTodo_TodoNotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	tag, err := CreateTag(db, "work", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	err = AddTagToTodo(db, 999, tag.ID, user.ID)
	if err == nil {
		t.Error("expected error for non-existent todo, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

func TestAddTagToTodo_TagNotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	err = AddTagToTodo(db, todo.ID, 999, user.ID)
	if err == nil {
		t.Error("expected error for non-existent tag, got nil")
	}
	if !errors.Is(err, ErrTagNotFound) {
		t.Errorf("expected ErrTagNotFound, got: %v", err)
	}
}

func TestAddTagToTodo_WrongUser(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db, "user1@test.com", "hash1")
	user2 := createTestUser(t, db, "user2@test.com", "hash2")

	todo, err := CreateTodo(db, "User1 task", user1.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	tag, err := CreateTag(db, "User2 tag", user2.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	err = AddTagToTodo(db, todo.ID, tag.ID, user1.ID)
	if err == nil {
		t.Error("expected error when tag belongs to different user, got nil")
	}
	if !errors.Is(err, ErrTagNotFound) {
		t.Errorf("expected ErrTagNotFound, got: %v", err)
	}
}

func TestRemoveTagFromTodo_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	tag, err := CreateTag(db, "work", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	if err := AddTagToTodo(db, todo.ID, tag.ID, user.ID); err != nil {
		t.Fatalf("AddTagToTodo failed: %v", err)
	}

	if err := RemoveTagFromTodo(db, todo.ID, tag.ID, user.ID); err != nil {
		t.Fatalf("RemoveTagFromTodo failed: %v", err)
	}

	// Verify the association is removed
	tags, err := ListTodoTags(db, todo.ID, user.ID)
	if err != nil {
		t.Fatalf("ListTodoTags failed: %v", err)
	}
	if len(tags) != 0 {
		t.Errorf("expected 0 tags after removal, got %d", len(tags))
	}
}

func TestRemoveTagFromTodo_NotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	tag, err := CreateTag(db, "work", user.ID)
	if err != nil {
		t.Fatalf("CreateTag failed: %v", err)
	}

	err = RemoveTagFromTodo(db, todo.ID, tag.ID, user.ID)
	if err == nil {
		t.Error("expected error for non-existent association, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

func TestListTodoTags_Empty(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	tags, err := ListTodoTags(db, todo.ID, user.ID)
	if err != nil {
		t.Fatalf("ListTodoTags failed: %v", err)
	}

	if len(tags) != 0 {
		t.Errorf("expected 0 tags, got %d", len(tags))
	}

	if tags == nil {
		t.Error("expected empty slice, got nil")
	}
}

func TestListTodoTags_MultipleTags(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	tag1, err := CreateTag(db, "work", user.ID)
	if err != nil {
		t.Fatalf("CreateTag(work) failed: %v", err)
	}

	tag2, err := CreateTag(db, "urgent", user.ID)
	if err != nil {
		t.Fatalf("CreateTag(urgent) failed: %v", err)
	}

	if err := AddTagToTodo(db, todo.ID, tag1.ID, user.ID); err != nil {
		t.Fatalf("AddTagToTodo(tag1) failed: %v", err)
	}
	if err := AddTagToTodo(db, todo.ID, tag2.ID, user.ID); err != nil {
		t.Fatalf("AddTagToTodo(tag2) failed: %v", err)
	}

	tags, err := ListTodoTags(db, todo.ID, user.ID)
	if err != nil {
		t.Fatalf("ListTodoTags failed: %v", err)
	}

	if len(tags) != 2 {
		t.Fatalf("expected 2 tags, got %d", len(tags))
	}

	foundIDs := make(map[int64]bool)
	for _, tag := range tags {
		foundIDs[tag.ID] = true
	}
	if !foundIDs[tag1.ID] {
		t.Error("expected to find tag1")
	}
	if !foundIDs[tag2.ID] {
		t.Error("expected to find tag2")
	}
}

func TestListTodoTags_TodoNotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	_, err := ListTodoTags(db, 999, user.ID)
	if err == nil {
		t.Error("expected error for non-existent todo, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

func TestListTodoTags_WrongUser(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db, "user1@test.com", "hash1")
	user2 := createTestUser(t, db, "user2@test.com", "hash2")

	todo, err := CreateTodo(db, "User1 task", user1.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	_, err = ListTodoTags(db, todo.ID, user2.ID)
	if err == nil {
		t.Error("expected error when wrong user tries to list tags, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

func TestListTodoTags_DeletedTodo(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	if err := DeleteTodo(db, todo.ID, user.ID); err != nil {
		t.Fatalf("DeleteTodo failed: %v", err)
	}

	_, err = ListTodoTags(db, todo.ID, user.ID)
	if err == nil {
		t.Error("expected error for deleted todo, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

// --- List Tests ---

func TestInitDB_CreatesListsTables(t *testing.T) {
	db := setupTestDB(t)

	var name string
	err := db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='lists'").Scan(&name)
	if err != nil {
		t.Fatalf("expected lists table to exist, got error: %v", err)
	}
	if name != "lists" {
		t.Errorf("expected table name 'lists', got '%s'", name)
	}

	err = db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='todo_lists'").Scan(&name)
	if err != nil {
		t.Fatalf("expected todo_lists table to exist, got error: %v", err)
	}
	if name != "todo_lists" {
		t.Errorf("expected table name 'todo_lists', got '%s'", name)
	}
}

func TestCreateList_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	list, err := CreateList(db, "work", "#F8BBD9", user.ID)
	if err != nil {
		t.Fatalf("CreateList failed: %v", err)
	}

	if list.ID == 0 {
		t.Error("expected non-zero ID")
	}
	if list.Name != "work" {
		t.Errorf("expected name 'work', got '%s'", list.Name)
	}
	if list.Color != "#F8BBD9" {
		t.Errorf("expected color '#F8BBD9', got '%s'", list.Color)
	}
	if list.CreatedAt == "" {
		t.Error("expected non-empty CreatedAt")
	}
	if list.UserID != user.ID {
		t.Errorf("expected UserID %d, got %d", user.ID, list.UserID)
	}
}

func TestCreateList_EmptyName(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	testCases := []struct {
		name  string
		input string
	}{
		{"empty string", ""},
		{"whitespace only", "   "},
		{"tab only", "\t"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := CreateList(db, tc.input, "#F8BBD9", user.ID)
			if err == nil {
				t.Error("expected error for empty list name, got nil")
			}
			if !errors.Is(err, ErrEmptyListName) {
				t.Errorf("expected ErrEmptyListName, got: %v", err)
			}
		})
	}
}

func TestCreateList_NameTooLong(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	longName := strings.Repeat("a", MaxListNameLength+1)
	_, err := CreateList(db, longName, "#F8BBD9", user.ID)
	if err == nil {
		t.Error("expected error for list name exceeding max length, got nil")
	}
	if !errors.Is(err, ErrListNameTooLong) {
		t.Errorf("expected ErrListNameTooLong, got: %v", err)
	}
}

func TestCreateList_DuplicateName(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	_, err := CreateList(db, "duplicate", "#F8BBD9", user.ID)
	if err != nil {
		t.Fatalf("first CreateList failed: %v", err)
	}

	_, err = CreateList(db, "duplicate", "#E1BEE7", user.ID)
	if err == nil {
		t.Error("expected error for duplicate list name, got nil")
	}
	if !errors.Is(err, ErrDuplicateList) {
		t.Errorf("expected ErrDuplicateList, got: %v", err)
	}
}

func TestCreateList_InvalidColor(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	_, err := CreateList(db, "work", "#000000", user.ID)
	if err == nil {
		t.Error("expected error for invalid color, got nil")
	}
	if !errors.Is(err, ErrInvalidColor) {
		t.Errorf("expected ErrInvalidColor, got: %v", err)
	}
}

func TestCreateList_DefaultColorWhenEmpty(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	list, err := CreateList(db, "work", "", user.ID)
	if err != nil {
		t.Fatalf("CreateList with empty color failed: %v", err)
	}
	if list.Color != DefaultListColor {
		t.Errorf("expected default color %s, got '%s'", DefaultListColor, list.Color)
	}
}

func TestListLists_Empty(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	lists, err := ListLists(db, user.ID)
	if err != nil {
		t.Fatalf("ListLists failed: %v", err)
	}
	if len(lists) != 0 {
		t.Errorf("expected 0 lists, got %d", len(lists))
	}
	if lists == nil {
		t.Error("expected empty slice, got nil")
	}
}

func TestListLists_UserIsolation(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db, "user1@test.com", "hash1")
	user2 := createTestUser(t, db, "user2@test.com", "hash2")

	CreateList(db, "User1 List", "#F8BBD9", user1.ID)
	CreateList(db, "User2 List", "#E1BEE7", user2.ID)

	lists1, err := ListLists(db, user1.ID)
	if err != nil {
		t.Fatalf("ListLists(user1) failed: %v", err)
	}
	if len(lists1) != 1 {
		t.Errorf("expected 1 list for user1, got %d", len(lists1))
	}
	if lists1[0].Name != "User1 List" {
		t.Errorf("expected 'User1 List', got '%s'", lists1[0].Name)
	}

	lists2, err := ListLists(db, user2.ID)
	if err != nil {
		t.Fatalf("ListLists(user2) failed: %v", err)
	}
	if len(lists2) != 1 {
		t.Errorf("expected 1 list for user2, got %d", len(lists2))
	}
}

func TestUpdateList_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	list, err := CreateList(db, "oldname", "#F8BBD9", user.ID)
	if err != nil {
		t.Fatalf("CreateList failed: %v", err)
	}

	if err := UpdateList(db, list.ID, "newname", "#E1BEE7", user.ID); err != nil {
		t.Fatalf("UpdateList failed: %v", err)
	}

	lists, err := ListLists(db, user.ID)
	if err != nil {
		t.Fatalf("ListLists failed: %v", err)
	}
	if len(lists) != 1 {
		t.Fatalf("expected 1 list, got %d", len(lists))
	}
	if lists[0].Name != "newname" {
		t.Errorf("expected name 'newname', got '%s'", lists[0].Name)
	}
	if lists[0].Color != "#E1BEE7" {
		t.Errorf("expected color '#E1BEE7', got '%s'", lists[0].Color)
	}
}

func TestDeleteList_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	list, err := CreateList(db, "To be deleted", "#F8BBD9", user.ID)
	if err != nil {
		t.Fatalf("CreateList failed: %v", err)
	}

	if err := DeleteList(db, list.ID, user.ID); err != nil {
		t.Fatalf("DeleteList failed: %v", err)
	}

	lists, err := ListLists(db, user.ID)
	if err != nil {
		t.Fatalf("ListLists failed: %v", err)
	}
	if len(lists) != 0 {
		t.Errorf("expected 0 lists after deletion, got %d", len(lists))
	}
}

func TestAddListToTodo_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	list, err := CreateList(db, "work", "#F8BBD9", user.ID)
	if err != nil {
		t.Fatalf("CreateList failed: %v", err)
	}

	if err := AddListToTodo(db, todo.ID, list.ID, user.ID); err != nil {
		t.Fatalf("AddListToTodo failed: %v", err)
	}

	lists, err := ListTodoLists(db, todo.ID, user.ID)
	if err != nil {
		t.Fatalf("ListTodoLists failed: %v", err)
	}
	if len(lists) != 1 {
		t.Fatalf("expected 1 list, got %d", len(lists))
	}
	if lists[0].ID != list.ID {
		t.Errorf("expected list ID %d, got %d", list.ID, lists[0].ID)
	}
}

func TestAddListToTodo_Idempotent(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	list, err := CreateList(db, "work", "#F8BBD9", user.ID)
	if err != nil {
		t.Fatalf("CreateList failed: %v", err)
	}

	if err := AddListToTodo(db, todo.ID, list.ID, user.ID); err != nil {
		t.Fatalf("first AddListToTodo failed: %v", err)
	}
	if err := AddListToTodo(db, todo.ID, list.ID, user.ID); err != nil {
		t.Fatalf("second AddListToTodo failed: %v", err)
	}

	lists, err := ListTodoLists(db, todo.ID, user.ID)
	if err != nil {
		t.Fatalf("ListTodoLists failed: %v", err)
	}
	if len(lists) != 1 {
		t.Fatalf("expected 1 list (idempotent), got %d", len(lists))
	}
}

func TestRemoveListFromTodo_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	list, err := CreateList(db, "work", "#F8BBD9", user.ID)
	if err != nil {
		t.Fatalf("CreateList failed: %v", err)
	}

	if err := AddListToTodo(db, todo.ID, list.ID, user.ID); err != nil {
		t.Fatalf("AddListToTodo failed: %v", err)
	}

	if err := RemoveListFromTodo(db, todo.ID, list.ID, user.ID); err != nil {
		t.Fatalf("RemoveListFromTodo failed: %v", err)
	}

	lists, err := ListTodoLists(db, todo.ID, user.ID)
	if err != nil {
		t.Fatalf("ListTodoLists failed: %v", err)
	}
	if len(lists) != 0 {
		t.Errorf("expected 0 lists after removal, got %d", len(lists))
	}
}

func TestRemoveListFromTodo_NotFound(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	todo, err := CreateTodo(db, "Test task", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	list, err := CreateList(db, "work", "#F8BBD9", user.ID)
	if err != nil {
		t.Fatalf("CreateList failed: %v", err)
	}

	err = RemoveListFromTodo(db, todo.ID, list.ID, user.ID)
	if err == nil {
		t.Error("expected error for non-existent association, got nil")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got: %v", err)
	}
}

func TestMigration_TagsToLists(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db, "user@test.com", "hash")

	// Create tags and todo_tags (pre-migration data)
	tag1, err := CreateTag(db, "work", user.ID)
	if err != nil {
		t.Fatalf("CreateTag(work) failed: %v", err)
	}
	tag2, err := CreateTag(db, "home", user.ID)
	if err != nil {
		t.Fatalf("CreateTag(home) failed: %v", err)
	}

	todo, err := CreateTodo(db, "Task with tags", user.ID)
	if err != nil {
		t.Fatalf("CreateTodo failed: %v", err)
	}

	if err := AddTagToTodo(db, todo.ID, tag1.ID, user.ID); err != nil {
		t.Fatalf("AddTagToTodo failed: %v", err)
	}
	if err := AddTagToTodo(db, todo.ID, tag2.ID, user.ID); err != nil {
		t.Fatalf("AddTagToTodo failed: %v", err)
	}

	// Run migration (idempotent; migrates tags → lists, todo_tags → todo_lists)
	if err := migrateTagsToLists(db); err != nil {
		t.Fatalf("migrateTagsToLists failed: %v", err)
	}

	// lists and todo_lists should now have the migrated data
	lists, err := ListLists(db, user.ID)
	if err != nil {
		t.Fatalf("ListLists failed: %v", err)
	}
	if len(lists) != 2 {
		t.Fatalf("expected 2 lists after migration, got %d", len(lists))
	}

	// Verify todo has lists (migrated from todo_tags)
	todoLists, err := ListTodoLists(db, todo.ID, user.ID)
	if err != nil {
		t.Fatalf("ListTodoLists failed: %v", err)
	}
	if len(todoLists) != 2 {
		t.Fatalf("expected 2 lists on todo after migration, got %d", len(todoLists))
	}

	names := make(map[string]bool)
	for _, l := range todoLists {
		names[l.Name] = true
	}
	if !names["work"] || !names["home"] {
		t.Errorf("expected work and home lists on todo, got names: %v", names)
	}

	// All migrated lists should have default color
	for _, l := range lists {
		if l.Color != DefaultListColor {
			t.Errorf("expected migrated list color %s, got %s", DefaultListColor, l.Color)
		}
	}
}
