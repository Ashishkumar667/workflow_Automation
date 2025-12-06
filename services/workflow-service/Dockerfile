FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/workflow-service/package*.json ./

# Install dependencies (including dev for build)
RUN npm install

# Copy shared protos
COPY shared/protos /app/shared/protos

# Copy source code
COPY services/workflow-service/ ./

# Build TypeScript (this will compile protos and TypeScript)
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]
