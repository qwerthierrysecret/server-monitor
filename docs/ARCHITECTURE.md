# Arquitetura do Server Monitor

## Visão Geral

O Server Monitor é um sistema distribuído de monitoramento que consiste em:

1. **Agentes Backend (Go)**: Executados em cada servidor a ser monitorado
2. **Dashboard Frontend (Next.js)**: Centralizado para visualização e gerenciamento

## Componentes

### Backend Agent (Go)

#### Responsabilidades
- Coletar métricas do sistema operacional
- Armazenar histórico em banco de dados local
- Expor dados via WebSocket autenticado
- Gerenciar conexões de clientes

#### Fluxo de Dados

```
┌─────────────────────────────────────────┐
│     Sistema Operacional                 │
│  (/proc, /sys, syscall)                 │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  Collector (5s interval)                │
│  - getCPUMetrics()                      │
│  - getMemoryMetrics()                   │
│  - getDiskMetrics()                     │
│  - getProcessMetrics()                  │
│  - getSystemInfo()                      │
│  - getNetworkMetrics()                  │
└──────────────┬──────────────────────────┘
               │
               ├─→ SQLite Database ──→ Histórico
               │
               ↓
┌─────────────────────────────────────────┐
│  Hub (Broadcast Manager)                │
│  - Gerencia clientes conectados         │
│  - Autentica conexões                   │
│  - Distribui métricas                   │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  WebSocket Server                       │
│  - ws://0.0.0.0:8765/ws                 │
│  - Autenticação SHA256                  │
│  - JSON payload                         │
└─────────────────────────────────────────┘
```

#### Estrutura de Dados

**SystemMetrics**
```json
{
  "timestamp": 1234567890,
  "cpu": {
    "usage_percent": 45.2,
    "load_avg_1m": 1.5,
    "load_avg_5m": 1.2,
    "load_avg_15m": 1.0,
    "cores": 8
  },
  "memory": {
    "total": 16777216000,
    "used": 8388608000,
    "free": 8388608000,
    "available": 10000000000,
    "buffers": 1000000000,
    "cached": 2000000000
  },
  "disk": {
    "total": 1099511627776,
    "used": 549755813888,
    "free": 549755813888,
    "percent": 50.0,
    "mountpoint": {
      "/": {
        "total": 1099511627776,
        "used": 549755813888,
        "free": 549755813888,
        "percent": 50.0
      }
    }
  },
  "processes": {
    "total": 256,
    "running": 4
  },
  "system": {
    "uptime": 86400,
    "hostname": "server1",
    "kernel": "5.15.0-56-generic",
    "architecture": "amd64"
  },
  "network": {
    "bytes_sent": 1000000000,
    "bytes_received": 2000000000
  }
}
```

#### Protocolo WebSocket

**Autenticação**
```json
// Cliente envia
{
  "type": "auth",
  "password": "admin123"
}

// Servidor responde
{
  "type": "auth",
  "status": "success"
}
// ou
{
  "type": "auth",
  "error": "Invalid password"
}
```

**Métricas**
```json
{
  "type": "metrics",
  "data": { /* SystemMetrics */ }
}
```

#### Banco de Dados

**Tabela: metrics**
```sql
CREATE TABLE metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  cpu_percent REAL NOT NULL,
  memory_percent REAL NOT NULL,
  disk_percent REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Índices**
- `idx_timestamp`: Para queries rápidas por período

### Frontend Dashboard (Next.js)

#### Arquitetura de Componentes

```
app/
├── layout.tsx                 # Layout raiz
├── page.tsx                   # Redirect para login/dashboard
├── login/
│   └── page.tsx              # Página de autenticação
└── dashboard/
    ├── layout.tsx            # Layout do dashboard
    ├── page.tsx              # Overview (todos os servidores)
    ├── servers/
    │   └── page.tsx          # Gerenciamento de servidores
    └── server/
        └── [id]/
            └── page.tsx      # Detalhes de um servidor

components/
├── ui/
│   ├── Sidebar.tsx           # Navegação lateral
│   ├── ServerCard.tsx        # Card de servidor
│   └── AddServerModal.tsx    # Modal para adicionar servidor

lib/
├── store.ts                  # Zustand store (estado global)
└── useWebSocket.ts           # Hook para conexão WebSocket
```

#### Fluxo de Estado

```
┌─────────────────────────────────────────┐
│  Zustand Store (useAppStore)            │
│                                         │
│  - isAuthenticated                      │
│  - adminPassword                        │
│  - servers: Server[]                    │
│  - metrics: ServerMetrics               │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
┌──────────────┐ ┌──────────────┐
│ Components   │ │ Hooks        │
│ (read/write) │ │ (useWebSocket)
└──────────────┘ └──────────────┘
```

#### Fluxo de Dados

```
1. Login
   └─→ setAuthenticated(true)
       └─→ setAdminPassword(password)
           └─→ saveToLocalStorage()

2. Adicionar Servidor
   └─→ addServer(server)
       └─→ saveToLocalStorage()

3. Conectar ao Servidor
   └─→ useWebSocket(serverId, ip, port, password)
       ├─→ WebSocket.open()
       ├─→ Enviar auth message
       ├─→ WebSocket.onmessage()
       │   └─→ setMetrics(serverId, metrics)
       └─→ WebSocket.onclose()
           └─→ setServerOnline(serverId, false)
               └─→ Reconectar em 5s

4. Exibir Dados
   └─→ getMetrics(serverId)
       └─→ Renderizar gráficos
```

#### Estrutura de Tipos

**Server**
```typescript
interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
  password: string;
  online: boolean;
  lastUpdate: number;
}
```

**SystemMetrics** (mesmo do backend)

**AppStore**
```typescript
interface AppStore {
  // Auth
  isAuthenticated: boolean;
  adminPassword: string;
  setAuthenticated: (value: boolean) => void;
  setAdminPassword: (password: string) => void;

  // Servers
  servers: Server[];
  addServer: (server: Server) => void;
  removeServer: (id: string) => void;
  updateServer: (id: string, updates: Partial<Server>) => void;

  // Metrics
  metrics: ServerMetrics;
  setMetrics: (serverId: string, metrics: SystemMetrics) => void;
  getMetrics: (serverId: string) => SystemMetrics | undefined;

  // Storage
  loadFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
}
```

## Segurança

### Autenticação

1. **Backend**: Senha armazenada em hash SHA256
2. **Frontend**: Senha armazenada em localStorage (apenas para reconexão)
3. **Transmissão**: WebSocket com suporte a TLS (wss://)

### Validação

- Inputs validados no frontend
- Inputs validados no backend
- Proteção contra SQL injection (prepared statements)
- CORS configurado para aceitar origem do dashboard

## Performance

### Backend

- **Coleta**: 5 segundos (configurável)
- **Broadcast**: Apenas para clientes autenticados
- **Armazenamento**: SQLite com índices
- **Memória**: ~10MB em repouso
- **CPU**: <1% em repouso

### Frontend

- **Renderização**: React com memoização
- **Gráficos**: Recharts com otimização
- **Estado**: Zustand (leve e rápido)
- **Histórico**: Últimos 60 pontos em memória

## Escalabilidade

### Múltiplos Servidores

- Cada servidor tem seu próprio agente
- Dashboard conecta a todos simultaneamente
- Reconexão automática em caso de falha
- Histórico local em cada servidor

### Múltiplos Clientes

- Hub gerencia múltiplas conexões
- Broadcast eficiente via canais Go
- Sem limite teórico de clientes

## Deployment

### Backend

```bash
# Instalação
curl -fsSL https://domain.com/install.sh | sudo bash -s -- --port 8765 --password senha

# Systemd service
/etc/systemd/system/server-monitor-agent.service

# Logs
journalctl -u server-monitor-agent -f
```

### Frontend

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start

# Docker (futuro)
docker build -t server-monitor-dashboard .
docker run -p 3000:3000 server-monitor-dashboard
```

## Monitoramento

### Métricas Coletadas

- CPU: Uso, load average, cores
- Memória: Total, usada, livre, buffers, cache
- Disco: Total, usado, livre, percentual
- Processos: Total, em execução
- Sistema: Uptime, hostname, kernel, arquitetura
- Rede: Bytes enviados/recebidos

### Histórico

- Armazenado em SQLite
- Retenção: Configurável (padrão: 7 dias)
- Granularidade: 5 segundos
- Compressão: Não (pode ser adicionada)

## Extensibilidade

### Adicionar Novas Métricas

1. **Backend**: Adicionar função em `main.go`
2. **Estrutura**: Adicionar campo em `SystemMetrics`
3. **Frontend**: Adicionar visualização em componentes

### Adicionar Alertas

1. Implementar threshold checking no backend
2. Enviar mensagem de alerta via WebSocket
3. Exibir notificação no frontend

### Adicionar Autenticação OAuth

1. Implementar provider OAuth no backend
2. Adicionar login OAuth no frontend
3. Usar token JWT para autenticação

## Troubleshooting

### Conexão WebSocket Falha

1. Verificar firewall
2. Verificar porta aberta
3. Verificar senha
4. Verificar logs do backend

### Métricas Não Aparecem

1. Verificar se agente está rodando
2. Verificar se dashboard está conectado
3. Verificar console do navegador
4. Verificar logs do backend

### Alto Uso de CPU/Memória

1. Aumentar intervalo de coleta
2. Reduzir número de histórico
3. Limpar banco de dados antigo
4. Verificar número de conexões

## Referências

- [Go net/http](https://golang.org/pkg/net/http/)
- [Gorilla WebSocket](https://github.com/gorilla/websocket)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Zustand](https://github.com/pmndrs/zustand)
- [Recharts](https://recharts.org/)
