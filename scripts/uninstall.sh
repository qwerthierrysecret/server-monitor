#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVICE_NAME="server-monitor-agent"
INSTALL_DIR="/opt/server-monitor"
DB_DIR="/var/lib/server-monitor"

echo -e "${YELLOW}=== Server Monitor Agent Uninstallation ===${NC}"
echo "This will remove:"
echo "  - Service: $SERVICE_NAME"
echo "  - Binary: $INSTALL_DIR"
echo "  - Database: $DB_DIR"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}This script must be run as root${NC}"
    exit 1
fi

# Ask for confirmation
read -p "Are you sure you want to uninstall? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Uninstallation cancelled."
    exit 0
fi

# Stop service
echo -e "${YELLOW}Stopping service...${NC}"
if systemctl is-active --quiet ${SERVICE_NAME}; then
    systemctl stop ${SERVICE_NAME}
    echo -e "${GREEN}✓ Service stopped${NC}"
fi

# Disable service
echo -e "${YELLOW}Disabling service...${NC}"
if systemctl is-enabled --quiet ${SERVICE_NAME}; then
    systemctl disable ${SERVICE_NAME}
    echo -e "${GREEN}✓ Service disabled${NC}"
fi

# Remove systemd service file
echo -e "${YELLOW}Removing systemd service file...${NC}"
rm -f /etc/systemd/system/${SERVICE_NAME}.service
systemctl daemon-reload
echo -e "${GREEN}✓ Service file removed${NC}"

# Remove installation directory
echo -e "${YELLOW}Removing installation directory...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    echo -e "${GREEN}✓ Installation directory removed${NC}"
fi

# Remove database directory (optional)
echo -e "${YELLOW}Removing database directory...${NC}"
if [ -d "$DB_DIR" ]; then
    rm -rf "$DB_DIR"
    echo -e "${GREEN}✓ Database directory removed${NC}"
fi

echo ""
echo -e "${GREEN}=== Uninstallation Complete ===${NC}"
echo "Server Monitor Agent has been successfully removed."
