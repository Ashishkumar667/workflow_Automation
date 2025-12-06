import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(__dirname, '../../../shared/protos/ai.proto');
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'localhost:50052';

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String as any,
    enums: String as any,
    defaults: true,
    oneofs: true,
});

const aiProto = grpc.loadPackageDefinition(packageDefinition).ai as any;

// Create gRPC client
let aiClient: any = null;

export const getAIClient = () => {
    if (!aiClient) {
        aiClient = new aiProto.AIService(
            AI_SERVICE_URL,
            grpc.credentials.createInsecure()
        );
    }
    return aiClient;
};

export interface GenerateTextRequest {
    prompt: string;
    model: string;
    max_tokens: number;
    temperature: number;
    parameters?: Record<string, string>;
}

export interface GenerateTextResponse {
    text: string;
    model_used: string;
    tokens_used: number;
    confidence: number;
}

export const generateText = (
    request: GenerateTextRequest
): Promise<GenerateTextResponse> => {
    return new Promise((resolve, reject) => {
        const client = getAIClient();
        client.GenerateText(request, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

export const getEmbedding = (text: string, model: string = 'text-embedding-3-small'): Promise<any> => {
    return new Promise((resolve, reject) => {
        const client = getAIClient();
        client.GetEmbedding({ text, model }, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};

export const analyzeSentiment = (text: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const client = getAIClient();
        client.AnalyzeSentiment({ text }, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
};
