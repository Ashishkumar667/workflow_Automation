import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { WorkflowJobData } from '../queue/workflow.queue';
import { executionStore, StepResult } from '../store/execution.store';
import { generateText } from '../grpc/ai-client';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

// Create Redis connection for worker
const connection = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
});

// Process a single workflow step
async function processStep(
    step: any,
    stepNumber: number,
    executionId: string,
    context: Record<string, any>
): Promise<{ output: any; context: Record<string, any> }> {
    console.log(`   ├─ Step ${stepNumber}: ${step.name} (${step.type})`);

    const stepResult: StepResult = {
        step_number: stepNumber,
        step_name: step.name,
        status: 'running',
        started_at: Date.now(),
    };
    executionStore.updateStepResult(executionId, stepResult);

    try {
        let output: any = null;

        switch (step.type) {
            case 'ai':
                // Call AI service
                const prompt = step.config.prompt || 'Hello, AI!';
                const aiResponse = await generateText({
                    prompt: prompt,
                    model: step.config.model || 'gpt-4',
                    max_tokens: step.config.max_tokens || 100,
                    temperature: step.config.temperature || 0.7,
                });
                output = aiResponse.text;
                context[step.name] = output;
                break;

            case 'http':
                // Mock HTTP request
                output = { status: 200, data: 'Mock HTTP response' };
                context[step.name] = output;
                break;

            case 'transform':
                // Mock data transformation
                output = { transformed: true, data: context };
                context[step.name] = output;
                break;

            case 'condition':
                // Mock condition evaluation
                output = { condition_met: true };
                context[step.name] = output;
                break;

            case 'wait':
                // Wait for specified duration
                const waitMs = step.config.duration || 1000;
                await new Promise((resolve) => setTimeout(resolve, waitMs));
                output = { waited: waitMs };
                context[step.name] = output;
                break;

            default:
                output = { message: 'Unknown step type' };
        }

        stepResult.status = 'completed';
        stepResult.output = JSON.stringify(output);
        stepResult.completed_at = Date.now();
        executionStore.updateStepResult(executionId, stepResult);

        return { output, context };
    } catch (error: any) {
        stepResult.status = 'failed';
        stepResult.error = error.message;
        stepResult.completed_at = Date.now();
        executionStore.updateStepResult(executionId, stepResult);
        throw error;
    }
}

// Process workflow job
async function processWorkflow(job: Job<WorkflowJobData>) {
    const { execution_id, workflow_id, user_id, steps, trigger_source } = job.data;

    console.log(`\n🔄 Processing workflow execution: ${execution_id}`);
    console.log(`   Workflow ID: ${workflow_id}`);
    console.log(`   User ID: ${user_id}`);
    console.log(`   Trigger: ${trigger_source}`);
    console.log(`   Steps: ${steps.length}`);

    // Update status to running
    executionStore.update(execution_id, {
        status: 'running',
    });

    let context: Record<string, any> = { ...job.data.input_data };

    try {
        // Execute each step
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            executionStore.update(execution_id, {
                current_step: i + 1,
            });

            const result = await processStep(step, i + 1, execution_id, context);
            context = result.context;

            // Update progress
            await job.updateProgress((i + 1) / steps.length * 100);
        }

        // Mark as completed
        executionStore.update(execution_id, {
            status: 'completed',
            current_step: steps.length,
            completed_at: Date.now(),
        });

        console.log(`✅ Workflow execution completed: ${execution_id}`);

        return { success: true, execution_id };
    } catch (error: any) {
        console.error(`❌ Workflow execution failed: ${execution_id}`, error);

        // Mark as failed
        executionStore.update(execution_id, {
            status: 'failed',
            error_message: error.message,
            completed_at: Date.now(),
        });

        throw error;
    }
}

// Create worker
const worker = new Worker('workflow-execution', processWorkflow, {
    connection,
    concurrency: 5, // Process up to 5 workflows concurrently
});

worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
    console.error('Worker error:', err);
});

console.log('🚀 Workflow Worker started');
console.log(`📊 Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
console.log('⏳ Waiting for jobs...\n');

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down worker...');
    await worker.close();
    process.exit(0);
});
