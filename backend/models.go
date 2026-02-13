package main

// Todo represents a task in the to-do list.
type Todo struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
	CreatedAt string `json:"created_at"`
}
