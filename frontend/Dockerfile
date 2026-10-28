# ==============================================================================
# Dockerfile — Front-end React + Vite (Intranet Hospitalar Decós — S4-T3)
# Build multi-stage com Nginx servindo o bundle estático de produção
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=http://localhost:8000/api/v1
ARG VITE_USE_MOCKS=false
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_USE_MOCKS=${VITE_USE_MOCKS}

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração SPA para React Router (fallback para index.html)
RUN printf 'server {\n\
    listen 5173;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
