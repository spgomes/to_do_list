package main

import (
	"database/sql"
	"errors"
	"strings"

	_ "modernc.org/sqlite"
)

const MaxTitleLength = 255
const MaxListNameLength = 50

// DefaultListColor is used when migrating tags or when color is invalid.
const DefaultListColor = "#BBDEFB"

// PastelColors are the valid hex colors for lists (tech spec).
var PastelColors = map[string]bool{
	"#F8BBD9": true, "#E1BEE7": true, "#BBDEFB": true, "#B2DFDB": true,
	"#FFF9C4": true, "#FFCCBC": true, "#D1C4E9": true, "#B3E5FC": true,
}

var (
	ErrEmptyTitle      = errors.New("title cannot be empty")
	ErrTitleTooLong    = errors.New("title exceeds maximum length")
	ErrNotFound        = errors.New("todo not found")
	ErrAlreadyDeleted  = errors.New("todo already deleted")
	ErrDuplicateEmail = errors.New("email already registered")
	ErrUserNotFound    = errors.New("user not found")
	ErrEmptyListName   = errors.New("list name cannot be empty")
	ErrListNameTooLong = errors.New("list name exceeds maximum length")
	ErrDuplicateList   = errors.New("list with this name already exists")
	ErrListNotFound    = errors.New("list not found")
	ErrInvalidColor    = errors.New("color must be a valid pastel hex from the palette")
)

// InitDB opens (or creates) a SQLite database at dbPath, enables WAL mode,
// and creates the todos and users tables if they do not exist.
func InitDB(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}

	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		db.Close()
		return nil, err
	}

	createUsersTable := `
		CREATE TABLE IF NOT EXISTS users (
			id            INTEGER PRIMARY KEY AUTOINCREMENT,
			email         TEXT    NOT NULL UNIQUE,
			password_hash TEXT    NOT NULL,
			created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
		);
	`
	if _, err := db.Exec(createUsersTable); err != nil {
		db.Close()
		return nil, err
	}

	createTodosTable := `
		CREATE TABLE IF NOT EXISTS todos (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			title      TEXT    NOT NULL,
			completed  BOOLEAN NOT NULL DEFAULT 0,
			created_at TEXT    NOT NULL DEFAULT (datetime('now')),
			user_id    INTEGER NOT NULL REFERENCES users(id),
			deleted_at TEXT    NULL
		);
	`
	if _, err := db.Exec(createTodosTable); err != nil {
		db.Close()
		return nil, err
	}

	// Migration: add deleted_at column for existing databases
	db.Exec(`ALTER TABLE todos ADD COLUMN deleted_at TEXT NULL`)
	// Ignore error — column may already exist

	createTagsTable := `
		CREATE TABLE IF NOT EXISTS tags (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			name       TEXT    NOT NULL,
			created_at TEXT    NOT NULL DEFAULT (datetime('now')),
			user_id    INTEGER NOT NULL REFERENCES users(id),
			UNIQUE(user_id, name)
		);
	`
	if _, err := db.Exec(createTagsTable); err != nil {
		db.Close()
		return nil, err
	}

	createTodoTagsTable := `
		CREATE TABLE IF NOT EXISTS todo_tags (
			todo_id INTEGER NOT NULL REFERENCES todos(id),
			tag_id  INTEGER NOT NULL REFERENCES tags(id),
			PRIMARY KEY (todo_id, tag_id)
		);
	`
	if _, err := db.Exec(createTodoTagsTable); err != nil {
		db.Close()
		return nil, err
	}

	// Lists (thematic lists) — replaces tags
	createListsTable := `
		CREATE TABLE IF NOT EXISTS lists (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			name       TEXT    NOT NULL,
			color      TEXT    NOT NULL DEFAULT '` + DefaultListColor + `',
			created_at TEXT    NOT NULL DEFAULT (datetime('now')),
			user_id    INTEGER NOT NULL REFERENCES users(id),
			UNIQUE(user_id, name)
		);
	`
	if _, err := db.Exec(createListsTable); err != nil {
		db.Close()
		return nil, err
	}

	createTodoListsTable := `
		CREATE TABLE IF NOT EXISTS todo_lists (
			todo_id INTEGER NOT NULL REFERENCES todos(id),
			list_id INTEGER NOT NULL REFERENCES lists(id),
			PRIMARY KEY (todo_id, list_id)
		);
	`
	if _, err := db.Exec(createTodoListsTable); err != nil {
		db.Close()
		return nil, err
	}

	// Migrate tags → lists and todo_tags → todo_lists (idempotent)
	if err := migrateTagsToLists(db); err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}

// migrateTagsToLists copies data from tags/todo_tags to lists/todo_lists.
// Idempotent: safe to run multiple times; uses INSERT OR IGNORE.
func migrateTagsToLists(db *sql.DB) error {
	var exists int
	err := db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tags'").Scan(&exists)
	if err != nil || exists == 0 {
		return nil
	}

	// Read all tags into memory first (avoids holding rows open while Exec with MaxOpenConns=1)
	type tagRow struct {
		id        int64
		name      string
		createdAt string
		userID    int64
	}
	rows, err := db.Query("SELECT id, name, created_at, user_id FROM tags")
	if err != nil {
		return err
	}
	var tags []tagRow
	for rows.Next() {
		var r tagRow
		if err := rows.Scan(&r.id, &r.name, &r.createdAt, &r.userID); err != nil {
			rows.Close()
			return err
		}
		tags = append(tags, r)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	tagToList := make(map[int64]int64)
	for _, r := range tags {
		_, err := db.Exec("INSERT OR IGNORE INTO lists (name, color, created_at, user_id) VALUES (?, ?, ?, ?)",
			r.name, DefaultListColor, r.createdAt, r.userID)
		if err != nil {
			return err
		}
		var listID int64
		err = db.QueryRow("SELECT id FROM lists WHERE user_id = ? AND name = ?", r.userID, r.name).Scan(&listID)
		if err != nil {
			return err
		}
		tagToList[r.id] = listID
	}

	// Read todo_tags into memory
	rows2, err := db.Query("SELECT todo_id, tag_id FROM todo_tags")
	if err != nil {
		return err
	}
	var todoTags []struct {
		todoID int64
		tagID  int64
	}
	for rows2.Next() {
		var todoID, tagID int64
		if err := rows2.Scan(&todoID, &tagID); err != nil {
			rows2.Close()
			return err
		}
		todoTags = append(todoTags, struct {
			todoID int64
			tagID  int64
		}{todoID, tagID})
	}
	rows2.Close()
	if err := rows2.Err(); err != nil {
		return err
	}

	for _, tt := range todoTags {
		listID, ok := tagToList[tt.tagID]
		if !ok {
			continue
		}
		_, err = db.Exec("INSERT OR IGNORE INTO todo_lists (todo_id, list_id) VALUES (?, ?)", tt.todoID, listID)
		if err != nil {
			return err
		}
	}
	return nil
}

// CreateUser inserts a new user with the given email and password hash.
// Returns ErrDuplicateEmail if the email is already registered.
func CreateUser(db *sql.DB, email, passwordHash string) (User, error) {
	result, err := db.Exec("INSERT INTO users (email, password_hash) VALUES (?, ?)", email, passwordHash)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return User{}, ErrDuplicateEmail
		}
		return User{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return User{}, err
	}

	var user User
	err = db.QueryRow("SELECT id, email, password_hash, created_at FROM users WHERE id = ?", id).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return User{}, err
	}

	return user, nil
}

// GetUserByEmail retrieves a user by email.
// Returns ErrUserNotFound if no user with that email exists.
func GetUserByEmail(db *sql.DB, email string) (User, error) {
	var user User
	err := db.QueryRow("SELECT id, email, password_hash, created_at FROM users WHERE email = ?", email).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return User{}, ErrUserNotFound
		}
		return User{}, err
	}
	return user, nil
}

// GetAllTodos returns all non-deleted todos for a given user ordered by created_at DESC.
func GetAllTodos(db *sql.DB, userID int64) ([]Todo, error) {
	rows, err := db.Query("SELECT id, title, completed, created_at, user_id FROM todos WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	todos := []Todo{}
	for rows.Next() {
		var t Todo
		if err := rows.Scan(&t.ID, &t.Title, &t.Completed, &t.CreatedAt, &t.UserID); err != nil {
			return nil, err
		}
		todos = append(todos, t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return todos, nil
}

// CreateTodo inserts a new todo with the given title for the given user and returns the created Todo.
// Returns ErrEmptyTitle if the title is empty or whitespace-only.
func CreateTodo(db *sql.DB, title string, userID int64) (Todo, error) {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return Todo{}, ErrEmptyTitle
	}
	if len(trimmed) > MaxTitleLength {
		return Todo{}, ErrTitleTooLong
	}

	result, err := db.Exec("INSERT INTO todos (title, user_id) VALUES (?, ?)", trimmed, userID)
	if err != nil {
		return Todo{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return Todo{}, err
	}

	var todo Todo
	err = db.QueryRow("SELECT id, title, completed, created_at, user_id FROM todos WHERE id = ?", id).
		Scan(&todo.ID, &todo.Title, &todo.Completed, &todo.CreatedAt, &todo.UserID)
	if err != nil {
		return Todo{}, err
	}

	return todo, nil
}

// UpdateTodoStatus updates the completed status of a todo by ID, scoped to the given user.
// Returns ErrNotFound if the ID does not exist, does not belong to the user, or is deleted.
func UpdateTodoStatus(db *sql.DB, id int64, completed bool, userID int64) error {
	result, err := db.Exec("UPDATE todos SET completed = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL", completed, id, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// UpdateTodoTitle updates only the title of a todo by ID, scoped to the given user.
// Returns ErrEmptyTitle if the title is empty, ErrTitleTooLong if it exceeds max length,
// and ErrNotFound if the todo does not exist, does not belong to the user, or is deleted.
func UpdateTodoTitle(db *sql.DB, id int64, title string, userID int64) error {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return ErrEmptyTitle
	}
	if len(trimmed) > MaxTitleLength {
		return ErrTitleTooLong
	}

	result, err := db.Exec(
		"UPDATE todos SET title = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
		trimmed, id, userID,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// DeleteTodo performs a soft delete by setting deleted_at to the current timestamp.
// Returns ErrNotFound if the ID does not exist, does not belong to the user, or is already deleted.
func DeleteTodo(db *sql.DB, id int64, userID int64) error {
	result, err := db.Exec(
		"UPDATE todos SET deleted_at = datetime('now') WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
		id, userID,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// --- List CRUD Functions ---

// ListLists returns all lists for a given user ordered by created_at DESC.
func ListLists(db *sql.DB, userID int64) ([]List, error) {
	rows, err := db.Query("SELECT id, name, color, created_at, user_id FROM lists WHERE user_id = ? ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lists := []List{}
	for rows.Next() {
		var l List
		if err := rows.Scan(&l.ID, &l.Name, &l.Color, &l.CreatedAt, &l.UserID); err != nil {
			return nil, err
		}
		lists = append(lists, l)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return lists, nil
}

// GetListByID returns a list by ID, scoped to the given user.
func GetListByID(db *sql.DB, listID int64, userID int64) (List, error) {
	var l List
	err := db.QueryRow("SELECT id, name, color, created_at, user_id FROM lists WHERE id = ? AND user_id = ?", listID, userID).
		Scan(&l.ID, &l.Name, &l.Color, &l.CreatedAt, &l.UserID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return List{}, ErrListNotFound
		}
		return List{}, err
	}
	return l, nil
}

// CreateList inserts a new list with the given name and color for the given user.
// Returns ErrEmptyListName if the name is empty, ErrListNameTooLong if too long,
// ErrDuplicateList if a list with the same name exists, ErrInvalidColor if color is not in the palette.
func CreateList(db *sql.DB, name string, color string, userID int64) (List, error) {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return List{}, ErrEmptyListName
	}
	if len(trimmed) > MaxListNameLength {
		return List{}, ErrListNameTooLong
	}

	hexColor, err := validateColor(color)
	if err != nil {
		return List{}, err
	}

	result, err := db.Exec("INSERT INTO lists (name, color, user_id) VALUES (?, ?, ?)", trimmed, hexColor, userID)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return List{}, ErrDuplicateList
		}
		return List{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return List{}, err
	}

	var list List
	err = db.QueryRow("SELECT id, name, color, created_at, user_id FROM lists WHERE id = ?", id).
		Scan(&list.ID, &list.Name, &list.Color, &list.CreatedAt, &list.UserID)
	if err != nil {
		return List{}, err
	}

	return list, nil
}

// validateColor returns the hex if it's in the pastel palette, or ErrInvalidColor.
func validateColor(color string) (string, error) {
	c := strings.TrimSpace(color)
	if c == "" {
		return DefaultListColor, nil
	}
	if len(c) == 6 && !strings.HasPrefix(c, "#") {
		c = "#" + c
	}
	if PastelColors[c] {
		return c, nil
	}
	return "", ErrInvalidColor
}

// normalizeColor returns a valid pastel hex or DefaultListColor if invalid (for UpdateList).
func normalizeColor(color string) string {
	c := strings.TrimSpace(color)
	if c == "" {
		return DefaultListColor
	}
	if len(c) == 6 && !strings.HasPrefix(c, "#") {
		c = "#" + c
	}
	if PastelColors[c] {
		return c
	}
	return DefaultListColor
}

// UpdateList updates the name and/or color of a list by ID, scoped to the given user.
func UpdateList(db *sql.DB, listID int64, name string, color string, userID int64) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return ErrEmptyListName
	}
	if len(trimmed) > MaxListNameLength {
		return ErrListNameTooLong
	}

	hexColor := normalizeColor(color)

	result, err := db.Exec(
		"UPDATE lists SET name = ?, color = ? WHERE id = ? AND user_id = ?",
		trimmed, hexColor, listID, userID,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return ErrDuplicateList
		}
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrListNotFound
	}

	return nil
}

// DeleteList removes a list by ID, scoped to the given user.
func DeleteList(db *sql.DB, listID int64, userID int64) error {
	result, err := db.Exec("DELETE FROM lists WHERE id = ? AND user_id = ?", listID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrListNotFound
	}

	return nil
}

// --- Todo-List Relationship Functions ---

// AddListToTodo associates a list with a todo.
// Returns ErrNotFound if the todo does not exist or is deleted, ErrListNotFound if the list does not exist.
// Idempotent: returns nil if the association already exists.
func AddListToTodo(db *sql.DB, todoID int64, listID int64, userID int64) error {
	var todoExists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM todos WHERE id = ? AND user_id = ? AND deleted_at IS NULL)", todoID, userID).Scan(&todoExists)
	if err != nil {
		return err
	}
	if !todoExists {
		return ErrNotFound
	}

	var listExists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM lists WHERE id = ? AND user_id = ?)", listID, userID).Scan(&listExists)
	if err != nil {
		return err
	}
	if !listExists {
		return ErrListNotFound
	}

	_, err = db.Exec("INSERT OR IGNORE INTO todo_lists (todo_id, list_id) VALUES (?, ?)", todoID, listID)
	return err
}

// RemoveListFromTodo removes the association between a list and a todo.
func RemoveListFromTodo(db *sql.DB, todoID int64, listID int64, userID int64) error {
	var todoExists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM todos WHERE id = ? AND user_id = ? AND deleted_at IS NULL)", todoID, userID).Scan(&todoExists)
	if err != nil {
		return err
	}
	if !todoExists {
		return ErrNotFound
	}

	var listExists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM lists WHERE id = ? AND user_id = ?)", listID, userID).Scan(&listExists)
	if err != nil {
		return err
	}
	if !listExists {
		return ErrListNotFound
	}

	result, err := db.Exec("DELETE FROM todo_lists WHERE todo_id = ? AND list_id = ?", todoID, listID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// ListTodosByList returns all todos associated with a specific list, scoped to the given user.
// Returns ErrListNotFound if the list does not exist or does not belong to the user.
func ListTodosByList(db *sql.DB, listID int64, userID int64) ([]Todo, error) {
	_, err := GetListByID(db, listID, userID)
	if err != nil {
		return nil, err
	}

	rows, err := db.Query(`
		SELECT t.id, t.title, t.completed, t.created_at, t.user_id
		FROM todos t
		INNER JOIN todo_lists tl ON t.id = tl.todo_id
		WHERE tl.list_id = ? AND t.user_id = ? AND t.deleted_at IS NULL
		ORDER BY t.created_at DESC
	`, listID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	todos := []Todo{}
	for rows.Next() {
		var t Todo
		if err := rows.Scan(&t.ID, &t.Title, &t.Completed, &t.CreatedAt, &t.UserID); err != nil {
			return nil, err
		}
		todos = append(todos, t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Populate lists for each todo
	for i := range todos {
		lists, err := ListTodoLists(db, todos[i].ID, userID)
		if err != nil {
			todos[i].Lists = nil
		} else {
			todos[i].Lists = lists
		}
	}

	return todos, nil
}

// ListTodoLists returns all lists associated with a specific todo, scoped to the given user.
func ListTodoLists(db *sql.DB, todoID int64, userID int64) ([]List, error) {
	var todoExists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM todos WHERE id = ? AND user_id = ? AND deleted_at IS NULL)", todoID, userID).Scan(&todoExists)
	if err != nil {
		return nil, err
	}
	if !todoExists {
		return nil, ErrNotFound
	}

	rows, err := db.Query(`
		SELECT l.id, l.name, l.color, l.created_at, l.user_id
		FROM lists l
		INNER JOIN todo_lists tl ON l.id = tl.list_id
		WHERE tl.todo_id = ? AND l.user_id = ?
		ORDER BY l.created_at DESC
	`, todoID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lists := []List{}
	for rows.Next() {
		var l List
		if err := rows.Scan(&l.ID, &l.Name, &l.Color, &l.CreatedAt, &l.UserID); err != nil {
			return nil, err
		}
		lists = append(lists, l)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return lists, nil
}

// CreateTodoInList creates a todo and atomically associates it with the given list.
// Returns ErrListNotFound if the list does not exist or does not belong to the user.
// Returns ErrEmptyTitle / ErrTitleTooLong for invalid titles.
// Uses a transaction: if any step fails, the todo is not created.
func CreateTodoInList(db *sql.DB, title string, listID int64, userID int64) (Todo, error) {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return Todo{}, ErrEmptyTitle
	}
	if len(trimmed) > MaxTitleLength {
		return Todo{}, ErrTitleTooLong
	}

	tx, err := db.Begin()
	if err != nil {
		return Todo{}, err
	}
	var txDone bool
	defer func() {
		if !txDone {
			tx.Rollback()
		}
	}()

	// 1. Verify the list exists and belongs to the user
	var listExists bool
	err = tx.QueryRow("SELECT EXISTS(SELECT 1 FROM lists WHERE id = ? AND user_id = ?)", listID, userID).Scan(&listExists)
	if err != nil {
		return Todo{}, err
	}
	if !listExists {
		err = ErrListNotFound
		return Todo{}, err
	}

	// 2. Insert the todo
	result, err := tx.Exec("INSERT INTO todos (title, user_id) VALUES (?, ?)", trimmed, userID)
	if err != nil {
		return Todo{}, err
	}

	todoID, err := result.LastInsertId()
	if err != nil {
		return Todo{}, err
	}

	// 3. Associate the todo with the list
	_, err = tx.Exec("INSERT INTO todo_lists (todo_id, list_id) VALUES (?, ?)", todoID, listID)
	if err != nil {
		return Todo{}, err
	}

	if err = tx.Commit(); err != nil {
		return Todo{}, err
	}
	txDone = true

	// 4. Return the created todo with its list populated
	var todo Todo
	err = db.QueryRow("SELECT id, title, completed, created_at, user_id FROM todos WHERE id = ?", todoID).
		Scan(&todo.ID, &todo.Title, &todo.Completed, &todo.CreatedAt, &todo.UserID)
	if err != nil {
		return Todo{}, err
	}

	lists, err := ListTodoLists(db, todo.ID, userID)
	if err != nil {
		todo.Lists = nil
	} else {
		todo.Lists = lists
	}

	return todo, nil
}
