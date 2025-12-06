import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflowStep {
    name: string;
    type: 'ai' | 'http' | 'transform' | 'condition' | 'wait';
    config: Record<string, any>;
    order: number;
}

export interface IWorkflow extends Document {
    name: string;
    description?: string;
    userId: string;
    steps: IWorkflowStep[];
    isActive: boolean;
    triggers: {
        type: 'manual' | 'webhook' | 'scheduled';
        config?: Record<string, any>;
    }[];
    createdAt: Date;
    updatedAt: Date;
    version: number;
}

const workflowStepSchema = new Schema<IWorkflowStep>({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['ai', 'http', 'transform', 'condition', 'wait'],
        required: true,
    },
    config: {
        type: Schema.Types.Mixed,
        default: {},
    },
    order: {
        type: Number,
        required: true,
    },
});

const workflowSchema = new Schema<IWorkflow>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        steps: [workflowStepSchema],
        isActive: {
            type: Boolean,
            default: true,
        },
        triggers: [
            {
                type: {
                    type: String,
                    enum: ['manual', 'webhook', 'scheduled'],
                    required: true,
                },
                config: {
                    type: Schema.Types.Mixed,
                    default: {},
                },
            },
        ],
        version: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
    }
);

// Index for searching workflows
workflowSchema.index({ name: 'text', description: 'text' });

export const Workflow = mongoose.model<IWorkflow>('Workflow', workflowSchema);
