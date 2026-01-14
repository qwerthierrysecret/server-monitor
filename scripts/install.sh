#!/bin/bash

# Server Monitor Agent - Script de Instalação
# Instala o agente de monitoramento como serviço systemd

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis padrão
INSTALL_DIR="/opt/server-monitor"
SERVICE_NAME="server-monitor-agent"
GITHUB_REPO="qwerthierrysecret/server-monitor"
VERSION="latest"

# Parâmetros configuráveis
PORT=8765
PASSWORD=""
DB_PATH="/var/lib/server-monitor/metrics.db"

# Função para exibir mensagens
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Função para exibir ajuda
show_help() {
    cat << EOF
Uso: $0 [OPÇÕES]

Opções:
  --port PORT           Porta do servidor WebSocket (padrão: 8765)
  --password SENHA      Senha para autenticação (obrigatório)
  --db PATH             Caminho do banco de dados (padrão: /var/lib/server-monitor/metrics.db)
  --version VERSION     Versão para instalar (padrão: latest)
  -h, --help            Exibe esta ajuda

Exemplos:
  $0 --password minha_senha
  $0 --port 9000 --password minha_senha --db /data/metrics.db

EOF
    exit 0
}

# Parse de argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            PORT="$2"
            shift 2
            ;;
        --password)
            PASSWORD="$2"
            shift 2
            ;;
        --db)
            DB_PATH="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            log_error "Opção desconhecida: $1"
            show_help
            ;;
    esac
done

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   log_error "Este script precisa ser executado como root (use sudo)"
   exit 1
fi

# Verificar senha obrigatória
if [[ -z "$PASSWORD" ]]; then
    log_error "Senha é obrigatória! Use --password SENHA"
    exit 1
fi

log_info "Iniciando instalação do Server Monitor Agent..."

# Detectar arquitetura
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        BINARY_NAME="server-monitor-agent-linux-amd64"
        ;;
    aarch64|arm64)
        BINARY_NAME="server-monitor-agent-linux-arm64"
        ;;
    *)
        log_error "Arquitetura não suportada: $ARCH"
        log_error "Arquiteturas suportadas: x86_64, arm64"
        exit 1
        ;;
esac

log_info "Arquitetura detectada: $ARCH"
log_info "Binário a ser instalado: $BINARY_NAME"

# Criar diretórios
log_info "Criando diretórios..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$(dirname "$DB_PATH")"

# Baixar binário do GitHub
log_info "Baixando binário do GitHub..."
DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/raw/main/backend/${BINARY_NAME}"
log_info "URL: $DOWNLOAD_URL"

if ! curl -fsSL "$DOWNLOAD_URL" -o "${INSTALL_DIR}/server-monitor-agent"; then
    log_error "Falha ao baixar o binário do GitHub"
    log_error "Verifique se o repositório está público e o arquivo existe"
    exit 1
fi

# Tornar executável
chmod +x "${INSTALL_DIR}/server-monitor-agent"

log_info "Binário instalado em: ${INSTALL_DIR}/server-monitor-agent"

# Criar arquivo de configuração
log_info "Criando arquivo de configuração..."
cat > "${INSTALL_DIR}/config.env" << EOF
PORT=${PORT}
PASSWORD=${PASSWORD}
DB_PATH=${DB_PATH}
COLLECT_INTERVAL=5
HOST=0.0.0.0
EOF

chmod 600 "${INSTALL_DIR}/config.env"

# Criar arquivo de serviço systemd
log_info "Criando serviço systemd..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=Server Monitor Agent
After=network.target
Documentation=https://github.com/${GITHUB_REPO}

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/server-monitor-agent --port ${PORT} --password ${PASSWORD} --db ${DB_PATH}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

# Limites de recursos
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Recarregar systemd
log_info "Recarregando systemd..."
systemctl daemon-reload

# Habilitar serviço
log_info "Habilitando serviço para iniciar no boot..."
systemctl enable "${SERVICE_NAME}"

# Iniciar serviço
log_info "Iniciando serviço..."
systemctl start "${SERVICE_NAME}"

# Verificar status
sleep 2
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    log_info "✓ Serviço iniciado com sucesso!"
else
    log_error "✗ Falha ao iniciar o serviço"
    log_error "Verifique os logs com: journalctl -u ${SERVICE_NAME} -n 50"
    exit 1
fi

# Exibir informações
echo ""
log_info "=========================================="
log_info "Instalação concluída com sucesso!"
log_info "=========================================="
echo ""
echo "Configuração:"
echo "  - Porta: ${PORT}"
echo "  - Banco de dados: ${DB_PATH}"
echo "  - Arquivo de configuração: ${INSTALL_DIR}/config.env"
echo ""
echo "Comandos úteis:"
echo "  - Ver status: sudo systemctl status ${SERVICE_NAME}"
echo "  - Ver logs: sudo journalctl -u ${SERVICE_NAME} -f"
echo "  - Parar: sudo systemctl stop ${SERVICE_NAME}"
echo "  - Reiniciar: sudo systemctl restart ${SERVICE_NAME}"
echo "  - Desinstalar: sudo bash /opt/server-monitor/uninstall.sh"
echo ""
echo "Teste a conexão:"
echo "  curl http://localhost:${PORT}/health"
echo ""
log_info "Adicione este servidor no dashboard com:"
echo "  - IP: $(hostname -I | awk '{print $1}')"
echo "  - Porta: ${PORT}"
echo "  - Senha: (a senha que você configurou)"
echo ""
