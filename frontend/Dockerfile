FROM node:20-slim

# Create a non-root user for security
RUN groupadd --gid 1000 appuser 2>/dev/null || true \
    && useradd --uid 1001 --gid 1000 --shell /bin/bash --create-home appuser 2>/dev/null || true

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Own the app directory
RUN chown -R 1001:1000 /app

# Switch to non-root user
USER 1001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "const http = require('http'); http.get('http://localhost:5173/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));" || exit 1

# Run the dev server, exposed to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
