import { Router, Request, Response } from 'express';
import { body, validationResult, param, query } from 'express-validator';
import { Workflow } from '../models/workflow.model';
import { executeWorkflow, getExecutionStatus, cancelExecution } from '../grpc/execution-client';

const router = Router();

// Temporary auth middleware (assumes userId in header for demo)
const extractUserId = (req: any, res: Response, next: any) => {
    req.userId = req.headers['x-user-id'] || 'demo-user';
    next();
};

router.use(extractUserId);

// Create Workflow
router.post(
    '/',
    [
        body('name').trim().notEmpty(),
        body('description').optional().trim(),
        body('steps').isArray().withMessage('Steps must be an array'),
        body('steps.*.name').trim().notEmpty(),
        body('steps.*.type').isIn(['ai', 'http', 'transform', 'condition', 'wait']),
        body('steps.*.order').isInt({ min: 0 }),
        body('triggers').optional().isArray(),
    ],
    async (req: any, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { name, description, steps, triggers, isActive } = req.body;

            const workflow = new Workflow({
                name,
                description,
                userId: req.userId,
                steps,
                triggers: triggers || [{ type: 'manual' }],
                isActive: isActive !== undefined ? isActive : true,
            });

            await workflow.save();

            res.status(201).json({
                message: 'Workflow created successfully',
                workflow,
            });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to create workflow', details: error.message });
        }
    }
);

// Get All Workflows
router.get('/', async (req: any, res: Response): Promise<void> => {
    try {
        const { search, isActive } = req.query;
        const filter: any = { userId: req.userId };

        if (search) {
            filter.$text = { $search: search as string };
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const workflows = await Workflow.find(filter).sort({ createdAt: -1 });

        res.json({
            count: workflows.length,
            workflows,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch workflows', details: error.message });
    }
});

// Get Workflow by ID
router.get(
    '/:id',
    [param('id').isMongoId()],
    async (req: any, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const workflow = await Workflow.findOne({
                _id: req.params.id,
                userId: req.userId,
            });

            if (!workflow) {
                res.status(404).json({ error: 'Workflow not found' });
                return;
            }

            res.json({ workflow });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to fetch workflow', details: error.message });
        }
    }
);

// Update Workflow
router.put(
    '/:id',
    [
        param('id').isMongoId(),
        body('name').optional().trim().notEmpty(),
        body('description').optional().trim(),
        body('steps').optional().isArray(),
        body('isActive').optional().isBoolean(),
    ],
    async (req: any, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const workflow = await Workflow.findOne({
                _id: req.params.id,
                userId: req.userId,
            });

            if (!workflow) {
                res.status(404).json({ error: 'Workflow not found' });
                return;
            }

            // Update fields
            const { name, description, steps, triggers, isActive } = req.body;
            if (name) workflow.name = name;
            if (description !== undefined) workflow.description = description;
            if (steps) workflow.steps = steps;
            if (triggers) workflow.triggers = triggers;
            if (isActive !== undefined) workflow.isActive = isActive;

            workflow.version += 1;
            await workflow.save();

            res.json({
                message: 'Workflow updated successfully',
                workflow,
            });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to update workflow', details: error.message });
        }
    }
);

// Delete Workflow
router.delete(
    '/:id',
    [param('id').isMongoId()],
    async (req: any, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const workflow = await Workflow.findOneAndDelete({
                _id: req.params.id,
                userId: req.userId,
            });

            if (!workflow) {
                res.status(404).json({ error: 'Workflow not found' });
                return;
            }

            res.json({
                message: 'Workflow deleted successfully',
                workflow,
            });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to delete workflow', details: error.message });
        }
    }
);

// Execute Workflow
router.post(
    '/:id/execute',
    [
        param('id').isMongoId(),
        body('input_data').optional().isObject(),
    ],
    async (req: any, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const workflow = await Workflow.findOne({
                _id: req.params.id,
                userId: req.userId,
            });

            if (!workflow) {
                res.status(404).json({ error: 'Workflow not found' });
                return;
            }

            if (!workflow.isActive) {
                res.status(400).json({ error: 'Workflow is not active' });
                return;
            }

            // Call execution service via gRPC
            const inputData = req.body.input_data || {};
            const inputDataMap: Record<string, string> = {};

            // Convert input data to string map
            for (const [key, value] of Object.entries(inputData)) {
                inputDataMap[key] = String(value);
            }

            const executionResponse = await executeWorkflow({
                workflow_id: workflow._id.toString(),
                user_id: req.userId,
                input_data: inputDataMap,
                trigger_source: 'manual',
            });

            res.json({
                message: 'Workflow execution started',
                execution: executionResponse,
            });
        } catch (error: any) {
            res.status(500).json({
                error: 'Failed to execute workflow',
                details: error.message,
                hint: 'Make sure execution-service is running'
            });
        }
    }
);

// Get Execution Status
router.get(
    '/executions/:executionId/status',
    [param('executionId').notEmpty()],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const status = await getExecutionStatus({
                execution_id: req.params.executionId,
            });

            res.json({ status });
        } catch (error: any) {
            res.status(500).json({
                error: 'Failed to get execution status',
                details: error.message
            });
        }
    }
);

// Cancel Execution
router.post(
    '/executions/:executionId/cancel',
    [param('executionId').notEmpty()],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const result = await cancelExecution(req.params.executionId);

            res.json({ result });
        } catch (error: any) {
            res.status(500).json({
                error: 'Failed to cancel execution',
                details: error.message
            });
        }
    }
);

export default router;
