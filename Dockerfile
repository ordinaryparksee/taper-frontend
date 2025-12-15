# Dockerfile for taper-frontend (Nuxt)
ARG NODE_ENV=production

FROM node:22-alpine AS base

RUN mkdir -p /srv/taper
WORKDIR /srv/taper

# Install pnpm
RUN apk add --no-cache pnpm

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build
COPY --from=deps /srv/taper/node_modules ./node_modules
COPY . .
RUN pnpm build

# Final stage
FROM base
ENV NODE_ENV=$NODE_ENV

COPY --from=build /srv/taper/.output ./.output
# Optional: Copy package.json and node_modules for local dev if needed
# However, for 'local' dev, usually volumes are used.
# To make pnpm run dev work, we might need more than just .output
COPY --from=deps /srv/taper/node_modules ./node_modules
COPY --from=deps /srv/taper/.nuxt ./.nuxt
COPY . .

EXPOSE 3000

CMD ["sh", "-c", " \
  if [ \"$NODE_ENV\" = \"local\" ]; then \
    pnpm dev --host 0.0.0.0 --port 3000; \
  else \
    node .output/server/index.mjs; \
  fi \
"]
