import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { addWorkflowJob } from '../queue/workflow.queue';
import { executionStore } from '../store/execution.store';

const PROTO_PATH = path.join(__dirname, '../../../shared/protos/execution.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String as any,
    enums: String as any,
    defaults: true,
    oneofs: true,
});

const executionProto = grpc.loadPackageDefinition(packageDefinition).execution as any;

// Implementation of ExecutionService
const executionServiceImpl = {
    ExecuteWorkflow: async (call: any, callback: any) => {
        try {
            const { workflow_id, user_id, input_data, trigger_source } = call.request;

            console.log(`\n📥 Received ExecuteWorkflow request:`);
            console.log(`   Workflow ID: ${workflow_id}`);
            console.log(`   User ID: ${user_id}`);
            console.log(`   Trigger: ${trigger_source}`);

            // Generate execution ID
            const execution_id = uuidv4();

            // Mock workflow steps (in production, fetch from workflow-service)
            const steps = [
                {
                    name: 'greet',
                    type: 'ai',
                    config: {
                        prompt: 'Say hello to the user',
                        model: 'gpt-4',
                        max_tokens: 50,
                        temperature: 0.7,
                    },
                    order: 0,
                },
                {
                    name: 'wait',
                    type: 'wait',
                    config: {
                        duration: 500,
                    },
                    order: 1,
                },
                {
                    name: 'analyze',
                    type: 'ai',
                    config: {
                        prompt: 'Analyze the workflow results',
                        model: 'gpt-4',
                        max_tokens: 100,
                        temperature: 0.5,
                    },
                    order: 2,
                },
            ];

            // Create execution record
            executionStore.create(execution_id, workflow_id, steps.length);

            // Add job to queue
            await addWorkflowJob({
                execution_id,
                workflow_id,
                user_id,
                input_data,
                trigger_source,
                steps,
            });

            console.log(`✅ Workflow queued: ${execution_id}\n`);

            callback(null, {
                execution_id,
                status: 'queued',
                message: 'Workflow execution started',
            });
        } catch (error: any) {
            console.error('ExecuteWorkflow error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message,
            });
        }
    },

    GetExecutionStatus: (call: any, callback: any) => {
        try {
            const { execution_id } = call.request;

            const execution = executionStore.get(execution_id);

            if (!execution) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Execution not found',
                });
                return;
            }

            callback(null, execution);
        } catch (error: any) {
            console.error('GetExecutionStatus error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message,
            });
        }
    },

    CancelExecution: (call: any, callback: any) => {
        try {
            const { execution_id } = call.request;

            const execution = executionStore.get(execution_id);

            if (!execution) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Execution not found',
                });
                return;
            }

            if (execution.status === 'completed' || execution.status === 'failed') {
                callback(null, {
                    success: false,
                    message: 'Cannot cancel completed or failed execution',
                });
                return;
            }

            executionStore.update(execution_id, {
                status: 'cancelled',
                completed_at: Date.now(),
            });

            console.log(`🛑 Execution cancelled: ${execution_id}`);

            callback(null, {
                success: true,
                message: 'Execution cancelled',
            });
        } catch (error: any) {
            console.error('CancelExecution error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message,
            });
        }
    },
};

export const startGrpcServer = (port: number) => {
    const server = new grpc.Server();

    server.addService(executionProto.ExecutionService.service, executionServiceImpl);

    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, boundPort) => {
            if (err) {
                console.error('Failed to bind gRPC server:', err);
                process.exit(1);
            }

            console.log(`🚀 Execution Service (gRPC) running on port ${boundPort}`);
        }
    );

    return server;
};
