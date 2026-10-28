#!/usr/bin/env bash

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    Parando Intranet Decós - Sistema Hospitalar    ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Parar Front-end
echo -e "\n${YELLOW}[1/3] Parando Front-end (porta 5173)...${NC}"
if [ -f "$RUN_DIR/frontend.pid" ]; then
    PID=$(cat "$RUN_DIR/frontend.pid")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$RUN_DIR/frontend.pid"
fi
fuser -k 5173/tcp 2>/dev/null || true
echo -e "${GREEN}✓ Front-end encerrado.${NC}"

# 2. Parar Back-end
echo -e "\n${YELLOW}[2/3] Parando Back-end (porta 8000)...${NC}"
if [ -f "$RUN_DIR/backend.pid" ]; then
    PID=$(cat "$RUN_DIR/backend.pid")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$RUN_DIR/backend.pid"
fi
fuser -k 8000/tcp 2>/dev/null || true
echo -e "${GREEN}✓ Back-end encerrado.${NC}"

# 3. Parar Banco de Dados Oracle (Docker)
echo -e "\n${YELLOW}[3/3] Pausando Banco de Dados Oracle (Docker)...${NC}"
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    cd "$ROOT_DIR"
    docker compose stop
    echo -e "${GREEN}✓ Container do Oracle pausado com segurança (dados preservados).${NC}"
else
    echo -e "${BLUE}✓ Docker não ativo ou sem container em execução.${NC}"
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}    Todos os serviços foram parados com sucesso!    ${NC}"
echo -e "${GREEN}====================================================${NC}\n"
