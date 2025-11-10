import mongoose, { Schema, type Document } from "mongoose";

export interface IInvoice extends Document {
  _id: string;
  invoiceNumber: string;
  driverName: string;
  vehicleType: string;
  vehicleNumber: string;
  allowedWeightTotal: string; // Changed from number to string
  axles: string;
  allowedLoadWeight: string; // Changed from number to string
  fee: number;
  penalty: number;
  emptyWeight: string; // Changed from number to string
  discount: number;
  overweight: string; // Changed from number to string
  type: string;
  routeOrRegion?: string;
  payableAmount: number;
  netAmount: number;
  note?: string;
  scaleName: string;
  createdAt: Date;
  lastModified: Date;
  lastModifiedDevice: string;
  synced: boolean;
  syncedAt?: Date;
  pendingSync: boolean;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    _id: {
      type: String,
      required: true,
      immutable: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    driverName: { type: String, required: true },
    vehicleType: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    allowedWeightTotal: { type: String, required: true }, // Changed to String
    axles: { type: String, required: true },
    allowedLoadWeight: { type: String, required: true }, // Changed to String
    fee: { type: Number, required: true },
    penalty: { type: Number, required: true },
    emptyWeight: { type: String, required: true }, // Changed to String
    discount: { type: Number, required: true },
    overweight: { type: String, required: true }, // Changed to String
    type: { type: String, required: true },
    routeOrRegion: String,
    payableAmount: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    note: String,
    scaleName: String,
    createdAt: { type: Date, default: Date.now },
    lastModified: { type: Date, default: Date.now },
    lastModifiedDevice: { type: String, required: true },
    synced: { type: Boolean, default: false },
    syncedAt: Date,
    pendingSync: { type: Boolean, default: false },
  },
  { 
    timestamps: false,
    _id: false,
    id: false,
  }
);

// Add a virtual 'id' property to map _id back to 'id' for client-side compatibility
invoiceSchema.virtual('id').get(function() {
  return this._id;
});

// Ensure virtuals are included when converting to JSON
invoiceSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret: any) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

invoiceSchema.index({ lastModified: 1 });

export const Invoice =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", invoiceSchema);