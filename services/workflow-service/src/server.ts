import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import workflowRoutes from './routes/workflow.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow-db';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/workflows', workflowRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'workflow-service' });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'workflow-service',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            createWorkflow: 'POST /api/workflows',
            listWorkflows: 'GET /api/workflows',
            getWorkflow: 'GET /api/workflows/:id',
            updateWorkflow: 'PUT /api/workflows/:id',
            deleteWorkflow: 'DELETE /api/workflows/:id',
            executeWorkflow: 'POST /api/workflows/:id/execute',
            getExecutionStatus: 'GET /api/workflows/executions/:executionId/status',
            cancelExecution: 'POST /api/workflows/executions/:executionId/cancel',
        },
    });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`🚀 Workflow Service running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

startServer();
