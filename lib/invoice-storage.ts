// Local storage management for invoices
const INVOICES_KEY = "invoices"
const SETTINGS_KEY = "settings"
const INVOICE_COUNTER_KEY = "invoiceCounter"

import type { Invoice, InvoiceFormData, Settings } from "./types"
import { UserStorage } from "./user-storage"

export class InvoiceStorage {
  private static getFromStorage(key: string, defaultValue: any = null) {
    if (typeof window === "undefined") return defaultValue
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  }

  private static setToStorage(key: string, value: any) {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      console.error(`Failed to save ${key}`)
    }
  }

  static generateInvoiceNumber(): string {
    let counter = this.getFromStorage(INVOICE_COUNTER_KEY, 0)
    counter += 1
    this.setToStorage(INVOICE_COUNTER_KEY, counter)
    return `TRN-${String(counter).padStart(6, "0")}`
  }

  static saveInvoice(invoice: InvoiceFormData): Invoice {
    const invoices = this.getInvoices()
    const newInvoice: Invoice = {
      ...invoice,
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber: invoice.invoiceNumber || this.generateInvoiceNumber(),
      createdAt: invoice.createdAt || new Date(),
    }
    invoices.push(newInvoice)
    this.setToStorage(INVOICES_KEY, invoices)
    return newInvoice
  }

  static getInvoices(): Invoice[] {
    return this.getFromStorage(INVOICES_KEY, []).map((inv: any) => ({
      ...inv,
      createdAt: new Date(inv.createdAt),
    }))
  }

  static getInvoiceById(id: string): Invoice | null {
    const invoices = this.getInvoices()
    return invoices.find((inv) => inv.id === id) || null
  }

  static updateInvoice(id: string, data: Partial<InvoiceFormData>): Invoice | null {
    const invoices = this.getInvoices()
    const index = invoices.findIndex((inv) => inv.id === id)
    if (index === -1) return null
    invoices[index] = { ...invoices[index], ...data }
    this.setToStorage(INVOICES_KEY, invoices)
    return invoices[index]
  }

  static deleteInvoice(id: string): boolean {
    const invoices = this.getInvoices()
    const filtered = invoices.filter((inv) => inv.id !== id)
    if (filtered.length === invoices.length) return false
    this.setToStorage(INVOICES_KEY, filtered)
    return true
  }

static getSettings(): Settings {
  const storedSettings = this.getFromStorage(SETTINGS_KEY, {
    defaultScale: "ميزان العبر",
    invoiceNumberFormat: "TRN",
    printerPreferences: {
      paperSize: "A4",
    },
  });

  // Get current user's display name from UserStorage
  const currentUser = UserStorage.getCurrentUser();
  const username = currentUser?.name || "خالد صالح الديني";

  return {
    ...storedSettings,
    username, // This will always reflect the current user's display name
  };
}

  static updateSettings(settings: Partial<Settings>): Settings {
    const current = this.getSettings()
    const updated = { ...current, ...settings }
    this.setToStorage(SETTINGS_KEY, updated)
    return updated
  }

  static deleteAllInvoices(): void {
    this.setToStorage(INVOICES_KEY, [])
  }

  static exportAsJSON(): string {
    return JSON.stringify(
      {
        invoices: this.getInvoices(),
        settings: this.getSettings(),
        exportDate: new Date().toISOString(),
      },
      null,
      2,
    )
  }

  static importFromJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString)
      if (data.invoices && Array.isArray(data.invoices)) {
        this.setToStorage(INVOICES_KEY, data.invoices)
      }
      if (data.settings) {
        this.setToStorage(SETTINGS_KEY, data.settings)
      }
      return true
    } catch {
      return false
    }
  }
}
