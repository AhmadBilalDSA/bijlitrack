import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IReference extends Document {
  userId: Types.ObjectId;
  referenceNo: string;
  referenceNoLast4?: string;
  feederCode?: string;
  trackingEnabled: boolean;
  trackingDays: number;
  trackingStartDate?: Date;
  trackingEndDate?: Date;
  consentGivenAt?: Date;
  lastCheckedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const referenceSchema = new Schema<IReference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referenceNo: { type: String, required: true },
    referenceNoLast4: { type: String },
    feederCode: { type: String },
    trackingEnabled: { type: Boolean, default: false },
    trackingDays: { type: Number, default: 30 },
    trackingStartDate: { type: Date },
    trackingEndDate: { type: Date },
    consentGivenAt: { type: Date },
    lastCheckedAt: { type: Date },
  },
  { timestamps: true }
);

export const Reference: Model<IReference> =
  (mongoose.models.Reference as Model<IReference>) ||
  mongoose.model<IReference>('Reference', referenceSchema);
