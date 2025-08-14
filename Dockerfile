##### DEPENDENCIES
FROM --platform=linux/amd64 node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Prisma schema (client will be generated in builder)
COPY prisma ./prisma

# Install dependencies (cache-friendly; includes dev deps so Prisma CLI is available)
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm i; \
    else echo "Lockfile not found." && exit 1; \
    fi

##### BUILDER
FROM --platform=linux/amd64 node:20-alpine AS builder
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLIENTVAR
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ✅ Generate Prisma client (uses prisma/schema.prisma)
RUN npx prisma generate

# ✅ Build Next.js standalone output (ensure next.config.js has output: 'standalone')
RUN \
    if [ -f yarn.lock ]; then SKIP_ENV_VALIDATION=1 yarn build; \
    elif [ -f package-lock.json ]; then SKIP_ENV_VALIDATION=1 npm run build; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && SKIP_ENV_VALIDATION=1 pnpm run build; \
    else echo "Lockfile not found." && exit 1; \
    fi


##### RUNNER (Alpine so we can run shell + npm)
FROM --platform=linux/amd64 node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Local default; on Railway PORT will be injected (usually 8080)
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# --- App files ---
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Next.js standalone server (includes server.js and prod node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma migrations directory is needed at runtime for migrate deploy
COPY --from=builder /app/prisma ./prisma

# Ensure Prisma CLI is available at runtime (via node_modules/.bin/prisma)
# If you prefer smaller image, you can copy only prisma-related modules instead.
COPY --from=builder /app/node_modules ./node_modules

# Run migrations against the live DATABASE_URL, then start Next.js
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
