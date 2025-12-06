import { Queue } from 'bullmq';
import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

// Create Redis connection
const connection = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
});

// Create workflow execution queue
export const workflowQueue = new Queue('workflow-execution', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
});

export interface WorkflowJobData {
    execution_id: string;
    workflow_id: string;
    user_id: string;
    input_data: Record<string, string>;
    trigger_source: string;
    steps: any[];
}

export const addWorkflowJob = async (data: WorkflowJobData) => {
    return await workflowQueue.add('execute-workflow', data, {
        jobId: data.execution_id,
    });
};

console.log(`📊 BullMQ Queue connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
