package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, nil)))

	db, err := InitDB("todos.db")
	if err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}
	defer db.Close()

	mux := http.NewServeMux()

	// Auth routes (public)
	mux.HandleFunc("POST /api/auth/register", handleRegister(db))
	mux.HandleFunc("POST /api/auth/login", handleLogin(db))

	// Todo routes (protected by JWT middleware)
	protected := http.NewServeMux()
	protected.HandleFunc("GET /api/todos", handleListTodos(db))
	protected.HandleFunc("POST /api/todos", handleCreateTodo(db))
	protected.HandleFunc("PATCH /api/todos/{id}", handleUpdateTodo(db))
	protected.HandleFunc("DELETE /api/todos/{id}", handleDeleteTodo(db))

	mux.Handle("/api/todos", jwtMiddleware(protected))
	mux.Handle("/api/todos/", jwtMiddleware(protected))

	handler := loggingMiddleware(corsMiddleware(mux))

	srv := &http.Server{
		Addr:    ":8080",
		Handler: handler,
	}

	go func() {
		slog.Info("server starting", "port", 8080)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("server forced to shutdown: %v", err)
	}

	slog.Info("server stopped")
}
