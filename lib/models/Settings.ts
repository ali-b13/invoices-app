import mongoose, { Schema, type Document } from "mongoose"

export interface ISettings extends Document {
  _id: string; // Changed to string like Invoice
  defaultScale: string
  username: string
  invoiceNumberFormat: string
  weightUnit: "kg" | "ton"
  printerPreferences?: {
    defaultPrinter?: string
    paperSize?: "A4" | "A5"
  }
  lastModified: Date
  lastModifiedDevice: string
  synced: boolean
  syncedAt?: Date
  pendingSync: boolean
}

const settingsSchema = new Schema<ISettings>(
  {
    _id: { // Exactly like Invoice model
      type: String,
      required: true,
      immutable: true,
    },
    defaultScale: {
      type: String,
      required: true,
      default: "ميزان العبر"
    },
    username: {
      type: String,
      required: true,
      default: "خالد صالح الديني"
    },
    invoiceNumberFormat: {
      type: String,
      required: true,
      default: "TRN-{timestamp}-{random}"
    },
    weightUnit: {
      type: String,
      enum: ["kg", "ton"],
      required: true,
      default: "kg"
    },
    printerPreferences: {
      defaultPrinter: String,
      paperSize: {
        type: String,
        enum: ["A4", "A5"],
        default: "A4"
      },
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    lastModifiedDevice: {
      type: String,
      required: true,
    },
    synced: {
      type: Boolean,
      default: false,
    },
    syncedAt: Date,
    pendingSync: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: false, // Disable Mongoose timestamps like Invoice
    _id: false, // Prevent Mongoose from adding its default ObjectId _id
    id: false, // Prevent Mongoose from adding a virtual 'id' getter
  }
)

// Add a virtual 'id' property to map _id back to 'id' for client-side compatibility
settingsSchema.virtual('id').get(function() {
  return this._id;
})

// Ensure virtuals are included when converting to JSON
settingsSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret: any) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
})

settingsSchema.index({ lastModified: 1 })

export const Settings = mongoose.models.Settings || mongoose.model<ISettings>("Settings", settingsSchema)