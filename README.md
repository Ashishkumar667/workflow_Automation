# AI Workflow Automation Engine

A complete microservices-based AI workflow automation platform built with Node.js, TypeScript, gRPC, and Docker.

## 🏗️ Architecture

The system consists of 5 microservices:

- **auth-service** (Port 3001): User authentication with JWT
- **workflow-service** (Port 3002): Workflow CRUD and management
- **execution-service** (gRPC 50051): Workflow execution orchestration
- **ai-service** (gRPC 50052): Mock AI operations (LLM, embeddings, sentiment)
- **webhook-service** (Port 3005): Webhook receiver and dispatcher

### Infrastructure

- **MongoDB**: Database for auth and workflows
- **Redis**: Job queue for BullMQ
- **Kong**: API Gateway (optional)
- **Docker Compose**: Local development
- **Kubernetes**: Production deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- (Optional) Kubernetes cluster

### Local Development with Docker Compose

1. **Clone the repository**
```bash
git clone <repo-url>
cd workflow
```

2. **Start all services**
```bash
docker-compose up -d
```

3. **Check service health**
```bash
# Auth service
curl http://localhost:3001/health

# Workflow service
curl http://localhost:3002/health

# Webhook service
curl http://localhost:3005/health
```

4. **View logs**
```bash
docker-compose logs -f
```

### Access Services

- **Auth Service**: http://localhost:3001
- **Workflow Service**: http://localhost:3002
- **Webhook Service**: http://localhost:3005
- **Kong Gateway**: http://localhost:8000 (if enabled)
- **Kong Admin**: http://localhost:8001 (if enabled)

## 📖 API Documentation

### Auth Service (http://localhost:3001)

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Verify Token
```bash
GET /api/auth/verify
Authorization: Bearer <token>
```

### Workflow Service (http://localhost:3002)

#### Create Workflow
```bash
POST /api/workflows
X-User-Id: demo-user
Content-Type: application/json

{
  "name": "My AI Workflow",
  "description": "Example workflow",
  "steps": [
    {
      "name": "greet",
      "type": "ai",
      "order": 0,
      "config": {
        "prompt": "Say hello",
        "model": "gpt-4",
        "max_tokens": 100,
        "temperature": 0.7
      }
    }
  ],
  "triggers": [
    {
      "type": "manual"
    }
  ]
}
```

#### Execute Workflow
```bash
POST /api/workflows/:id/execute
X-User-Id: demo-user
Content-Type: application/json

{
  "input_data": {
    "key": "value"
  }
}
```

#### Get Execution Status
```bash
GET /api/workflows/executions/:executionId/status
```

### Webhook Service (http://localhost:3005)

#### Send Webhook
```bash
POST /api/webhooks/:workflowId
Content-Type: application/json

{
  "event": "test",
  "data": {
    "message": "Hello from webhook"
  }
}
```

## 🛠️ Development

### Run Individual Services

Each service can be run independently for development:

```bash
# Auth service
cd services/auth-service
npm install
npm run dev

# Workflow service
cd services/workflow-service
npm install
npm run dev

# Execution service (server)
cd services/execution-service
npm install
npm run dev

# Execution service (worker)
cd services/execution-service
npm run dev:worker

# AI service
cd services/ai-service
npm install
npm run dev

# Webhook service
cd services/webhook-service
npm install
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` in each service directory and configure:

- **auth-service**: MongoDB URI, JWT secrets
- **workflow-service**: MongoDB URI, Execution service URL
- **execution-service**: Redis host, AI service URL
- **ai-service**: gRPC port
- **webhook-service**: Webhook secret

## ☸️ Kubernetes Deployment

### Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/storage.yaml
kubectl apply -f k8s/databases.yaml
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml
```

### Check Deployment

```bash
kubectl get pods -n workflow-system
kubectl get services -n workflow-system
kubectl logs -f deployment/auth-service -n workflow-system
```

## 🧪 Testing

### End-to-End Test

```bash
# 1. Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# 2. Login
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  | jq -r '.accessToken')

# 3. Create workflow
WORKFLOW_ID=$(curl -X POST http://localhost:3002/api/workflows \
  -H "X-User-Id: test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "steps": [
      {
        "name": "greet",
        "type": "ai",
        "order": 0,
        "config": {
          "prompt": "Say hello",
          "model": "gpt-4",
          "max_tokens": 50,
          "temperature": 0.7
        }
      }
    ]
  }' | jq -r '.workflow._id')

# 4. Execute workflow
curl -X POST http://localhost:3002/api/workflows/$WORKFLOW_ID/execute \
  -H "X-User-Id: test-user" \
  -H "Content-Type: application/json"
```

## 📦 Project Structure

```
workflow/
├── services/
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── utils/
│   │   │   └── server.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── workflow-service/
│   ├── execution-service/
│   ├── ai-service/
│   └── webhook-service/
├── shared/
│   └── protos/
│       ├── execution.proto
│       └── ai.proto
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── storage.yaml
│   ├── databases.yaml
│   ├── auth-service.yaml
│   ├── services.yaml
│   └── ingress.yaml
├── kong/
│   └── kong.yml
├── docker-compose.yml
└── package.json
```

## 🔧 Configuration

### Docker Compose

The `docker-compose.yml` includes:
- All 5 microservices
- MongoDB with persistent storage
- Redis for job queue
- Kong API Gateway with PostgreSQL
- Health checks and dependency management

### Kubernetes

The `k8s/` directory contains:
- Namespace configuration
- ConfigMaps for non-sensitive config
- Secrets for sensitive data
- PersistentVolumeClaims for storage
- Deployments with replicas and health probes
- Services for internal communication
- Ingress for external access

## 🎯 Workflow Step Types

The execution service supports the following step types:

- **ai**: Call AI service for text generation
- **http**: Make HTTP requests (mock)
- **transform**: Transform data (mock)
- **condition**: Evaluate conditions (mock)
- **wait**: Wait for specified duration

## 🚨 Production Considerations

Before deploying to production:

1. **Change all secrets** in environment variables and Kubernetes secrets
2. **Set up proper authentication** for MongoDB and Redis
3. **Configure SSL/TLS** for all services
4. **Enable JWT authentication** on Kong for protected routes
5. **Set up monitoring** and logging (Prometheus, Grafana, ELK)
6. **Implement rate limiting** and request validation
7. **Use a container registry** for Docker images
8. **Configure horizontal pod autoscaling** in Kubernetes
9. **Set up backup** for MongoDB data
10. **Implement proper error handling** and retry logic

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.
