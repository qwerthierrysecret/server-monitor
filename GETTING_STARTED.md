# Getting Started - Server Monitor

## 🎯 Início Rápido

### 1. Backend (Agente de Monitoramento)

#### Instalação em um servidor Ubuntu

```bash
# Instalação automática (recomendado)
curl -fsSL https://your-domain.com/install.sh | sudo bash -s -- \
  --port 8765 \
  --password sua_senha_segura

# Ou instalação manual
cd /home/ubuntu/server-monitor/backend
make build
sudo mkdir -p /opt/server-monitor
sudo cp server-monitor-agent /opt/server-monitor/
sudo systemctl start server-monitor-agent
```

#### Verificar se está rodando

```bash
# Status do serviço
sudo systemctl status server-monitor-agent

# Ver logs
journalctl -u server-monitor-agent -f

# Testar conexão
curl http://localhost:8765/health
```

### 2. Frontend (Dashboard)

#### Instalação local

```bash
cd /home/ubuntu/server-monitor/frontend

# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Acesse: http://localhost:3000
```

#### Login

- Senha: A mesma senha configurada no backend (padrão: admin123)

#### Adicionar Servidor

1. Clique em "Add Server"
2. Preencha:
   - **Nome**: Nome amigável (ex: "Web Server")
   - **IP**: IP ou hostname do servidor
   - **Porta**: 8765 (ou a porta configurada)
   - **Senha**: Senha do agente naquele servidor

### 3. Visualizar Métricas

- **Overview**: Painel com todos os servidores
- **Detalhes**: Clique em um servidor para ver gráficos
- **Gerenciamento**: Edite nomes ou remova servidores

## 📊 Exemplo de Uso Completo

### Cenário: Monitorar 2 Servidores

**Servidor 1 (192.168.1.10)**
```bash
curl -fsSL https://your-domain.com/install.sh | sudo bash -s -- \
  --port 8765 \
  --password "senha_servidor1"
```

**Servidor 2 (192.168.1.20)**
```bash
curl -fsSL https://your-domain.com/install.sh | sudo bash -s -- \
  --port 8765 \
  --password "senha_servidor2"
```

**Dashboard Local**
```bash
cd frontend
npm run dev
# Acesse http://localhost:3000
```

**Adicione os servidores:**
1. Login com qualquer senha (será usada para o dashboard)
2. Clique "Add Server"
3. Servidor 1:
   - Nome: "Web Server"
   - IP: 192.168.1.10
   - Porta: 8765
   - Senha: senha_servidor1
4. Servidor 2:
   - Nome: "DB Server"
   - IP: 192.168.1.20
   - Porta: 8765
   - Senha: senha_servidor2

## 🔧 Configuração Avançada

### Backend

**Variáveis de linha de comando:**
```bash
./server-monitor-agent \
  --port 8765 \
  --password minha_senha \
  --db /var/lib/server-monitor/metrics.db
```

**Arquivo de configuração:**
```bash
# /opt/server-monitor/config.env
PORT=8765
PASSWORD=minha_senha
DB_PATH=/var/lib/server-monitor/metrics.db
```

### Frontend

**Build para produção:**
```bash
cd frontend
npm run build
npm start
```

**Com Docker:**
```bash
docker build -t server-monitor-dashboard .
docker run -p 3000:3000 server-monitor-dashboard
```

## 📈 Monitorando Métricas

### Disponíveis em Tempo Real

- **CPU**: Uso %, Load Average
- **Memória**: Total, Usada, Livre
- **Disco**: Total, Usado, Livre
- **Processos**: Total, Em Execução
- **Sistema**: Uptime, Hostname, Kernel
- **Rede**: Bytes Enviados/Recebidos

### Histórico

- Armazenado em SQLite no servidor
- Disponível para análise histórica
- Retenção configurável

## 🚨 Troubleshooting

### Backend não conecta

```bash
# Verificar se está rodando
ps aux | grep server-monitor-agent

# Verificar porta
sudo netstat -tlnp | grep 8765

# Verificar firewall
sudo ufw allow 8765/tcp

# Logs
journalctl -u server-monitor-agent -n 100
```

### Dashboard não carrega dados

1. Verifique IP e porta corretos
2. Confirme a senha
3. Abra console do navegador (F12)
4. Verifique se o firewall permite a conexão

### Erro de permissão

```bash
# Certifique-se de usar sudo
sudo bash install.sh --port 8765 --password senha
```

## 📚 Documentação Completa

- [README.md](./README.md) - Visão geral completa
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Arquitetura técnica
- [docs/INSTALLATION.md](./docs/INSTALLATION.md) - Guia de instalação detalhado

## 🔐 Segurança

- Senhas são hashadas com SHA256
- WebSocket preparado para TLS
- Validação de inputs
- Sem exposição de dados sem autenticação

## 💡 Dicas

1. **Múltiplos Dashboards**: Você pode executar múltiplos dashboards conectados aos mesmos servidores
2. **Diferentes Senhas**: Use senhas diferentes para cada servidor
3. **Firewall**: Abra apenas a porta necessária (padrão: 8765)
4. **Backup**: Faça backup do banco de dados SQLite periodicamente
5. **Logs**: Monitore os logs do systemd para diagnosticar problemas

## 🆘 Suporte

Para problemas:
1. Consulte a documentação
2. Verifique os logs
3. Abra uma issue no GitHub
4. Verifique o console do navegador (F12)

## 📝 Próximos Passos

- [ ] Configurar TLS/SSL
- [ ] Adicionar alertas
- [ ] Exportar relatórios
- [ ] Integrar com Prometheus
- [ ] Configurar backup automático

---

**Versão**: 1.0.0  
**Última atualização**: 14 de Janeiro de 2026
