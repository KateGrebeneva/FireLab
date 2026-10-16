# Сборка фронтенда FireLab и nginx, который раздаёт сайт и проксирует API.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
# ключ anon публичный (как в облаке); адрес API — относительный, подходит для любого IP и домена
ARG ANON_KEY
ENV VITE_SUPABASE_URL=/supabase \
    VITE_SUPABASE_ANON_KEY=$ANON_KEY
RUN test -n "$VITE_SUPABASE_ANON_KEY" || (echo "ANON_KEY не задан: выполните node docker/keys.mjs" && exit 1)
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
