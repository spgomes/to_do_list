package main

import (
	"database/sql"
	"errors"
	"strings"

	_ "modernc.org/sqlite"
)

const MaxTitleLength = 255

var (
	ErrEmptyTitle     = errors.New("title cannot be empty")
	ErrTitleTooLong   = errors.New("title exceeds maximum length")
	ErrNotFound       = errors.New("todo not found")
	ErrDuplicateEmail = errors.New("email already registered")
	ErrUserNotFound   = errors.New("user not found")
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
			user_id    INTEGER NOT NULL REFERENCES users(id)
		);
	`
	if _, err := db.Exec(createTodosTable); err != nil {
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

// GetAllTodos returns all todos for a given user ordered by created_at DESC.
func GetAllTodos(db *sql.DB, userID int64) ([]Todo, error) {
	rows, err := db.Query("SELECT id, title, completed, created_at, user_id FROM todos WHERE user_id = ? ORDER BY created_at DESC", userID)
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
// Returns ErrNotFound if the ID does not exist or does not belong to the user.
func UpdateTodoStatus(db *sql.DB, id int64, completed bool, userID int64) error {
	result, err := db.Exec("UPDATE todos SET completed = ? WHERE id = ? AND user_id = ?", completed, id, userID)
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

// DeleteTodo permanently removes a todo by ID, scoped to the given user.
// Returns ErrNotFound if the ID does not exist or does not belong to the user.
func DeleteTodo(db *sql.DB, id int64, userID int64) error {
	result, err := db.Exec("DELETE FROM todos WHERE id = ? AND user_id = ?", id, userID)
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
