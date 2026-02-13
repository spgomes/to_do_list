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
	mux.HandleFunc("GET /api/todos", handleListTodos(db))
	mux.HandleFunc("POST /api/todos", handleCreateTodo(db))
	mux.HandleFunc("PATCH /api/todos/{id}", handleUpdateTodo(db))
	mux.HandleFunc("DELETE /api/todos/{id}", handleDeleteTodo(db))

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
