import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(__dirname, '../../../shared/protos/execution.proto');
const EXECUTION_SERVICE_URL = process.env.EXECUTION_SERVICE_URL || 'localhost:50051';

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String as any,
    enums: String as any,
    defaults: true,
    oneofs: true,
});

const executionProto = grpc.loadPackageDefinition(packageDefinition).execution as any;

// Create gRPC client
let executionClient: any = null;

export const getExecutionClient = () => {
    if (!executionClient) {
        executionClient = new executionProto.ExecutionService(
            EXECUTION_SERVICE_URL,
            grpc.credentials.createInsecure()
        );
    }
    return executionClient;
};

export interface ExecuteWorkflowRequest {
    workflow_id: string;
    user_id: string;
    input_data: Record<string, string>;
    trigger_source: string;
}

export interface ExecuteWorkflowResponse {
    execution_id: string;
    status: string;
    message: string;
}

export const executeWorkflow = (
    request: ExecuteWorkflowRequest
): Promise<ExecuteWorkflowResponse> => {
    return new Promise((resolve, reject) => {
        const client = getExecutionClient();
        client.ExecuteWorkflow(request, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

export interface GetExecutionStatusRequest {
    execution_id: string;
}

export const getExecutionStatus = (
    request: GetExecutionStatusRequest
): Promise<any> => {
    return new Promise((resolve, reject) => {
        const client = getExecutionClient();
        client.GetExecutionStatus(request, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

export const cancelExecution = (executionId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const client = getExecutionClient();
        client.CancelExecution({ execution_id: executionId }, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};
