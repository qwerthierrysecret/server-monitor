.PHONY: build build-all build-amd64 build-arm64 clean run test deps lint

# Build para a arquitetura atual
build:
	CGO_ENABLED=1 go build -o server-monitor-agent main.go

# Build para todas as arquiteturas
build-all: build-amd64 build-arm64

# Build para x86_64 (AMD64)
build-amd64:
	CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o server-monitor-agent-linux-amd64 main.go

# Build para ARM64
build-arm64:
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o server-monitor-agent-linux-arm64 main.go

# Build estático otimizado
build-static:
	CGO_ENABLED=1 go build -ldflags="-s -w" -o server-monitor-agent main.go

# Limpar binários
clean:
	rm -f server-monitor-agent server-monitor-agent-linux-*

# Executar localmente
run:
	go run main.go --port 8765 --password admin123 --db /tmp/metrics.db

# Executar testes
test:
	go test -v ./...

# Instalar dependências
deps:
	go mod download
	go mod tidy

# Verificar código
lint:
	go fmt ./...
	go vet ./...
