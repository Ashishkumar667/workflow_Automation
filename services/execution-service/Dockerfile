FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/execution-service/package*.json ./

# Install dependencies (including dev for build)
RUN npm install

# Copy shared protos
COPY shared/protos /app/shared/protos

# Copy source code
COPY services/execution-service/ ./

# Build TypeScript (this will compile protos and TypeScript)
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose gRPC port
EXPOSE 50051

# Start server (or worker, depending on CMD override)
CMD ["node", "dist/server.js"]
