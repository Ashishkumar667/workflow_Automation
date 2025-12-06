import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import webhookRoutes from './routes/webhook.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/webhooks', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'webhook-service' });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'webhook-service',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            receiveWebhook: 'POST /api/webhooks/:workflowId',
            listEvents: 'GET /api/webhooks/events',
            getEvent: 'GET /api/webhooks/events/:eventId',
            processEvent: 'POST /api/webhooks/events/:eventId/process',
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Webhook Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🪝 Webhook endpoint: http://localhost:${PORT}/api/webhooks/:workflowId`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
