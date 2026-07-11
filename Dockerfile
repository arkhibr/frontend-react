# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
ARG VITE_ENV=production
ARG VITE_API_BASE_URL
ENV VITE_ENV=$VITE_ENV
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
# CSP/baseline parametrizados por ambiente: o entrypoint do nginx roda envsubst
# nos templates. NGINX_ENVSUBST_FILTER restringe a substituição às vars CSP_*,
# preservando variáveis de runtime do Nginx ($request_id, $csp_nonce, $uri...).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER="^CSP_"
ENV CSP_CONNECT_SRC=""
ENV CSP_REPORT_URI="https://csp-report.example/collect"

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/index.html || exit 1
