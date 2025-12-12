FROM node:22-alpine AS builder

# Must be entire project because `prepare` script is run during dependency installation and requires all files.
WORKDIR /app

COPY src/ ./src/
COPY package.json package-lock.json tsconfig.json ./

RUN --mount=type=cache,target=/root/.npm npm ci

RUN npm run build:production

FROM node:22-alpine AS release

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm-production npm ci --ignore-scripts --omit-dev

LABEL org.opencontainers.image.source="https://github.com/SmartBear/smartbear-mcp"
LABEL org.opencontainers.image.description="SmartBear's official MCP Server"
LABEL org.opencontainers.image.licenses=MIT

ENTRYPOINT ["node", "dist/index.js"]
