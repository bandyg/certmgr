FROM node:18-alpine

# Labels
LABEL maintainer="cert-manager" \
      description="Certificate Management Service" \
      version="1.0.0"

# Create app directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY dist ./dist

# Copy default config
COPY config.yaml.example ./config.yaml.example

# Create non-root user
RUN addgroup -g 1001 -S certmanager && \
    adduser -S certmanager -u 1001 -G certmanager

# Create storage directory
RUN mkdir -p /var/lib/cert-manager && \
    chown -R certmanager:certmanager /var/lib/cert-manager && \
    chmod 755 /var/lib/cert-manager

# Switch to non-root user
USER certmanager

# Expose port
EXPOSE 3111

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3111/api/v1/ping || exit 1

# Start application
CMD ["node", "dist/index.js"]