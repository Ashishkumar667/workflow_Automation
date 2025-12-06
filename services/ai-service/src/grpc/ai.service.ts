import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(__dirname, '../../../shared/protos/ai.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String as any,
    enums: String as any,
    defaults: true,
    oneofs: true,
});

const aiProto = grpc.loadPackageDefinition(packageDefinition).ai as any;

// Mock responses
const mockResponses = [
    "Hello! I'm a mock AI assistant. How can I help you today?",
    "This is a simulated response from the AI service.",
    "Processing your request with advanced AI algorithms... Just kidding, this is a mock!",
    "AI at your service! (Mock version)",
    "Analyzing data and generating insights... (simulated response)",
];

// Implementation of AIService
const aiServiceImpl = {
    GenerateText: (call: any, callback: any) => {
        try {
            const { prompt, model, max_tokens, temperature } = call.request;

            console.log(`\n📥 GenerateText request:`);
            console.log(`   Prompt: ${prompt}`);
            console.log(`   Model: ${model}`);
            console.log(`   Max Tokens: ${max_tokens}`);
            console.log(`   Temperature: ${temperature}`);

            // Simulate processing delay
            setTimeout(() => {
                const responseText =
                    mockResponses[Math.floor(Math.random() * mockResponses.length)];

                const response = {
                    text: `[${model}] ${responseText}\n\nPrompt was: "${prompt}"`,
                    model_used: model || 'gpt-4',
                    tokens_used: Math.floor(Math.random() * 100) + 10,
                    confidence: 0.85 + Math.random() * 0.15,
                };

                console.log(`✅ Generated text: ${response.text.substring(0, 50)}...`);

                callback(null, response);
            }, 100 + Math.random() * 400); // Random delay 100-500ms
        } catch (error: any) {
            console.error('GenerateText error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message,
            });
        }
    },

    GetEmbedding: (call: any, callback: any) => {
        try {
            const { text, model } = call.request;

            console.log(`\n📥 GetEmbedding request:`);
            console.log(`   Text: ${text}`);
            console.log(`   Model: ${model}`);

            // Generate mock embedding (768 dimensions)
            const dimensions = 768;
            const embedding = Array.from({ length: dimensions }, () =>
                Math.random() * 2 - 1
            );

            const response = {
                embedding,
                dimensions,
            };

            console.log(`✅ Generated embedding with ${dimensions} dimensions`);

            callback(null, response);
        } catch (error: any) {
            console.error('GetEmbedding error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message,
            });
        }
    },

    AnalyzeSentiment: (call: any, callback: any) => {
        try {
            const { text } = call.request;

            console.log(`\n📥 AnalyzeSentiment request:`);
            console.log(`   Text: ${text}`);

            // Mock sentiment analysis
            const sentiments = ['positive', 'negative', 'neutral'];
            const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
            const score = sentiment === 'positive' ? 0.5 + Math.random() * 0.5 :
                sentiment === 'negative' ? -0.5 - Math.random() * 0.5 :
                    -0.2 + Math.random() * 0.4;

            const response = {
                sentiment,
                score,
                emotions: {
                    joy: sentiment === 'positive' ? 0.7 + Math.random() * 0.3 : Math.random() * 0.3,
                    anger: sentiment === 'negative' ? 0.7 + Math.random() * 0.3 : Math.random() * 0.3,
                    sadness: sentiment === 'negative' ? 0.5 + Math.random() * 0.5 : Math.random() * 0.3,
                    surprise: Math.random() * 0.5,
                    fear: Math.random() * 0.2,
                },
            };

            console.log(`✅ Sentiment: ${sentiment} (score: ${score.toFixed(2)})`);

            callback(null, response);
        } catch (error: any) {
            console.error('AnalyzeSentiment error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message,
            });
        }
    },
};

export const startGrpcServer = (port: number) => {
    const server = new grpc.Server();

    server.addService(aiProto.AIService.service, aiServiceImpl);

    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, boundPort) => {
            if (err) {
                console.error('Failed to bind gRPC server:', err);
                process.exit(1);
            }

            console.log(`🚀 AI Service (gRPC) running on port ${boundPort}`);
            console.log(`🤖 Mock AI ready to serve requests`);
        }
    );

    return server;
};
