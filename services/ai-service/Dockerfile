FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/ai-service/package*.json ./

# Install dependencies (including dev for build)
RUN npm install

# Copy shared protos
COPY shared/protos /app/shared/protos

# Copy source code
COPY services/ai-service/ ./

# Build TypeScript (this will compile protos and TypeScript)
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

#Expose gRPC port
EXPOSE 50052

# Start server
CMD ["node", "dist/server.js"]
