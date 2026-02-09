# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ vips-dev
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:20-alpine
RUN apk add --no-cache dumb-init vips tini && \
    rm -rf /var/cache/apk/*
WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Create uploads directory
RUN mkdir -p uploads/attachments uploads/thumbnails uploads/pdfs uploads/images

# Create entrypoint script to fix permissions at runtime
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'chown -R node:node /app/uploads 2>/dev/null || true' >> /entrypoint.sh && \
    echo 'chmod -R 755 /app/uploads 2>/dev/null || true' >> /entrypoint.sh && \
    echo 'exec su-exec node "$@"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh && \
    apk add --no-cache su-exec

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["/entrypoint.sh", "dumb-init", "--"]
CMD ["node", "src/index.js"]
