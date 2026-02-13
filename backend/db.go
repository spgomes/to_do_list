package main

import (
	"database/sql"
	"errors"
	"strings"

	_ "modernc.org/sqlite"
)

const MaxTitleLength = 255

var (
	ErrEmptyTitle  = errors.New("title cannot be empty")
	ErrTitleTooLong = errors.New("title exceeds maximum length")
	ErrNotFound    = errors.New("todo not found")
)

// InitDB opens (or creates) a SQLite database at dbPath, enables WAL mode,
// and creates the todos table if it does not exist.
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

	createTable := `
		CREATE TABLE IF NOT EXISTS todos (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			title      TEXT    NOT NULL,
			completed  BOOLEAN NOT NULL DEFAULT 0,
			created_at TEXT    NOT NULL DEFAULT (datetime('now'))
		);
	`
	if _, err := db.Exec(createTable); err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}

// GetAllTodos returns all todos ordered by created_at DESC.
func GetAllTodos(db *sql.DB) ([]Todo, error) {
	rows, err := db.Query("SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	todos := []Todo{}
	for rows.Next() {
		var t Todo
		if err := rows.Scan(&t.ID, &t.Title, &t.Completed, &t.CreatedAt); err != nil {
			return nil, err
		}
		todos = append(todos, t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return todos, nil
}

// CreateTodo inserts a new todo with the given title and returns the created Todo.
// Returns ErrEmptyTitle if the title is empty or whitespace-only.
func CreateTodo(db *sql.DB, title string) (Todo, error) {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return Todo{}, ErrEmptyTitle
	}
	if len(trimmed) > MaxTitleLength {
		return Todo{}, ErrTitleTooLong
	}

	result, err := db.Exec("INSERT INTO todos (title) VALUES (?)", trimmed)
	if err != nil {
		return Todo{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return Todo{}, err
	}

	var todo Todo
	err = db.QueryRow("SELECT id, title, completed, created_at FROM todos WHERE id = ?", id).
		Scan(&todo.ID, &todo.Title, &todo.Completed, &todo.CreatedAt)
	if err != nil {
		return Todo{}, err
	}

	return todo, nil
}

// UpdateTodoStatus updates the completed status of a todo by ID.
// Returns ErrNotFound if the ID does not exist.
func UpdateTodoStatus(db *sql.DB, id int64, completed bool) error {
	result, err := db.Exec("UPDATE todos SET completed = ? WHERE id = ?", completed, id)
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

// DeleteTodo permanently removes a todo by ID.
// Returns ErrNotFound if the ID does not exist.
func DeleteTodo(db *sql.DB, id int64) error {
	result, err := db.Exec("DELETE FROM todos WHERE id = ?", id)
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
