// Invoice types and database schema
export interface Invoice {
  id: string
  _id?: string; // Add this
  invoiceNumber: string
  driverName: string
  vehicleType: string
  vehicleNumber: string
  allowedWeightTotal: string
  axles: string
  allowedLoadWeight: string
  fee: number
  penalty: number
  emptyWeight: string
  discount: number
  overweight: string
  type: string
  payableAmount: number
  netAmount: number
  note?: string
  scaleName: string
  createdAt: Date
  lastModified: Date
  lastModifiedDevice: string
  synced: boolean
  pendingSync: boolean
}

export interface InvoiceFormData extends Omit<Invoice, "id" | "createdAt" | "lastModified" | "lastModifiedDevice" | "synced" | "pendingSync"> {
  id?: string
  createdAt?: Date
}

export interface Settings {
  id: string // Added for IndexedDB keyPath
  defaultScale: string
  username: string
  invoiceNumberFormat: string
  weightUnit: "kg" | "ton"
  printerPreferences?: {
    defaultPrinter?: string
    paperSize?: "A4" | "A5"
  }
  lastModified:Date
  lastModifiedDevice:string
  synced:boolean
  pendingSync:boolean
}

export type UserRole = "admin" | "user"

export type Permission =
  | "view_invoices"
  | "create_invoice"
  | "edit_invoice"
  | "delete_invoice"
  | "print_invoice"
  | "download_invoice"
  | "export_data"
  | "manage_users"
  | "manage_permissions"

export interface User {
  id: string
  name: string
  username: string
  password: string // In production, this should be hashed
  role: UserRole
  permissions: Permission[]
  createdAt: Date
  lastModified:Date
  lastModifiedDevice:string
  synced:boolean
  pendingSync:boolean
  isActive: boolean
}

// NEW: Interface for user data when creating or updating a user (excluding auto-generated fields)
export interface UserFormData extends Omit<User,"id"| "role" | "permissions" | "createdAt" | "lastModified" | "lastModifiedDevice" | "synced" | "pendingSync" | "isActive"> {
  // Only include fields that are submitted by the user
}

export interface AuthContext {
  user: User | null
  isLoggedIn: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
}

export interface SyncMetadata {
  lastModified: Date
  lastModifiedDevice: string
  synced: boolean
  syncedAt?: Date
  pendingSync: boolean
}

// Renamed from SyncQueue to SyncQueueItem for clarity
export interface SyncQueueItem {
  id?: number // Changed to number for IndexedDB auto-increment key
  type: "create" | "update" | "delete"
  entity: "invoice" | "user" | "settings"
  data: any
  timestamp: Date
  retries: number
}


export interface InvoiceFilter {
  year?: number
  month?: number
  day?: number
  startDate?: Date
  endDate?: Date
  searchTerm?: string
}