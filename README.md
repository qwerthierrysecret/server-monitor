# Server Monitor

Um sistema completo de monitoramento em tempo real para servidores Ubuntu, com dashboard web moderno e agente leve baseado em Go.

## 🎯 Visão Geral

O **Server Monitor** é dividido em duas partes principais:

- **Backend (Agent)**: Agente Go que coleta métricas do sistema e expõe dados via WebSocket autenticado
- **Frontend (Dashboard)**: Dashboard Next.js moderno com tema escuro, gráficos em tempo real e gerenciamento de múltiplos servidores

## ✨ Características

### Backend
- ✅ Coleta de métricas em tempo real (CPU, memória, disco, rede, processos)
- ✅ WebSocket autenticado para comunicação segura
- ✅ Histórico de métricas em SQLite
- ✅ Instalação simples com um comando
- ✅ Serviço systemd automático
- ✅ Binário estático compatível com Ubuntu 20.04+
- ✅ Overhead mínimo

### Frontend
- ✅ Dashboard centralizado para múltiplos servidores
- ✅ Visualização em tempo real via WebSocket
- ✅ Gráficos interativos com Recharts
- ✅ Interface responsiva e dark theme
- ✅ Autenticação de administrador
- ✅ Gerenciamento de servidores (adicionar, editar, remover)
- ✅ Histórico de métricas

## 🚀 Quick Start

### Instalação do Backend

Em cada servidor Ubuntu que você deseja monitorar, execute:

```bash
curl -fsSL https://your-domain.com/install.sh | sudo bash -s -- --port 8765 --password sua_senha_segura
```

Ou manualmente:

```bash
# Clone o repositório
git clone https://github.com/yourusername/server-monitor.git
cd server-monitor/backend

# Compile
make build

# Instale
sudo cp server-monitor-agent /opt/server-monitor/
sudo systemctl start server-monitor-agent
```

### Execução do Frontend

```bash
cd frontend

# Instale dependências
npm install

# Desenvolvimento
npm run dev

# Build para produção
npm run build
npm start
```

Acesse em `http://localhost:3000`

## 📋 Requisitos

### Backend
- Ubuntu 20.04 ou superior
- Go 1.21+ (para compilação)
- SQLite3

### Frontend
- Node.js 18+
- npm ou yarn

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     Dashboard Frontend                       │
│                    (Next.js + React)                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Login → Dashboard → Server Details → Management     │   │
│  │  (Dark Theme, Responsive, Real-time Charts)          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           ↕ WebSocket (Autenticado)
┌─────────────────────────────────────────────────────────────┐
│                  Backend Agents (Go)                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Coleta de Métricas → SQLite → WebSocket Server      │   │
│  │  (CPU, Memória, Disco, Rede, Processos)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Servidor 1 | Servidor 2 | Servidor 3 | ... Servidor N      │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Métricas Coletadas

### CPU
- Uso total (%)
- Load average (1m, 5m, 15m)
- Número de cores/threads

### Memória
- Total
- Usada
- Livre
- Disponível
- Buffers
- Cached

### Disco
- Total
- Usado
- Livre
- Percentual por ponto de montagem

### Processos
- Total de processos
- Processos em execução

### Sistema
- Uptime
- Hostname
- Kernel
- Arquitetura

### Rede
- Bytes enviados/recebidos

## 🔐 Segurança

- Autenticação obrigatória via senha (hash SHA256)
- WebSocket com suporte a TLS (preparado para futura expansão)
- Validação de inputs no frontend
- Armazenamento seguro de credenciais localmente

## 📁 Estrutura do Projeto

```
server-monitor/
├── backend/
│   ├── main.go              # Agente principal
│   ├── go.mod               # Dependências Go
│   ├── Makefile             # Build scripts
│   └── README.md            # Documentação backend
├── frontend/
│   ├── app/
│   │   ├── login/           # Página de login
│   │   ├── dashboard/       # Dashboard principal
│   │   ├── layout.tsx       # Layout raiz
│   │   ├── globals.css      # Estilos globais
│   │   └── page.tsx         # Página inicial
│   ├── components/
│   │   └── ui/              # Componentes reutilizáveis
│   ├── lib/
│   │   ├── store.ts         # Zustand store
│   │   └── useWebSocket.ts  # Hook WebSocket
│   ├── package.json         # Dependências npm
│   ├── tsconfig.json        # Configuração TypeScript
│   ├── tailwind.config.js   # Configuração Tailwind
│   └── next.config.js       # Configuração Next.js
├── scripts/
│   ├── install.sh           # Script de instalação
│   └── uninstall.sh         # Script de desinstalação
├── docs/
│   └── ARCHITECTURE.md      # Documentação arquitetura
├── README.md                # Este arquivo
└── .gitignore              # Git ignore
```

## 🔧 Configuração

### Backend

#### Variáveis de Ambiente
```bash
PORT=8765                    # Porta WebSocket
PASSWORD=admin123            # Senha de autenticação
DB_PATH=/var/lib/server-monitor/metrics.db  # Caminho do banco
```

#### Instalação com Opções
```bash
sudo bash install.sh --port 9000 --password minha_senha
```

### Frontend

#### Variáveis de Ambiente
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 📈 Uso

### Adicionar Servidor

1. Acesse o dashboard
2. Clique em "Add Server"
3. Preencha os dados:
   - Nome amigável
   - IP/Hostname
   - Porta (padrão: 8765)
   - Senha do agente

### Visualizar Métricas

- **Overview**: Painel geral com cards de todos os servidores
- **Detalhes**: Clique em um servidor para ver gráficos e informações detalhadas
- **Gerenciamento**: Edite nomes ou remova servidores

## 🛠️ Desenvolvimento

### Backend

```bash
cd backend

# Instalar dependências
go mod download

# Compilar
make build

# Executar
make run

# Limpar
make clean
```

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Desenvolvimento com hot reload
npm run dev

# Build
npm run build

# Produção
npm start
```

## 📝 Logs

### Backend
```bash
# Ver logs em tempo real
journalctl -u server-monitor-agent -f

# Ver últimas 100 linhas
journalctl -u server-monitor-agent -n 100
```

### Frontend
```bash
# Logs do console do navegador (F12)
# Logs do servidor Next.js aparecem no terminal
```

## 🚨 Troubleshooting

### Agente não conecta

```bash
# Verificar status do serviço
systemctl status server-monitor-agent

# Verificar se a porta está aberta
netstat -tlnp | grep 8765

# Verificar logs
journalctl -u server-monitor-agent -n 50
```

### Dashboard não carrega dados

1. Verifique se o agente está rodando
2. Confirme IP e porta corretos
3. Verifique a senha
4. Abra o console do navegador (F12) para ver erros

### Erro de conexão WebSocket

- Verifique firewall
- Confirme que a porta está aberta
- Verifique se o agente está escutando em 0.0.0.0

## 🔄 Atualização

### Backend
```bash
# Parar o serviço
sudo systemctl stop server-monitor-agent

# Atualizar binário
sudo cp novo-binario /opt/server-monitor/server-monitor-agent

# Iniciar novamente
sudo systemctl start server-monitor-agent
```

### Frontend
```bash
# Atualizar código
git pull

# Reinstalar dependências
npm install

# Build
npm run build

# Reiniciar
npm start
```

## 🗑️ Desinstalação

### Backend
```bash
sudo bash /opt/server-monitor/uninstall.sh
```

### Frontend
```bash
# Simplesmente delete a pasta do projeto
rm -rf server-monitor
```

## 📊 Performance

- **Backend**: ~5-10MB de RAM, <1% CPU (em repouso)
- **Frontend**: ~100MB de RAM (navegador)
- **Coleta de métricas**: A cada 5 segundos (configurável)
- **Histórico**: Últimos 7 dias (configurável)

## 🚀 Melhorias Futuras

- [ ] Suporte a TLS/SSL
- [ ] Alertas e notificações
- [ ] Exportação de relatórios
- [ ] Autenticação OAuth2
- [ ] Suporte a múltiplos usuários
- [ ] API REST adicional
- [ ] Suporte a Docker
- [ ] Backup automático de métricas
- [ ] Integração com Prometheus
- [ ] Dashboard em tempo real com WebGL

## 📄 Licença

MIT License - Veja LICENSE para detalhes

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📧 Suporte

Para reportar bugs ou sugerir melhorias, abra uma issue no GitHub.

## 👨‍💻 Autor

Desenvolvido com ❤️ para monitoramento eficiente de servidores.

---

**Versão**: 1.0.0  
**Última atualização**: 2024
