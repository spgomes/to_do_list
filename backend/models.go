package main

// Todo represents a task in the to-do list.
// Tags is populated when returning from GET /api/todos; it is not stored in the todos table.
// Lists is the thematic list association (replaces tags); populated when returning from GET /api/todos.
type Todo struct {
	ID        int64   `json:"id"`
	Title     string  `json:"title"`
	Completed bool    `json:"completed"`
	CreatedAt string  `json:"created_at"`
	UserID    int64   `json:"user_id,omitempty"`
	DeletedAt *string `json:"deleted_at,omitempty"`
	Tags      []Tag   `json:"tags,omitempty"`
	Lists     []List  `json:"lists,omitempty"`
}

// List represents a thematic list that can be associated with todos.
type List struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Color     string `json:"color"`
	CreatedAt string `json:"created_at"`
	UserID    int64  `json:"user_id,omitempty"`
}

// User represents a registered user.
type User struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
	CreatedAt    string `json:"created_at"`
}

// Tag represents a tag that can be associated with todos.
type Tag struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
	UserID    int64  `json:"user_id,omitempty"`
}
