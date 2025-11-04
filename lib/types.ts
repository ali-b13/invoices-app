// Invoice types and database schema
export interface Invoice {
  id: string
  invoiceNumber: string
  driverName: string
  vehicleType: string
  vehicleNumber: string
  allowedLoadWeightUnit: "kg" | "ton" 

  allowedWeightTotal: number
  axles: string
  allowedLoadWeight: number
  fee: number
  penalty: number
  emptyWeight: number
  discount: number
  overweight: number
  type: string
  routeOrRegion: string
  payableAmount: number
  netAmount: number
  note?: string
  scaleName: string
  createdAt: Date
}

export interface InvoiceFormData extends Omit<Invoice, "id"  | "createdAt"> {
  createdAt?: Date
}

export interface Settings {
  defaultScale: string;
  username: string;
  invoiceNumberFormat: string;
  weightUnit: "kg" | "ton" 
  printerPreferences?: {
    defaultPrinter?: string;
    paperSize?: "A4" | "A5";
  };
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
  name:string
  username: string
  password: string // In production, this should be hashed
  role: UserRole
  permissions: Permission[]
  createdAt: Date
  isActive: boolean
}

export interface AuthContext {
  user: User | null
  isLoggedIn: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
}
