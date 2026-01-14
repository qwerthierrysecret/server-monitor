# Guia de Instalação

## Backend (Agent)

### Instalação Rápida (Recomendado)

Em cada servidor Ubuntu que você deseja monitorar:

```bash
curl -fsSL https://your-domain.com/install.sh | sudo bash -s -- --port 8765 --password sua_senha_segura
```

### Instalação Manual

#### 1. Pré-requisitos

```bash
# Ubuntu 20.04+
sudo apt-get update
sudo apt-get install -y build-essential sqlite3
```

#### 2. Download do Binário

```bash
# Criar diretório
sudo mkdir -p /opt/server-monitor
cd /opt/server-monitor

# Download (substitua com URL real)
sudo wget https://github.com/yourusername/server-monitor/releases/download/v1.0.0/server-monitor-agent-linux-amd64
sudo chmod +x server-monitor-agent
```

#### 3. Criar Banco de Dados

```bash
sudo mkdir -p /var/lib/server-monitor
sudo touch /var/lib/server-monitor/metrics.db
sudo chown -R root:root /var/lib/server-monitor
sudo chmod 755 /var/lib/server-monitor
```

#### 4. Criar Serviço Systemd

```bash
sudo tee /etc/systemd/system/server-monitor-agent.service > /dev/null << EOF
[Unit]
Description=Server Monitor Agent
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/server-monitor
ExecStart=/opt/server-monitor/server-monitor-agent --port 8765 --password sua_senha_segura --db /var/lib/server-monitor/metrics.db
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

#### 5. Ativar e Iniciar

```bash
sudo systemctl daemon-reload
sudo systemctl enable server-monitor-agent
sudo systemctl start server-monitor-agent
```

#### 6. Verificar Status

```bash
sudo systemctl status server-monitor-agent
journalctl -u server-monitor-agent -f
```

### Compilação do Binário

Se você quiser compilar o agente:

```bash
# Pré-requisitos
sudo apt-get install -y golang-go build-essential

# Clone o repositório
git clone https://github.com/yourusername/server-monitor.git
cd server-monitor/backend

# Compile
make build

# Ou compile estático
make build-static

# Copie para o local de instalação
sudo cp server-monitor-agent /opt/server-monitor/
```

### Configuração

#### Variáveis de Ambiente

```bash
# Editar arquivo de configuração
sudo nano /opt/server-monitor/config.env
```

```env
PORT=8765
PASSWORD=sua_senha_segura
DB_PATH=/var/lib/server-monitor/metrics.db
```

#### Opções de Linha de Comando

```bash
./server-monitor-agent --help

Flags:
  --port int
        WebSocket server port (default 8765)
  --password string
        Authentication password (default "admin123")
  --db string
        SQLite database path (default "/var/lib/server-monitor/metrics.db")
```

### Verificação de Instalação

```bash
# Verificar se o serviço está rodando
systemctl is-active server-monitor-agent

# Verificar se a porta está aberta
sudo netstat -tlnp | grep 8765

# Testar conexão WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:8765/ws

# Verificar logs
journalctl -u server-monitor-agent -n 50
```

## Frontend (Dashboard)

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Git

### Instalação Local

#### 1. Clone o Repositório

```bash
git clone https://github.com/yourusername/server-monitor.git
cd server-monitor/frontend
```

#### 2. Instale Dependências

```bash
npm install
```

#### 3. Configuração

```bash
# Criar arquivo de configuração
cp .env.example .env.local
```

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### 4. Desenvolvimento

```bash
npm run dev
```

Acesse em `http://localhost:3000`

#### 5. Build para Produção

```bash
npm run build
npm start
```

### Deployment em Produção

#### Opção 1: Servidor Standalone

```bash
# Build
npm run build

# Iniciar com PM2
npm install -g pm2
pm2 start npm --name "server-monitor" -- start
pm2 save
pm2 startup
```

#### Opção 2: Docker

```bash
# Criar Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY .next ./.next
COPY public ./public

EXPOSE 3000

CMD ["npm", "start"]
EOF

# Build
docker build -t server-monitor-dashboard .

# Run
docker run -p 3000:3000 server-monitor-dashboard
```

#### Opção 3: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Verificação de Instalação

```bash
# Verificar se está rodando
curl http://localhost:3000

# Verificar logs
npm run dev  # Vê os logs no console
```

## Configuração Completa

### Cenário: 3 Servidores + 1 Dashboard

#### Servidor 1 (Web Server)

```bash
curl -fsSL https://your-domain.com/install.sh | sudo bash -s -- \
  --port 8765 \
  --password "web_server_password"
```

#### Servidor 2 (Database Server)

```bash
curl -fsSL https://your-domain.com/install.sh | sudo bash -s -- \
  --port 8765 \
  --password "db_server_password"
```

#### Servidor 3 (Cache Server)

```bash
curl -fsSL https://your-domain.com/install.sh | sudo bash -s -- \
  --port 8765 \
  --password "cache_server_password"
```

#### Dashboard (Máquina Local)

```bash
git clone https://github.com/yourusername/server-monitor.git
cd server-monitor/frontend
npm install
npm run dev
```

Acesse `http://localhost:3000` e adicione os 3 servidores:

1. **Web Server**
   - Nome: Web Server
   - IP: 192.168.1.10
   - Porta: 8765
   - Senha: web_server_password

2. **Database Server**
   - Nome: Database Server
   - IP: 192.168.1.20
   - Porta: 8765
   - Senha: db_server_password

3. **Cache Server**
   - Nome: Cache Server
   - IP: 192.168.1.30
   - Porta: 8765
   - Senha: cache_server_password

## Troubleshooting

### Backend não inicia

```bash
# Verificar erros
journalctl -u server-monitor-agent -n 50 --no-pager

# Verificar permissões
ls -la /opt/server-monitor/
ls -la /var/lib/server-monitor/

# Testar manualmente
sudo /opt/server-monitor/server-monitor-agent --port 8765 --password test
```

### Porta já em uso

```bash
# Encontrar processo usando a porta
sudo lsof -i :8765

# Matar processo
sudo kill -9 <PID>

# Ou usar porta diferente
sudo systemctl stop server-monitor-agent
# Editar /etc/systemd/system/server-monitor-agent.service
# Mudar --port 8765 para --port 9000
sudo systemctl daemon-reload
sudo systemctl start server-monitor-agent
```

### Firewall bloqueando conexão

```bash
# UFW
sudo ufw allow 8765/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 8765 -j ACCEPT

# Verificar
sudo ufw status
```

### Dashboard não conecta ao backend

1. Verificar IP correto
2. Verificar porta correta
3. Verificar senha correta
4. Verificar firewall
5. Verificar logs do backend

```bash
# Testar conectividade
telnet 192.168.1.10 8765

# Ou com nc
nc -zv 192.168.1.10 8765
```

### Erro de permissão ao instalar

```bash
# Certifique-se de usar sudo
sudo bash install.sh --port 8765 --password senha

# Ou execute como root
su -
bash install.sh --port 8765 --password senha
```

## Próximos Passos

1. Adicione múltiplos servidores ao dashboard
2. Configure alertas (futuro)
3. Configure backup de dados (futuro)
4. Configure TLS/SSL (futuro)
5. Configure autenticação avançada (futuro)

## Suporte

Para problemas, verifique:

- [Issues no GitHub](https://github.com/yourusername/server-monitor/issues)
- [Documentação de Arquitetura](./ARCHITECTURE.md)
- [README Principal](../README.md)
