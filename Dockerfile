##### DEPENDENCIES
FROM --platform=linux/amd64 node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Prisma schema (client will be generated in builder)
COPY prisma ./prisma

# Install dependencies (cache-friendly)
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

# ✅ Generate Prisma client with both binaryTargets (see schema.prisma)
RUN npx prisma generate

# ✅ Build Next.js standalone output
# Make sure next.config.js has: serverExternalPackages: ['pdf-parse'] and output: 'standalone'
RUN \
    if [ -f yarn.lock ]; then SKIP_ENV_VALIDATION=1 yarn build; \
    elif [ -f package-lock.json ]; then SKIP_ENV_VALIDATION=1 npm run build; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && SKIP_ENV_VALIDATION=1 pnpm run build; \
    else echo "Lockfile not found." && exit 1; \
    fi

##### MIGRATOR (runs prisma migrate deploy once)
FROM --platform=linux/amd64 node:20-alpine AS migrator
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
CMD ["npx","prisma","migrate","deploy"]

##### RUNNER (distroless)
FROM --platform=linux/amd64 gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# standalone server + assets
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Start Next.js standalone server
CMD ["server.js"]
