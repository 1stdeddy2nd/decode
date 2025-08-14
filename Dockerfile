FROM node:20-alpine

WORKDIR /app

# OS deps (openssl needed for Prisma on Alpine)
RUN apk add --no-cache libc6-compat openssl

# 1) Prisma schema BEFORE install (postinstall -> prisma generate)
COPY prisma ./prisma

# 2) Install with devDependencies (do NOT set NODE_ENV yet)
COPY package.json package-lock.json ./
RUN npm ci

# 3) Copy source and build
COPY . .
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLIENTVAR
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
RUN npm run build

# 4) Drop dev deps for a smaller runtime and set NODE_ENV for production
RUN npm prune --omit=dev
ENV NODE_ENV=production

# 5) Run migrations then start
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm start"]
