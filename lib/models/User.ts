import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
  _id: string; // Changed to string like Invoice
  username: string;
  password: string;
  name: string;
  role: "admin" | "user";
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  lastModified: Date;
  lastModifiedDevice: string;
  synced: boolean;
  pendingSync: boolean;
}

const userSchema = new Schema<IUser>(
  {
    _id: { // Exactly like Invoice model - string ID
      type: String,
      required: true,
      immutable: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    permissions: [
      {
        type: String,
        enum: [
          "view_invoices",
          "create_invoice",
          "edit_invoice",
          "delete_invoice",
          "print_invoice",
          "download_invoice",
          "export_data",
          "manage_users",
          "manage_permissions",
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
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
);

// Add a virtual 'id' property to map _id back to 'id' for client-side compatibility
userSchema.virtual('id').get(function() {
  return this._id;
});

// Ensure virtuals are included when converting to JSON
userSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret: any) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

userSchema.index({ lastModified: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);