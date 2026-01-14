# Instalação Manual do Server Monitor Agent

Este guia detalha como instalar e configurar manualmente o Server Monitor Agent.

## Pré-requisitos

- Ubuntu 20.04+ (ou outra distribuição Linux com systemd)
- Acesso root (sudo)
- curl ou wget instalado

## 1. Download do Binário

### Detectar sua arquitetura

```bash
uname -m
```

- Se retornar `x86_64`: use o binário `server-monitor-agent-linux-amd64`
- Se retornar `aarch64` ou `arm64`: use o binário `server-monitor-agent-linux-arm64`

### Baixar o binário

**Para x86_64 (Intel/AMD):**
```bash
sudo mkdir -p /opt/server-monitor
sudo curl -fsSL https://github.com/qwerthierrysecret/server-monitor/raw/main/backend/server-monitor-agent-linux-amd64 -o /opt/server-monitor/server-monitor-agent
sudo chmod +x /opt/server-monitor/server-monitor-agent
```

**Para ARM64:**
```bash
sudo mkdir -p /opt/server-monitor
sudo curl -fsSL https://github.com/qwerthierrysecret/server-monitor/raw/main/backend/server-monitor-agent-linux-arm64 -o /opt/server-monitor/server-monitor-agent
sudo chmod +x /opt/server-monitor/server-monitor-agent
```

## 2. Criar Diretório para Banco de Dados

```bash
sudo mkdir -p /var/lib/server-monitor
```

## 3. Criar Arquivo de Configuração (Opcional)

```bash
sudo nano /opt/server-monitor/config.env
```

Adicione o seguinte conteúdo:

```bash
PORT=8765
PASSWORD=sua_senha_segura
DB_PATH=/var/lib/server-monitor/metrics.db
COLLECT_INTERVAL=5
HOST=0.0.0.0
```

Salve com `Ctrl+O`, Enter, e saia com `Ctrl+X`.

Proteja o arquivo:
```bash
sudo chmod 600 /opt/server-monitor/config.env
```

## 4. Testar o Binário Manualmente

Antes de criar o serviço, teste se o binário funciona:

```bash
cd /opt/server-monitor
sudo ./server-monitor-agent --port 8765 --password teste123 --db /tmp/test.db
```

Você deve ver:
```
Server Monitor Agent starting on 0.0.0.0:8765
```

Pressione `Ctrl+C` para parar.

## 5. Criar Serviço Systemd

Crie o arquivo de serviço:

```bash
sudo nano /etc/systemd/system/server-monitor-agent.service
```

Adicione o seguinte conteúdo (ajuste PORT, PASSWORD e DB_PATH conforme necessário):

```ini
[Unit]
Description=Server Monitor Agent
After=network.target
Documentation=https://github.com/qwerthierrysecret/server-monitor

[Service]
Type=simple
User=root
WorkingDirectory=/opt/server-monitor
ExecStart=/opt/server-monitor/server-monitor-agent --port 8765 --password SUA_SENHA_AQUI --db /var/lib/server-monitor/metrics.db
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=server-monitor-agent

# Limites de recursos
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

**IMPORTANTE:** Substitua `SUA_SENHA_AQUI` pela sua senha real!

Salve com `Ctrl+O`, Enter, e saia com `Ctrl+X`.

## 6. Habilitar e Iniciar o Serviço

```bash
# Recarregar systemd
sudo systemctl daemon-reload

# Habilitar para iniciar no boot
sudo systemctl enable server-monitor-agent

# Iniciar o serviço
sudo systemctl start server-monitor-agent

# Verificar status
sudo systemctl status server-monitor-agent
```

Você deve ver:
```
● server-monitor-agent.service - Server Monitor Agent
     Loaded: loaded (/etc/systemd/system/server-monitor-agent.service; enabled)
     Active: active (running) since ...
```

## 7. Verificar Logs

```bash
# Ver logs em tempo real
sudo journalctl -u server-monitor-agent -f

# Ver últimas 50 linhas
sudo journalctl -u server-monitor-agent -n 50

# Ver logs desde o último boot
sudo journalctl -u server-monitor-agent -b
```

## 8. Testar a Conexão

```bash
curl http://localhost:8765/health
```

Deve retornar:
```json
{"status":"ok"}
```

## 9. Configurar Firewall (se necessário)

Se você usar UFW:

```bash
sudo ufw allow 8765/tcp
sudo ufw reload
```

Se você usar firewalld:

```bash
sudo firewall-cmd --permanent --add-port=8765/tcp
sudo firewall-cmd --reload
```

## 10. Adicionar no Dashboard

Agora você pode adicionar este servidor no dashboard:

1. Acesse o dashboard: http://localhost:3000
2. Faça login
3. Clique em "Add Server"
4. Preencha:
   - **Nome**: Nome do servidor (ex: "Web Server")
   - **IP**: IP do servidor (use `hostname -I` para descobrir)
   - **Porta**: 8765 (ou a porta que você configurou)
   - **Senha**: A senha que você configurou

## Comandos Úteis

### Gerenciar o Serviço

```bash
# Ver status
sudo systemctl status server-monitor-agent

# Parar
sudo systemctl stop server-monitor-agent

# Iniciar
sudo systemctl start server-monitor-agent

# Reiniciar
sudo systemctl restart server-monitor-agent

# Desabilitar (não iniciar no boot)
sudo systemctl disable server-monitor-agent

# Habilitar (iniciar no boot)
sudo systemctl enable server-monitor-agent
```

### Ver Logs

```bash
# Logs em tempo real
sudo journalctl -u server-monitor-agent -f

# Últimas 100 linhas
sudo journalctl -u server-monitor-agent -n 100

# Logs de hoje
sudo journalctl -u server-monitor-agent --since today

# Logs com prioridade de erro
sudo journalctl -u server-monitor-agent -p err
```

### Verificar Recursos

```bash
# Uso de CPU e memória
ps aux | grep server-monitor-agent

# Conexões de rede
sudo netstat -tlnp | grep 8765

# Arquivos abertos
sudo lsof -p $(pgrep server-monitor-agent)
```

## Troubleshooting

### Serviço não inicia

1. Verifique os logs:
```bash
sudo journalctl -u server-monitor-agent -n 50
```

2. Teste o binário manualmente:
```bash
cd /opt/server-monitor
sudo ./server-monitor-agent --port 8765 --password teste --db /tmp/test.db
```

3. Verifique permissões:
```bash
ls -l /opt/server-monitor/server-monitor-agent
# Deve mostrar: -rwxr-xr-x
```

### Porta já em uso

Verifique qual processo está usando a porta:
```bash
sudo netstat -tlnp | grep 8765
```

Escolha outra porta ou pare o processo conflitante.

### Erro de permissão no banco de dados

Verifique permissões do diretório:
```bash
sudo ls -ld /var/lib/server-monitor
sudo ls -l /var/lib/server-monitor/
```

Corrija permissões se necessário:
```bash
sudo chown -R root:root /var/lib/server-monitor
sudo chmod 755 /var/lib/server-monitor
```

### Dashboard não conecta

1. Verifique se o serviço está rodando:
```bash
sudo systemctl status server-monitor-agent
```

2. Teste a conexão localmente:
```bash
curl http://localhost:8765/health
```

3. Verifique firewall:
```bash
sudo ufw status
```

4. Verifique se a senha está correta

## Desinstalação

```bash
# Parar e desabilitar serviço
sudo systemctl stop server-monitor-agent
sudo systemctl disable server-monitor-agent

# Remover arquivos
sudo rm /etc/systemd/system/server-monitor-agent.service
sudo rm -rf /opt/server-monitor
sudo rm -rf /var/lib/server-monitor

# Recarregar systemd
sudo systemctl daemon-reload
```

## Atualização

Para atualizar para uma nova versão:

```bash
# Parar serviço
sudo systemctl stop server-monitor-agent

# Baixar nova versão
sudo curl -fsSL https://github.com/qwerthierrysecret/server-monitor/raw/main/backend/server-monitor-agent-linux-amd64 -o /opt/server-monitor/server-monitor-agent
sudo chmod +x /opt/server-monitor/server-monitor-agent

# Iniciar serviço
sudo systemctl start server-monitor-agent

# Verificar versão nos logs
sudo journalctl -u server-monitor-agent -n 20
```

## Suporte

Para problemas ou dúvidas:
- Consulte os logs: `sudo journalctl -u server-monitor-agent -n 100`
- Abra uma issue no GitHub: https://github.com/qwerthierrysecret/server-monitor/issues
- Verifique a documentação completa no repositório
