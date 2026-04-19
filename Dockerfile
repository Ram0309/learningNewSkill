# Multi-stage build for Enterprise Test Automation Framework
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    chromium \
    firefox \
    webkit2gtk \
    glib \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set environment variables for Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY playwright.config.ts ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build

# Production stage
FROM base AS production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=development /app/dist ./dist
COPY --from=development /app/src ./src
COPY --from=development /app/tests ./tests
COPY --from=development /app/test-data ./test-data

# Install Playwright browsers
RUN npx playwright install chromium firefox webkit

# Create non-root user
RUN addgroup -g 1001 -S playwright && \
    adduser -S playwright -u 1001 -G playwright

# Set ownership
RUN chown -R playwright:playwright /app
USER playwright

# Expose port for debugging
EXPOSE 9229

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Default command
CMD ["npm", "run", "test"]