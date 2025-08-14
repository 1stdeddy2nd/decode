FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# OS deps (openssl needed for Prisma)
RUN apk add --no-cache libc6-compat openssl

# 1) Copy prisma schema before install (needed for postinstall prisma generate)
COPY prisma ./prisma

# 2) Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# 3) Copy source and build
COPY . .
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLIENTVAR
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
RUN npm run build

# 4) Remove dev deps for smaller image
RUN npm prune --omit=dev

# 5) Run migrations and start app
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm start"]
