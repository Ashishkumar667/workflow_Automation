import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import crypto from 'crypto';

const router = Router();

// In-memory event store (use DB in production)
interface WebhookEvent {
    id: string;
    workflowId: string;
    timestamp: number;
    headers: Record<string, string>;
    body: any;
    signature?: string;
    processed: boolean;
}

const webhookEvents: WebhookEvent[] = [];

// Generate event ID
function generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Verify webhook signature (optional)
function verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return signature === digest;
}

// Receive Webhook
router.post(
    '/:workflowId',
    [param('workflowId').notEmpty()],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { workflowId } = req.params;
            const signature = req.headers['x-webhook-signature'] as string;
            const eventId = generateEventId();

            console.log(`\n📥 Webhook received for workflow: ${workflowId}`);
            console.log(`   Event ID: ${eventId}`);
            console.log(`   Payload:`, req.body);

            // Store webhook event
            const event: WebhookEvent = {
                id: eventId,
                workflowId,
                timestamp: Date.now(),
                headers: req.headers as Record<string, string>,
                body: req.body,
                signature,
                processed: false,
            };

            webhookEvents.push(event);

            // TODO: Trigger workflow execution via workflow-service or execution-service
            // For now, just acknowledge receipt
            console.log(`✅ Webhook stored: ${eventId}`);

            res.status(202).json({
                message: 'Webhook received',
                eventId,
                workflowId,
                status: 'accepted',
            });
        } catch (error: any) {
            console.error('Webhook error:', error);
            res.status(500).json({ error: 'Failed to process webhook', details: error.message });
        }
    }
);

// List Webhook Events
router.get('/events', async (req: Request, res: Response): Promise<void> => {
    try {
        const { workflowId, processed } = req.query;
        let filteredEvents = [...webhookEvents];

        if (workflowId) {
            filteredEvents = filteredEvents.filter((e) => e.workflowId === workflowId);
        }

        if (processed !== undefined) {
            filteredEvents = filteredEvents.filter(
                (e) => e.processed === (processed === 'true')
            );
        }

        // Sort by timestamp descending
        filteredEvents.sort((a, b) => b.timestamp - a.timestamp);

        res.json({
            count: filteredEvents.length,
            events: filteredEvents,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch events', details: error.message });
    }
});

// Get Webhook Event by ID
router.get(
    '/events/:eventId',
    [param('eventId').notEmpty()],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const event = webhookEvents.find((e) => e.id === req.params.eventId);

            if (!event) {
                res.status(404).json({ error: 'Event not found' });
                return;
            }

            res.json({ event });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to fetch event', details: error.message });
        }
    }
);

// Mark Event as Processed
router.post(
    '/events/:eventId/process',
    [param('eventId').notEmpty()],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const event = webhookEvents.find((e) => e.id === req.params.eventId);

            if (!event) {
                res.status(404).json({ error: 'Event not found' });
                return;
            }

            event.processed = true;

            res.json({
                message: 'Event marked as processed',
                event,
            });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to process event', details: error.message });
        }
    }
);

export default router;
