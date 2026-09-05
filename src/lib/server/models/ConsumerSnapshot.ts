import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IConsumerSnapshot extends Document {
  userId: Types.ObjectId;
  referenceId: Types.ObjectId;
  consumerInfo?: Record<string, any>;
  billingInfo?: Record<string, any>;
  feederInfo?: Record<string, any>;
  loadManagementInfo?: Record<string, any>;
  outageInfo?: Record<string, any>;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const snapshotSchema = new Schema<IConsumerSnapshot>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referenceId: { type: Schema.Types.ObjectId, ref: 'Reference', required: true },
    consumerInfo: { type: Schema.Types.Mixed },
    billingInfo: { type: Schema.Types.Mixed },
    feederInfo: { type: Schema.Types.Mixed },
    loadManagementInfo: { type: Schema.Types.Mixed },
    outageInfo: { type: Schema.Types.Mixed },
    scrapedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const ConsumerSnapshot: Model<IConsumerSnapshot> =
  (mongoose.models.ConsumerSnapshot as Model<IConsumerSnapshot>) ||
  mongoose.model<IConsumerSnapshot>('ConsumerSnapshot', snapshotSchema);
