import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IScraperLog extends Document {
  jobType: string;
  status: 'success' | 'failed';
  message?: string;
  referenceLast4?: string;
  errorDetails?: string;
  startedAt: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const scraperLogSchema = new Schema<IScraperLog>(
  {
    jobType: { type: String, required: true },
    status: { type: String, enum: ['success', 'failed'], required: true },
    message: { type: String },
    referenceLast4: { type: String },
    errorDetails: { type: String },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

export const ScraperLog: Model<IScraperLog> =
  (mongoose.models.ScraperLog as Model<IScraperLog>) ||
  mongoose.model<IScraperLog>('ScraperLog', scraperLogSchema);
