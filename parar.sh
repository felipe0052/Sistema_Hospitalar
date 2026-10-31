#!/usr/bin/env bash

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sem Cor

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    Parando Intranet Decós - Sistema Hospitalar    ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Parar processos locais caso estejam rodando (modo dev/sqlite)
echo -e "\n${YELLOW}[1/2] Verificando e finalizando processos locais...${NC}"
if [ -f "$RUN_DIR/frontend.pid" ]; then
    PID=$(cat "$RUN_DIR/frontend.pid")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$RUN_DIR/frontend.pid"
fi
fuser -k 5173/tcp 2>/dev/null || true

if [ -f "$RUN_DIR/backend.pid" ]; then
    PID=$(cat "$RUN_DIR/backend.pid")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$RUN_DIR/backend.pid"
fi
fuser -k 8000/tcp 2>/dev/null || true
echo -e "${GREEN}✓ Processos locais finalizados.${NC}"

# 2. Parar Containers Docker
echo -e "\n${YELLOW}[2/2] Finalizando containers Docker e liberando rede...${NC}"
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    cd "$ROOT_DIR"
    # docker compose down remove containers e redes antigas, mas PRESERVA os volumes do banco
    docker compose down --remove-orphans
    echo -e "${GREEN}✓ Containers encerrados e limpos com segurança (dados do banco preservados no volume).${NC}"
else
    echo -e "${BLUE}✓ Docker não ativo ou sem containers em execução.${NC}"
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}    Todos os serviços foram parados com sucesso!    ${NC}"
echo -e "${GREEN}====================================================${NC}\n"
