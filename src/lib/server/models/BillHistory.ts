import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IBillHistory extends Document {
  userId: Types.ObjectId;
  referenceId: Types.ObjectId;
  billMonth: string;
  amountDue?: number;
  dueDate?: Date;
  latePaymentSurcharge?: number;
  status?: string;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const billHistorySchema = new Schema<IBillHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referenceId: { type: Schema.Types.ObjectId, ref: 'Reference', required: true },
    billMonth: { type: String, required: true },
    amountDue: { type: Number },
    dueDate: { type: Date },
    latePaymentSurcharge: { type: Number },
    status: { type: String }, // 'Paid', 'Unpaid', etc.
    scrapedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const BillHistory: Model<IBillHistory> =
  (mongoose.models.BillHistory as Model<IBillHistory>) ||
  mongoose.model<IBillHistory>('BillHistory', billHistorySchema);
