# ==============================================================================
# Dockerfile de Produção — Back-end FastAPI (Intranet Hospitalar Decós — S4-T2)
# Imagem otimizada em Python 3.12-slim executando sob usuário não-root (appuser)
# ==============================================================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UPLOAD_DIR=/app/uploads

WORKDIR /app

# Instala dependências mínimas de sistema e cria usuário não-root
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 appgroup \
    && useradd --uid 10001 --gid appgroup --shell /sbin/nologin --create-home appuser

# Instala dependências Python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copia código da aplicação e scripts de seed
COPY app ./app
COPY scripts ./scripts

# Prepara diretório de uploads com permissão para o usuário não-root
RUN mkdir -p /app/uploads/documentos \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD curl -fsS http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
