# Build context is the repository root:  docker build -f frontend/Dockerfile .
# ---- build the Angular app
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build -- --configuration production

# ---- serve it with Caddy (automatic HTTPS) and forward /api and /uploads to the backend
FROM caddy:2-alpine
COPY --from=build /app/dist/academic-club/browser /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
