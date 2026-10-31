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
PULL_BASE=false

for arg in "$@"; do
    case $arg in
        --dev)
            MODO_DEV=true
            ;;
        --pull)
            PULL_BASE=true
            ;;
    esac
done

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    Iniciando Intranet Decós - Sistema Hospitalar   ${NC}"
echo -e "${BLUE}====================================================${NC}"

DOCKER_DISPONIVEL=false
if command -v docker &> /dev/null; then
    if docker ps &> /dev/null; then
        DOCKER_DISPONIVEL=true
    else
        echo -e "\n${RED}⚠️  ATENÇÃO: O serviço do Docker não está ativo ou seu usuário não tem permissão.${NC}"
        echo -e "${YELLOW}Para ligar o Docker e subir o banco Oracle, execute no terminal:${NC}"
        echo -e "   ${GREEN}sudo systemctl start docker${NC}"
        echo -e "   ${GREEN}sudo chmod 666 /var/run/docker.sock${NC}"
        echo -e "${YELLOW}Tentando subir agora no modo local com SQLite...${NC}\n"
    fi
else
    echo -e "\n${YELLOW}Docker não encontrado no sistema. Usando modo SQLite local...${NC}\n"
fi

cd "$ROOT_DIR"

if [ "$DOCKER_DISPONIVEL" = true ] && [ "$MODO_DEV" = false ]; then
    echo -e "\n${YELLOW}Modo Docker Completo (Oracle + Back-end + Front-end)...${NC}"
    
    # Se solicitado --pull, atualiza imagens base primeiro
    if [ "$PULL_BASE" = true ]; then
        echo -e "${YELLOW}Baixando versões mais recentes das imagens base...${NC}"
        docker compose pull --ignore-pull-failures || true
    fi

    echo -e "${YELLOW}Construindo e atualizando containers com as últimas alterações de código (--build)...${NC}"
    docker compose up -d --build --remove-orphans

    # Garante que migrações adicionais pós-MVP sejam aplicadas se o volume do Oracle já existia
    echo -e "${YELLOW}Garantindo sincronização de tabelas no Oracle...${NC}"
    docker compose exec -T oracle sh -c 'sqlplus -s decos/decos123@FREEPDB1' < "$ROOT_DIR/database/migrations_acesso_rapido.sql" > /dev/null 2>&1 || true

    echo -e "${GREEN}✓ Todos os containers foram construídos e iniciados com sucesso!${NC}"

elif [ "$DOCKER_DISPONIVEL" = true ] && [ "$MODO_DEV" = true ]; then
    echo -e "\n${YELLOW}[Modo Dev] Subindo Banco Oracle no Docker e apps localmente com hot-reload...${NC}"
    docker compose up -d oracle
    echo -e "${GREEN}✓ Container do Oracle ativo.${NC}"

    docker compose exec -T oracle sh -c 'sqlplus -s decos/decos123@FREEPDB1' < "$ROOT_DIR/database/migrations_acesso_rapido.sql" > /dev/null 2>&1 || true

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
    echo -e "${YELLOW}[Modo SQLite Local] Subindo aplicação com banco local...${NC}"

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
echo -e "${GREEN}    Projeto pronto para uso (versão mais recente)!  ${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "➜ ${BLUE}Front-end:${NC} http://localhost:5173"
echo -e "➜ ${BLUE}Back-end API:${NC} http://localhost:8000"
echo -e "➜ ${BLUE}Documentação (Swagger):${NC} http://localhost:8000/docs"
echo -e "➜ ${BLUE}Para desligar tudo:${NC} ./parar.sh\n"
