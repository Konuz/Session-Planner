FROM rust:1.85-slim-bookworm AS skyshot-builder
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates gcc libc6-dev && rm -rf /var/lib/apt/lists/*
COPY scripts/skyshot-bridge ./scripts/skyshot-bridge
RUN cargo build --release --locked --manifest-path scripts/skyshot-bridge/Cargo.toml

FROM node:24-bookworm-slim AS web-builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
COPY server ./server
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git python3 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://pixi.sh/install.sh | PIXI_HOME=/usr/local sh
COPY --from=skyshot-builder /build/scripts/skyshot-bridge/target/release/tracker-skyshot /usr/local/bin/tracker-skyshot
COPY --from=web-builder /build/package.json /build/package-lock.json ./
COPY --from=web-builder /build/node_modules ./node_modules
COPY --from=web-builder /build/dist ./dist
COPY --from=web-builder /build/server ./server
COPY --from=web-builder /build/src/lib ./src/lib
COPY --from=web-builder /build/public/data/catalog.json ./public/data/catalog.json
COPY --from=web-builder /build/scripts/regressor ./scripts/regressor
COPY --from=web-builder /build/scripts/setup-skyshot.mjs /build/scripts/run-command.ts ./scripts/
COPY scripts/.cache/regressor ./scripts/.cache/regressor
COPY astro-regressor-main ./astro-regressor-main
RUN if [ "$(uname -m)" = "aarch64" ]; then \
      pixi workspace platform add linux-aarch64 --manifest-path astro-regressor-main/pixi.toml && \
      pixi install --manifest-path astro-regressor-main/pixi.toml; \
    else \
      pixi install --manifest-path astro-regressor-main/pixi.toml --locked; \
    fi
ENV HOST=0.0.0.0 \
    PORT=4173 \
    SKYSHOT_BRIDGE=/usr/local/bin/tracker-skyshot \
    PIXI=/usr/local/bin/pixi
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD curl -fsS "http://127.0.0.1:${PORT}/api/photo/status" >/dev/null || exit 1
CMD ["node", "--env-file-if-exists=.env.local", "server/index.ts"]
