package main

import (
	"database/sql"
	"errors"
	"strings"

	_ "modernc.org/sqlite"
)

const MaxTitleLength = 255
const MaxTagNameLength = 50

var (
	ErrEmptyTitle     = errors.New("title cannot be empty")
	ErrTitleTooLong   = errors.New("title exceeds maximum length")
	ErrNotFound       = errors.New("todo not found")
	ErrAlreadyDeleted = errors.New("todo already deleted")
	ErrDuplicateEmail = errors.New("email already registered")
	ErrUserNotFound   = errors.New("user not found")
	ErrEmptyTagName   = errors.New("tag name cannot be empty")
	ErrTagNameTooLong = errors.New("tag name exceeds maximum length")
	ErrDuplicateTag   = errors.New("tag with this name already exists")
	ErrTagNotFound    = errors.New("tag not found")
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

	return db, nil
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

// --- Tag CRUD Functions ---

// ListTags returns all tags for a given user ordered by created_at DESC.
func ListTags(db *sql.DB, userID int64) ([]Tag, error) {
	rows, err := db.Query("SELECT id, name, created_at, user_id FROM tags WHERE user_id = ? ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tags := []Tag{}
	for rows.Next() {
		var t Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.CreatedAt, &t.UserID); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tags, nil
}

// CreateTag inserts a new tag with the given name for the given user and returns the created Tag.
// Returns ErrEmptyTagName if the name is empty or whitespace-only.
// Returns ErrTagNameTooLong if the name exceeds MaxTagNameLength.
// Returns ErrDuplicateTag if a tag with the same name already exists for the user.
func CreateTag(db *sql.DB, name string, userID int64) (Tag, error) {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return Tag{}, ErrEmptyTagName
	}
	if len(trimmed) > MaxTagNameLength {
		return Tag{}, ErrTagNameTooLong
	}

	result, err := db.Exec("INSERT INTO tags (name, user_id) VALUES (?, ?)", trimmed, userID)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return Tag{}, ErrDuplicateTag
		}
		return Tag{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return Tag{}, err
	}

	var tag Tag
	err = db.QueryRow("SELECT id, name, created_at, user_id FROM tags WHERE id = ?", id).
		Scan(&tag.ID, &tag.Name, &tag.CreatedAt, &tag.UserID)
	if err != nil {
		return Tag{}, err
	}

	return tag, nil
}

// UpdateTagName updates the name of a tag by ID, scoped to the given user.
// Returns ErrEmptyTagName if the name is empty, ErrTagNameTooLong if it exceeds max length,
// ErrDuplicateTag if a tag with the new name already exists for the user,
// and ErrTagNotFound if the tag does not exist or does not belong to the user.
func UpdateTagName(db *sql.DB, tagID int64, name string, userID int64) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return ErrEmptyTagName
	}
	if len(trimmed) > MaxTagNameLength {
		return ErrTagNameTooLong
	}

	result, err := db.Exec(
		"UPDATE tags SET name = ? WHERE id = ? AND user_id = ?",
		trimmed, tagID, userID,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return ErrDuplicateTag
		}
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrTagNotFound
	}

	return nil
}

// DeleteTag removes a tag by ID, scoped to the given user.
// Returns ErrTagNotFound if the tag does not exist or does not belong to the user.
func DeleteTag(db *sql.DB, tagID int64, userID int64) error {
	result, err := db.Exec("DELETE FROM tags WHERE id = ? AND user_id = ?", tagID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrTagNotFound
	}

	return nil
}

// --- Todo-Tag Relationship Functions ---

// AddTagToTodo associates a tag with a todo.
// Returns ErrNotFound if the todo or tag does not exist, does not belong to the user, or the todo is deleted.
// Returns nil if the association already exists (idempotent).
func AddTagToTodo(db *sql.DB, todoID int64, tagID int64, userID int64) error {
	// Verify that both todo and tag belong to the user
	var todoExists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM todos WHERE id = ? AND user_id = ? AND deleted_at IS NULL)", todoID, userID).Scan(&todoExists)
	if err != nil {
		return err
	}
	if !todoExists {
		return ErrNotFound
	}

	var tagExists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM tags WHERE id = ? AND user_id = ?)", tagID, userID).Scan(&tagExists)
	if err != nil {
		return err
	}
	if !tagExists {
		return ErrTagNotFound
	}

	// Insert the association (ignore if already exists due to PRIMARY KEY constraint)
	_, err = db.Exec("INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)", todoID, tagID)
	if err != nil {
		return err
	}

	return nil
}

// RemoveTagFromTodo removes the association between a tag and a todo.
// Returns ErrNotFound if the association does not exist.
func RemoveTagFromTodo(db *sql.DB, todoID int64, tagID int64, userID int64) error {
	// Verify that both todo and tag belong to the user
	var todoExists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM todos WHERE id = ? AND user_id = ? AND deleted_at IS NULL)", todoID, userID).Scan(&todoExists)
	if err != nil {
		return err
	}
	if !todoExists {
		return ErrNotFound
	}

	var tagExists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM tags WHERE id = ? AND user_id = ?)", tagID, userID).Scan(&tagExists)
	if err != nil {
		return err
	}
	if !tagExists {
		return ErrTagNotFound
	}

	result, err := db.Exec("DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?", todoID, tagID)
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

// ListTodoTags returns all tags associated with a specific todo, scoped to the given user.
// Returns ErrNotFound if the todo does not exist, does not belong to the user, or is deleted.
func ListTodoTags(db *sql.DB, todoID int64, userID int64) ([]Tag, error) {
	// Verify that the todo belongs to the user
	var todoExists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM todos WHERE id = ? AND user_id = ? AND deleted_at IS NULL)", todoID, userID).Scan(&todoExists)
	if err != nil {
		return nil, err
	}
	if !todoExists {
		return nil, ErrNotFound
	}

	rows, err := db.Query(`
		SELECT t.id, t.name, t.created_at, t.user_id
		FROM tags t
		INNER JOIN todo_tags tt ON t.id = tt.tag_id
		WHERE tt.todo_id = ? AND t.user_id = ?
		ORDER BY t.created_at DESC
	`, todoID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tags := []Tag{}
	for rows.Next() {
		var t Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.CreatedAt, &t.UserID); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tags, nil
}
