import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IAnalysisReport extends Document {
  userId: Types.ObjectId;
  referenceId: Types.ObjectId;
  reportType: 'daily' | 'weekly' | 'monthly';
  summary?: string;
  billingInsights: string[];
  outageInsights: string[];
  recommendations: string[];
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const analysisReportSchema = new Schema<IAnalysisReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referenceId: { type: Schema.Types.ObjectId, ref: 'Reference', required: true },
    reportType: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    summary: { type: String },
    billingInsights: { type: [String], default: [] },
    outageInsights: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AnalysisReport: Model<IAnalysisReport> =
  (mongoose.models.AnalysisReport as Model<IAnalysisReport>) ||
  mongoose.model<IAnalysisReport>('AnalysisReport', analysisReportSchema);
