import dotenv from 'dotenv';
import { startGrpcServer } from './grpc/execution.service';

// Load environment variables
dotenv.config();

const GRPC_PORT = parseInt(process.env.GRPC_PORT || '50051', 10);

// Start gRPC server
startGrpcServer(GRPC_PORT);

console.log('📡 Execution Service initialized');
console.log('💡 Make sure to start the worker separately: npm run dev:worker');

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    process.exit(0);
});
