import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IOutageHistory extends Document {
  userId: Types.ObjectId;
  referenceId: Types.ObjectId;
  feederCode?: string;
  feederName?: string;
  date: Date;
  feederStatus?: string; // 'ON', 'OFF'
  hourlyOutageMinutes: number[];
  hourlyStatus: string[];
  scheduledMinutes: number[];
  totalOutageMinutes: number;
  actualOutageHours: number;
  scheduledOutageHours: number;
  eventLogs: Array<Record<string, any>>;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const outageHistorySchema = new Schema<IOutageHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referenceId: { type: Schema.Types.ObjectId, ref: 'Reference', required: true },
    feederCode: { type: String },
    feederName: { type: String },
    date: { type: Date, required: true },
    feederStatus: { type: String },
    hourlyOutageMinutes: { type: [Number], default: [] },
    hourlyStatus: { type: [String], default: [] },
    scheduledMinutes: { type: [Number], default: [] },
    totalOutageMinutes: { type: Number, default: 0 },
    actualOutageHours: { type: Number, default: 0 },
    scheduledOutageHours: { type: Number, default: 0 },
    eventLogs: [Schema.Types.Mixed],
    scrapedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const OutageHistory: Model<IOutageHistory> =
  (mongoose.models.OutageHistory as Model<IOutageHistory>) ||
  mongoose.model<IOutageHistory>('OutageHistory', outageHistorySchema);
