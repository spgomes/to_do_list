# Tarefa 1.0: Setup do Projeto (Backend + Frontend)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar a estrutura completa de diretórios e inicializar ambos os projetos (Go backend e React frontend) para que compilem e iniciem sem erros. Esta tarefa estabelece a fundação sobre a qual todas as demais serão construídas.

<requirements>
- Estrutura de diretórios `backend/` e `frontend/` criada na raiz do projeto
- Módulo Go inicializado com `go mod init` (Go 1.22+)
- Projeto React + TypeScript inicializado com Vite
- Backend compila e inicia um servidor HTTP na porta 8080 (pode retornar apenas "OK")
- Frontend compila e inicia o dev server Vite na porta 5173
- Ambos os projetos rodam sem erros
</requirements>

## Subtarefas

- [x] 1.1 Criar estrutura de diretórios (`backend/` e `frontend/` na raiz do projeto)
- [x] 1.2 Inicializar módulo Go (`go mod init`) e criar `main.go` mínimo que inicia servidor HTTP na porta 8080
- [x] 1.3 Instalar dependência `modernc.org/sqlite` (`go get modernc.org/sqlite`)
- [x] 1.4 Inicializar projeto React + TypeScript com Vite (`npm create vite@latest`)
- [x] 1.5 Verificar que `go build` compila sem erros
- [x] 1.6 Verificar que `npm run dev` inicia o frontend sem erros
- [x] 1.7 Criar arquivo `.gitignore` apropriado (node_modules, binários Go, todos.db, etc.)

## Detalhes de Implementação

Consultar a seção **"Sequenciamento de Desenvolvimento > Ordem de Construção > Item 1"** e **"Arquivos Relevantes e Dependentes"** na [techspec.md](../../Tasks/TechSpec.md) para a estrutura completa de arquivos esperada.

**Backend `main.go` mínimo:**
```go
package main

import (
    "fmt"
    "log"
    "net/http"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "OK")
    })
    log.Println("Servidor iniciado na porta 8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

**Versões requeridas (conforme Tech Spec):**
- Go 1.22+
- Node.js 20+
- Vite 6.x
- React 19.x
- TypeScript 5.x

## Critérios de Sucesso

- `go build ./backend` compila sem erros
- `go run ./backend` inicia servidor que responde na porta 8080
- `cd frontend && npm install && npm run dev` inicia dev server na porta 5173
- Estrutura de diretórios corresponde ao diagrama da Tech Spec
- `.gitignore` exclui artefatos de build, `node_modules` e `todos.db`

## Testes da Tarefa

- [x] Teste manual: `go build` compila sem erros
- [x] Teste manual: servidor Go responde a `curl http://localhost:8080`
- [x] Teste manual: `npm run dev` inicia sem erros e abre no navegador
- [x] Teste manual: `npm run build` gera build de produção sem erros

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes
- `backend/main.go` — Entrypoint mínimo do servidor Go
- `backend/go.mod` — Módulo Go
- `frontend/package.json` — Dependências do frontend
- `frontend/vite.config.ts` — Configuração do Vite
- `frontend/tsconfig.json` — Configuração TypeScript
- `.gitignore` — Exclusões do Git
- [PRD](../../Tasks/PRD.md) — Requisitos do produto
- [Tech Spec](../../Tasks/TechSpec.md) — Especificação técnica
