#!/usr/bin/env bash
set -e

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sem Cor

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
mkdir -p "$RUN_DIR"

MODO_DEV=false
if [ "$1" == "--dev" ]; then
    MODO_DEV=true
fi

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    Iniciando Intranet Decós - Sistema Hospitalar   ${NC}"
echo -e "${BLUE}====================================================${NC}"

DOCKER_DISPONIVEL=false
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    DOCKER_DISPONIVEL=true
fi

cd "$ROOT_DIR"

if [ "$DOCKER_DISPONIVEL" = true ] && [ "$MODO_DEV" = false ]; then
    echo -e "\n${YELLOW}Modo Docker Completo (Oracle + Back-end + Front-end)...${NC}"
    docker compose up -d
    echo -e "${GREEN}✓ Todos os containers foram iniciados com sucesso!${NC}"
elif [ "$DOCKER_DISPONIVEL" = true ] && [ "$MODO_DEV" = true ]; then
    echo -e "\n${YELLOW}[Modo Dev] Subindo Banco Oracle no Docker e apps localmente com hot-reload...${NC}"
    docker compose up -d oracle
    echo -e "${GREEN}✓ Container do Oracle ativo.${NC}"

    # Inicia Backend local
    echo -e "\n${YELLOW}Iniciando Back-end local (FastAPI)...${NC}"
    if fuser 8000/tcp &> /dev/null; then
        echo -e "${YELLOW}Porta 8000 já está em uso.${NC}"
    else
        cd "$ROOT_DIR/backend"
        nohup "$ROOT_DIR/backend/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 > "$RUN_DIR/backend.log" 2>&1 &
        echo $! > "$RUN_DIR/backend.pid"
        echo -e "${GREEN}✓ Back-end iniciado. Logs em .run/backend.log${NC}"
    fi

    # Inicia Frontend local
    echo -e "\n${YELLOW}Iniciando Front-end local (Vite dev)...${NC}"
    if fuser 5173/tcp &> /dev/null; then
        echo -e "${YELLOW}Porta 5173 já está em uso.${NC}"
    else
        cd "$ROOT_DIR/frontend"
        nohup npm run dev > "$RUN_DIR/frontend.log" 2>&1 &
        echo $! > "$RUN_DIR/frontend.pid"
        echo -e "${GREEN}✓ Front-end iniciado. Logs em .run/frontend.log${NC}"
    fi
else
    echo -e "\n${YELLOW}[Modo SQLite Local] Docker não detectado ou sem permissão...${NC}"

    # Inicia Backend local
    cd "$ROOT_DIR/backend"
    if ! fuser 8000/tcp &> /dev/null; then
        nohup "$ROOT_DIR/backend/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 > "$RUN_DIR/backend.log" 2>&1 &
        echo $! > "$RUN_DIR/backend.pid"
        echo -e "${GREEN}✓ Back-end iniciado com SQLite.${NC}"
    fi

    # Inicia Frontend local
    cd "$ROOT_DIR/frontend"
    if ! fuser 5173/tcp &> /dev/null; then
        nohup npm run dev > "$RUN_DIR/frontend.log" 2>&1 &
        echo $! > "$RUN_DIR/frontend.pid"
        echo -e "${GREEN}✓ Front-end iniciado.${NC}"
    fi
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}    Projeto pronto para uso!                        ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "➜ ${BLUE}Front-end:${NC} http://localhost:5173"
echo -e "➜ ${BLUE}Back-end API:${NC} http://localhost:8000"
echo -e "➜ ${BLUE}Documentação (Swagger):${NC} http://localhost:8000/docs"
echo -e "➜ ${BLUE}Para desligar tudo:${NC} ./parar.sh\n"
