import dotenv from 'dotenv';
import { startGrpcServer } from './grpc/ai.service';

// Load environment variables
dotenv.config();

const GRPC_PORT = parseInt(process.env.GRPC_PORT || '50052', 10);

// Start gRPC server
startGrpcServer(GRPC_PORT);

console.log('🧠 Mock AI Service initialized');

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    process.exit(0);
});
