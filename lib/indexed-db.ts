import type { Invoice, User, Settings, SyncQueueItem } from "./types"

const DB_NAME = "invoiceapp"
const DB_VERSION = 4 // Increment version to trigger schema update

export class IndexedDBStorage {
  private static db: IDBDatabase | null = null

  static async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error("IndexedDB open error:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log("IndexedDB initialized successfully")
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        console.log("IndexedDB upgrade needed, version:", event.oldVersion, "->", event.newVersion)

        // Delete old object stores if they exist
        if (db.objectStoreNames.contains("invoices")) {
          db.deleteObjectStore("invoices")
        }
        if (db.objectStoreNames.contains("users")) {
          db.deleteObjectStore("users")
        }
        if (db.objectStoreNames.contains("settings")) {
          db.deleteObjectStore("settings")
        }
        if (db.objectStoreNames.contains("syncQueue")) {
          db.deleteObjectStore("syncQueue")
        }

        // Create new object stores with correct key paths
        const invoiceStore = db.createObjectStore("invoices", { keyPath: "id" })
        invoiceStore.createIndex("by_id", "id", { unique: true })
        invoiceStore.createIndex("by_invoiceNumber", "invoiceNumber", { unique: false })

        const userStore = db.createObjectStore("users", { keyPath: "id" })
        userStore.createIndex("by_username", "username", { unique: true })

        const settingsStore = db.createObjectStore("settings", { keyPath: "id" })
        settingsStore.createIndex("by_id", "id", { unique: true })

        db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true })

        console.log("IndexedDB object stores created successfully")
      }
    })
  }

  // --- Helper method to convert server data to IndexedDB format ---
  private static convertServerToLocal<T extends { _id?: string; id?: string }>(data: T): T {
    const converted = { ...data }

    // If we have _id but no id, copy _id to id
    if (converted._id && !converted.id) {
      converted.id = converted._id
    }

    // Remove _id to avoid conflicts
    delete converted._id

    return converted
  }

  // --- INVOICE METHODS ---

  static async saveInvoice(invoice: Partial<Invoice>): Promise<Invoice> {
    try {
      const db = this.db || (await this.init())

      // Convert server format to local IndexedDB format
      const invoiceToStore = this.convertServerToLocal(invoice)

      // Ensure the invoice has all required fields and 'id' is a string
      const completeInvoice: Invoice = {
        id: String(invoiceToStore.id), // Ensure ID is a string
        invoiceNumber: invoiceToStore.invoiceNumber || "",
        driverName: invoiceToStore.driverName || "",
        vehicleType: invoiceToStore.vehicleType || "",
        vehicleNumber: invoiceToStore.vehicleNumber || "",
        allowedWeightTotal: invoiceToStore.allowedWeightTotal || 0,
        axles: invoiceToStore.axles || "",
        allowedLoadWeight: invoiceToStore.allowedLoadWeight || 0,
        fee: invoiceToStore.fee || 0,
        penalty: invoiceToStore.penalty || 0,
        emptyWeight: invoiceToStore.emptyWeight || 0,
        discount: invoiceToStore.discount || 0,
        overweight: invoiceToStore.overweight || 0,
        type: invoiceToStore.type || "",
        payableAmount: invoiceToStore.payableAmount || 0,
        netAmount: invoiceToStore.netAmount || 0,
        note: invoiceToStore.note || "",
        scaleName: invoiceToStore.scaleName || "ميزان العبر",
        createdAt: invoiceToStore.createdAt ? new Date(invoiceToStore.createdAt) : new Date(),
        lastModified: invoiceToStore.lastModified ? new Date(invoiceToStore.lastModified) : new Date(),
        lastModifiedDevice: invoiceToStore.lastModifiedDevice || "unknown",
        synced: invoiceToStore.synced || false,
        pendingSync: invoiceToStore.pendingSync || true,
      } as Invoice

      // Check for existing version using Last-Write-Wins resolution
      const existing = await this.getInvoice(completeInvoice.id)
      if (existing && existing.lastModified && completeInvoice.lastModified) {
        const existingLastModified = new Date(existing.lastModified).getTime()
        const incomingLastModified = new Date(completeInvoice.lastModified).getTime()

        if (existingLastModified > incomingLastModified) {
          return existing
        }
      }

      const tx = db.transaction(["invoices"], "readwrite")
      const store = tx.objectStore("invoices")

      return new Promise((resolve, reject) => {
        const request = store.put(completeInvoice)
        request.onsuccess = () => resolve(completeInvoice)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      throw error
    }
  }

  static async getInvoice(id: string): Promise<Invoice | null> {
    try {
      const db = this.db || (await this.init())
      const tx = db.transaction(["invoices"], "readonly")
      const store = tx.objectStore("invoices")

      return new Promise((resolve, reject) => {
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      return null
    }
  }

  static async getAllInvoices(): Promise<Invoice[]> {
    try {
      const db = this.db || (await this.init())
      const tx = db.transaction(["invoices"], "readonly")
      const store = tx.objectStore("invoices")

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      return []
    }
  }

  static async deleteInvoice(id: string): Promise<void> {
    const db = this.db || (await this.init())
    const tx = db.transaction(["invoices"], "readwrite")
    const store = tx.objectStore("invoices")

    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // --- USER METHODS ---

  static async saveUser(user: User): Promise<void> {
    const db = this.db || (await this.init())

    // Check for duplicate username before saving
    const existingByUsername = await this.getUserByUsername(user.username)
    if (existingByUsername && existingByUsername.id !== user.id) {
      throw new Error(`Username ${user.username} already exists`)
    }

    const existing = await this.getUser(user.id)
    if (existing && existing.lastModified && user.lastModified) {
      const existingLastModified = new Date(existing.lastModified).getTime()
      const incomingLastModified = new Date(user.lastModified).getTime()

      if (existingLastModified > incomingLastModified) {
        return
      }
    }

    const tx = db.transaction(["users"], "readwrite")
    const store = tx.objectStore("users")

    return new Promise((resolve, reject) => {
      const request = store.put(user)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  static async getUser(id: string): Promise<User | null> {
    try {
      const db = this.db || (await this.init())
      const tx = db.transaction(["users"], "readonly")
      const store = tx.objectStore("users")

      return new Promise((resolve, reject) => {
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      return null
    }
  }

  static async getUserByUsername(username: string): Promise<User | null> {
    const db = this.db || (await this.init())
    const tx = db.transaction(["users"], "readonly")
    const store = tx.objectStore("users")
    const index = store.index("by_username")

    return new Promise((resolve, reject) => {
      const request = index.get(username)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  static async getAllUsers(): Promise<User[]> {
    const db = this.db || (await this.init())
    const tx = db.transaction(["users"], "readonly")
    const store = tx.objectStore("users")

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  static async deleteUser(id: string): Promise<void> {
    const db = this.db || (await this.init())
    const tx = db.transaction(["users"], "readwrite")
    const store = tx.objectStore("users")

    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // --- SETTINGS METHODS ---

  static async saveSettings(settings: Settings): Promise<void> {
    const db = this.db || (await this.init())

    // Convert server format to local IndexedDB format
    const settingsToStore = this.convertServerToLocal(settings)

    // Ensure settings has the correct ID
    if (!settingsToStore.id) {
      settingsToStore.id = "global-settings"
    }

    const tx = db.transaction(["settings"], "readwrite")
    const store = tx.objectStore("settings")

    return new Promise((resolve, reject) => {
      const request = store.put(settingsToStore)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  static async getSettings(): Promise<Settings | null> {
    try {
      const db = this.db || (await this.init())
      const tx = db.transaction(["settings"], "readonly")
      const store = tx.objectStore("settings")

      return new Promise((resolve, reject) => {
        const request = store.get("global-settings")
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      return null
    }
  }

  // --- SYNC QUEUE METHODS ---

  static async addToSyncQueue(item: Omit<SyncQueueItem, "id">): Promise<void> {
    const db = this.db || (await this.init())
    const tx = db.transaction(["syncQueue"], "readwrite")
    const store = tx.objectStore("syncQueue")

    return new Promise((resolve, reject) => {
      const request = store.add(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  static async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = this.db || (await this.init())
    const tx = db.transaction(["syncQueue"], "readonly")
    const store = tx.objectStore("syncQueue")

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  static async removeSyncQueueItem(id: number): Promise<void> {
    const db = this.db || (await this.init())
    const tx = db.transaction(["syncQueue"], "readwrite")
    const store = tx.objectStore("syncQueue")

    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // --- UTILITY METHODS ---

  static async clearDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME)
      request.onsuccess = () => {
        this.db = null
        resolve()
      }
      request.onerror = () => reject(request.error)
      request.onblocked = () => {
        resolve()
      }
    })
  }

  static async clearAllData(): Promise<void> {
    const db = this.db || (await this.init())
    const tx = db.transaction(["invoices", "users", "settings", "syncQueue"], "readwrite")

    return new Promise((resolve, reject) => {
      tx.objectStore("invoices").clear()
      tx.objectStore("users").clear()
      tx.objectStore("settings").clear()
      tx.objectStore("syncQueue").clear()

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}
