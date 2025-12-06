// In-memory execution status store (use Redis or DB in production)
export interface ExecutionStatus {
    execution_id: string;
    workflow_id: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    current_step: number;
    total_steps: number;
    step_results: StepResult[];
    error_message?: string;
    started_at: number;
    completed_at?: number;
}

export interface StepResult {
    step_number: number;
    step_name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: string;
    error?: string;
    started_at?: number;
    completed_at?: number;
}

class ExecutionStore {
    private executions: Map<string, ExecutionStatus> = new Map();

    create(executionId: string, workflowId: string, totalSteps: number): ExecutionStatus {
        const execution: ExecutionStatus = {
            execution_id: executionId,
            workflow_id: workflowId,
            status: 'queued',
            current_step: 0,
            total_steps: totalSteps,
            step_results: [],
            started_at: Date.now(),
        };

        this.executions.set(executionId, execution);
        return execution;
    }

    get(executionId: string): ExecutionStatus | undefined {
        return this.executions.get(executionId);
    }

    update(executionId: string, updates: Partial<ExecutionStatus>): void {
        const execution = this.executions.get(executionId);
        if (execution) {
            Object.assign(execution, updates);
        }
    }

    updateStepResult(executionId: string, stepResult: StepResult): void {
        const execution = this.executions.get(executionId);
        if (execution) {
            const existingIndex = execution.step_results.findIndex(
                (s) => s.step_number === stepResult.step_number
            );

            if (existingIndex >= 0) {
                execution.step_results[existingIndex] = stepResult;
            } else {
                execution.step_results.push(stepResult);
            }
        }
    }

    delete(executionId: string): void {
        this.executions.delete(executionId);
    }

    // Cleanup old executions (older than 24 hours)
    cleanup(): void {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        for (const [id, execution] of this.executions.entries()) {
            if (execution.started_at < oneDayAgo) {
                this.executions.delete(id);
            }
        }
    }
}

export const executionStore = new ExecutionStore();

// Run cleanup every hour
setInterval(() => {
    executionStore.cleanup();
}, 60 * 60 * 1000);
