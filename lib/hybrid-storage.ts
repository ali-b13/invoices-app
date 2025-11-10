import { IndexedDBStorage } from "./indexed-db";
import { PasswordUtils } from "./password-utils";
import type {
  Invoice,
  User,
  Settings,
  InvoiceFormData,
  Permission,
  UserFormData,
} from "./types";

const DEVICE_ID = `device_${Math.random().toString(36).substr(2, 9)}`;

export interface InvoiceFilter {
  year?: number;
  month?: number;
  day?: number;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

class ApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export class HybridStorage {
  private static _isOnline: boolean =
    typeof window !== "undefined" ? navigator.onLine : false;
  private static syncInProgress = false;

  static get isOnline(): boolean {
    return this._isOnline;
  }

  static init() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this._isOnline = true;
        console.log("[HybridStorage] Went online. Starting sync...");
        this.handleOnline();
      });
      window.addEventListener("offline", () => {
        this._isOnline = false;
        console.log("[HybridStorage] Went offline.");
      });
      // Initial sync if online
      if (this._isOnline) {
        this.handleOnline();
      }
    }
  }

  private static async handleApiResponse(response: Response): Promise<any> {
    if (!response.ok) {
      let errorMessage = `Server returned ${response.status}`;
      let errorCode = `HTTP_${response.status}`;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        if (errorData.code) {
          errorCode = errorData.code;
        }
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      // Map status codes to user-friendly Arabic messages
      const errorMessages: { [key: number]: string } = {
        400: "طلب غير صالح",
        401: "غير مصرح بالوصول. يرجى تسجيل الدخول مرة أخرى",
        403: "ليس لديك الصلاحية لهذا الإجراء",
        404: "لم يتم العثور على المورد",
        409: "تعارض في البيانات",
        500: "خطأ في الخادم الداخلي",
      };

      const userMessage = errorMessages[response.status] || errorMessage;
      throw new ApiError(userMessage, response.status, errorCode);
    }

    return response.json();
  }

  private static async handleOnline() {
    try {
      await this.syncToServer();
      await this.fetchLatestFromServer();
    } catch (error) {
      console.log("[HybridStorage] Online sync error:", error);
    }
  }

  // --- INVOICE METHODS ---

  static async saveInvoice(invoice: InvoiceFormData): Promise<Invoice> {
    try {
      const newInvoice: Invoice = {
        ...invoice,
        id:
          invoice.id ||
          `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoiceNumber:
          invoice.invoiceNumber ||
          `TRN-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)
            .toUpperCase()}`,
        createdAt: invoice.createdAt || new Date(),
        lastModified: new Date(),
        lastModifiedDevice: DEVICE_ID,
        synced: !this.isOnline,
        pendingSync: !this.isOnline,
      };

      await IndexedDBStorage.saveInvoice(newInvoice);

      if (this.isOnline) {
        try {
          const response = await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newInvoice),
          });

          const serverInvoice = await this.handleApiResponse(response);
          await IndexedDBStorage.saveInvoice({
            ...newInvoice,
            ...serverInvoice,
            synced: true,
            pendingSync: false,
          });
          return serverInvoice;
        } catch (error) {
          console.log("[HybridStorage] Save invoice online failed:", error);
          await IndexedDBStorage.addToSyncQueue({
            type: "create",
            entity: "invoice",
            data: newInvoice,
            timestamp: new Date(),
            retries: 0,
          });

          // If it's an authentication error, re-throw
          if (error instanceof ApiError && error.status === 401) {
            throw error;
          }

          // For other errors, return local version
          return newInvoice;
        }
      } else {
        await IndexedDBStorage.addToSyncQueue({
          type: "create",
          entity: "invoice",
          data: newInvoice,
          timestamp: new Date(),
          retries: 0,
        });
        return newInvoice;
      }
    } catch (error) {
      console.log("[HybridStorage] Save invoice error:", error);
      throw error;
    }
  }

  static async updateInvoice(
    id: string,
    data: Partial<InvoiceFormData>
  ): Promise<Invoice | null> {
    try {
      const invoice = await IndexedDBStorage.getInvoice(id);
      if (!invoice) {
        throw new ApiError("الفاتورة غير موجودة", 404, "INVOICE_NOT_FOUND");
      }

      const updated: Invoice = {
        ...invoice,
        ...data,
        lastModified: new Date(),
        lastModifiedDevice: DEVICE_ID,
        synced: !this.isOnline,
        pendingSync: !this.isOnline,
      };

      await IndexedDBStorage.saveInvoice(updated);

      if (this.isOnline) {
        try {
          const response = await fetch(`/api/invoices/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });

          const serverUpdated = await this.handleApiResponse(response);
          await IndexedDBStorage.saveInvoice({
            ...updated,
            ...serverUpdated,
            synced: true,
            pendingSync: false,
          });
          return serverUpdated;
        } catch (error) {
          console.log("[HybridStorage] Update invoice online failed:", error);
          await IndexedDBStorage.addToSyncQueue({
            type: "update",
            entity: "invoice",
            data: updated,
            timestamp: new Date(),
            retries: 0,
          });

          if (error instanceof ApiError && error.status === 401) {
            throw error;
          }

          return updated;
        }
      } else {
        await IndexedDBStorage.addToSyncQueue({
          type: "update",
          entity: "invoice",
          data: updated,
          timestamp: new Date(),
          retries: 0,
        });
        return updated;
      }
    } catch (error) {
      console.log("[HybridStorage] Update invoice error:", error);
      throw error;
    }
  }

  static async deleteInvoice(id: string): Promise<boolean> {
    try {
      const invoice = await IndexedDBStorage.getInvoice(id);
      if (!invoice) {
        throw new ApiError("الفاتورة غير موجودة", 404, "INVOICE_NOT_FOUND");
      }

      await IndexedDBStorage.deleteInvoice(id);

      if (this.isOnline) {
        try {
          const response = await fetch(`/api/invoices/${id}`, {
            method: "DELETE",
          });
          await this.handleApiResponse(response);
          return true;
        } catch (error) {
          console.error("[HybridStorage] Delete invoice online failed:", error);
          await IndexedDBStorage.addToSyncQueue({
            type: "delete",
            entity: "invoice",
            data: { id },
            timestamp: new Date(),
            retries: 0,
          });

          if (error instanceof ApiError && error.status === 401) {
            throw error;
          }

          return true;
        }
      } else {
        await IndexedDBStorage.addToSyncQueue({
          type: "delete",
          entity: "invoice",
          data: { id },
          timestamp: new Date(),
          retries: 0,
        });
        return true;
      }
    } catch (error) {
      console.log("[HybridStorage] Delete invoice error:", error);
      throw error;
    }
  }

  static async getInvoices(
    filter: InvoiceFilter = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 50 }
  ): Promise<{ invoices: Invoice[]; total: number }> {
    try {
      if (this.isOnline) {
        try {
          const params = new URLSearchParams();
          if (filter.searchTerm) params.append("search", filter.searchTerm);
          if (filter.startDate)
            params.append(
              "startDate",
              filter.startDate.toISOString().split("T")[0]
            );
          if (filter.endDate)
            params.append(
              "endDate",
              filter.endDate.toISOString().split("T")[0]
            );
          params.append("page", pagination.page.toString());
          params.append("limit", pagination.limit.toString());

          const response = await fetch(`/api/invoices?${params.toString()}`);
          const serverInvoices = await this.handleApiResponse(response);
          const total =
            Number(response.headers.get("X-Total-Count")) ||
            serverInvoices.length;

          // Save fetched invoices to IndexedDB
          for (const invoice of serverInvoices) {
            await IndexedDBStorage.saveInvoice({
              ...invoice,
              synced: true,
              pendingSync: false,
            });
          }

          return { invoices: serverInvoices, total };
        } catch (error) {
          console.log(
            "[HybridStorage] Failed to fetch from server, falling back to local:",
            error
          );
          if (error instanceof ApiError && error.status === 401) {
            this.logout();
            throw error;
          }
          // Fall through to offline mode
        }
      }

      // Offline mode: get all invoices from IndexedDB and apply filtering/pagination locally
      const allInvoices = await IndexedDBStorage.getAllInvoices();

      const filteredInvoices = allInvoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.createdAt);

        if (filter.startDate && invoiceDate < filter.startDate) {
          return false;
        }
        if (filter.endDate) {
          const nextDay = new Date(filter.endDate);
          nextDay.setDate(nextDay.getDate() + 1);
          if (invoiceDate >= nextDay) {
            return false;
          }
        }

        if (filter.year && invoiceDate.getFullYear() !== filter.year) {
          return false;
        }
        if (filter.month && invoiceDate.getMonth() !== filter.month - 1) {
          return false;
        }
        if (filter.day && invoiceDate.getDate() !== filter.day) {
          return false;
        }

        if (filter.searchTerm) {
          const term = filter.searchTerm.toLowerCase();
          if (
            !invoice.invoiceNumber.toLowerCase().includes(term) &&
            !invoice.driverName.toLowerCase().includes(term) &&
            !invoice.vehicleNumber.toLowerCase().includes(term)
          ) {
            return false;
          }
        }

        return true;
      });

      const sortedInvoices = filteredInvoices.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Apply pagination for offline mode
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedInvoices = sortedInvoices.slice(startIndex, endIndex);

      return {
        invoices: paginatedInvoices,
        total: filteredInvoices.length,
      };
    } catch (error) {
      console.log("[HybridStorage] Get invoices error:", error);

      if (error instanceof ApiError) {
        // Re-throw only controlled human error
        throw error;
      }

      // Convert unknown system error to a safe human error
      throw new ApiError("Something went wrong while loading invoices.", 500);
    }
  }

  static async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const localInvoice = await IndexedDBStorage.getInvoice(id);

      if (this.isOnline && localInvoice) {
        try {
          const response = await fetch(`/api/invoices/${id}`);
          const serverInvoice = await this.handleApiResponse(response);
          await IndexedDBStorage.saveInvoice(serverInvoice);
          return serverInvoice;
        } catch (error) {
          console.log(
            "[HybridStorage] Failed to fetch single invoice from server:",
            error
          );
          // Return local version if server fetch fails
          return localInvoice;
        }
      }

      return localInvoice;
    } catch (error) {
      console.log("[HybridStorage] Get invoice by ID error:", error);
      throw error;
    }
  }

  // --- SETTINGS METHODS ---

  static async getSettings(): Promise<Settings> {
    try {
      let settings = await IndexedDBStorage.getSettings();
      if (!settings) {
        settings = {
          id: "global-settings",
          defaultScale: "ميزان العبر",
          invoiceNumberFormat: "TRN-{timestamp}-{random}",
          printerPreferences: { paperSize: "A4" },
          lastModified: new Date(),
          lastModifiedDevice: DEVICE_ID,
          synced: false,
          username: "خالد صالح الديني",
          weightUnit: "kg",
          pendingSync: false,
        };
        await IndexedDBStorage.saveSettings(settings);
      }
      return settings;
    } catch (error) {
      console.log("[HybridStorage] Get settings error:", error);
      throw error;
    }
  }

  static async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    try {
      const current = await this.getSettings();
      const updated: Settings = {
        ...current,
        ...settings,
        lastModified: new Date(),
        lastModifiedDevice: DEVICE_ID,
        synced: false,
        pendingSync: true,
      };

      await IndexedDBStorage.saveSettings(updated);

      const syncItem = {
        type: "update" as const,
        entity: "settings" as const,
        data: updated,
        timestamp: new Date(),
        retries: 0,
      };

      await IndexedDBStorage.addToSyncQueue(syncItem);

      if (this.isOnline) {
        try {
          const response = await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });
          const serverSettings = await this.handleApiResponse(response);
          await IndexedDBStorage.saveSettings({
            ...serverSettings,
            synced: true,
            pendingSync: false,
          });
          return serverSettings;
        } catch (error) {
          console.log(
            "[HybridStorage] Direct settings update failed, keeping in sync queue:",
            error
          );
          if (error instanceof ApiError && error.status === 401) {
            throw error;
          }
        }
      }

      return updated;
    } catch (error) {
      console.log("[HybridStorage] Update settings error:", error);
      throw error;
    }
  }

  // --- USER MANAGEMENT METHODS ---

  static async getAllUsers(): Promise<User[]> {
    try {
      return await IndexedDBStorage.getAllUsers();
    } catch (error) {
      console.log("[HybridStorage] Get all users error:", error);
      throw error;
    }
  }

  static async addUser(userData: UserFormData): Promise<User> {
    try {
      const allUsers = await IndexedDBStorage.getAllUsers();
      const existingUser = allUsers.find(
        (user) => user.username === userData.username
      );

      if (existingUser) {
        throw new ApiError("اسم المستخدم موجود مسبقاً", 409, "USERNAME_EXISTS");
      }

      const hashedPassword = await PasswordUtils.hashPassword(
        userData.password
      );

      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: userData.username,
        name: userData.name,
        password: hashedPassword,
        role: "user",
        permissions: ["view_invoices", "create_invoice", "print_invoice"],
        lastModified: new Date(),
        lastModifiedDevice: DEVICE_ID,
        isActive: true,
        createdAt: new Date(),
        synced: !this.isOnline,
        pendingSync: !this.isOnline,
      };

      await IndexedDBStorage.saveUser(newUser);

      const syncItem = {
        type: "create" as const,
        entity: "user" as const,
        data: newUser,
        timestamp: new Date(),
        retries: 0,
      };

      await IndexedDBStorage.addToSyncQueue(syncItem);

      if (this.isOnline) {
        try {
          const response = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newUser),
          });
          const serverUser = await this.handleApiResponse(response);
          await IndexedDBStorage.saveUser({
            ...serverUser,
            synced: true,
            pendingSync: false,
          });
          return serverUser;
        } catch (error) {
          console.log(
            "[HybridStorage] Direct user creation failed, keeping in sync queue:",
            error
          );
          if (error instanceof ApiError && error.status === 401) {
            throw error;
          }
        }
      }

      return newUser;
    } catch (error) {
      console.log("[HybridStorage] Add user error:", error);
      throw error;
    }
  }

  static async updateUser(
    id: string,
    data: Partial<User>
  ): Promise<User | null> {
    try {
      const user = await IndexedDBStorage.getUser(id);
      if (!user) {
        throw new ApiError("المستخدم غير موجود", 404, "USER_NOT_FOUND");
      }

      const updated: User = {
        ...user,
        ...data,
        lastModified: new Date(),
        lastModifiedDevice: DEVICE_ID,
        synced: !this.isOnline,
        pendingSync: !this.isOnline,
      };

      console.log(`[HybridStorage] Updating user ${id}`, {
        hasPassword: !!data.password,
        isOnline: this.isOnline,
      });

      await IndexedDBStorage.saveUser(updated);

      if (this.isOnline) {
        try {
          const response = await fetch(`/api/users/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });

          const serverUpdated = await this.handleApiResponse(response);
          console.log(
            `[HybridStorage] Server update successful for user ${id}`
          );

          await IndexedDBStorage.saveUser({
            ...updated,
            ...serverUpdated,
            synced: true,
            pendingSync: false,
          });
          return serverUpdated;
        } catch (error) {
          console.log(
            `[HybridStorage] Direct update failed for user ${id}:`,
            error
          );
          await IndexedDBStorage.addToSyncQueue({
            type: "update",
            entity: "user",
            data: updated,
            timestamp: new Date(),
            retries: 0,
          });

          if (error instanceof ApiError && error.status === 401) {
            throw error;
          }
        }
      } else {
        await IndexedDBStorage.addToSyncQueue({
          type: "update",
          entity: "user",
          data: updated,
          timestamp: new Date(),
          retries: 0,
        });
      }

      return updated;
    } catch (error) {
      console.log("[HybridStorage] Update user error:", error);
      throw error;
    }
  }

  static async deleteUser(id: string): Promise<void> {
    try {
      const user = await IndexedDBStorage.getUser(id);
      if (!user) {
        throw new ApiError("المستخدم غير موجود", 404, "USER_NOT_FOUND");
      }

      await IndexedDBStorage.deleteUser(id);

      const syncItem = {
        type: "delete" as const,
        entity: "user" as const,
        data: { id },
        timestamp: new Date(),
        retries: 0,
      };

      await IndexedDBStorage.addToSyncQueue(syncItem);

      if (this.isOnline) {
        try {
          const response = await fetch(`/api/users/${id}`, {
            method: "DELETE",
          });
          await this.handleApiResponse(response);
        } catch (error) {
          console.log(
            "[HybridStorage] Direct user deletion failed, keeping in sync queue:",
            error
          );
          if (error instanceof ApiError && error.status === 401) {
            throw error;
          }
        }
      }
    } catch (error) {
      console.log("[HybridStorage] Delete user error:", error);
      throw error;
    }
  }

  static async updateUserPermissions(
    id: string,
    permissions: Permission[]
  ): Promise<User | null> {
    try {
      const user = await IndexedDBStorage.getUser(id);
      if (!user) {
        throw new ApiError("المستخدم غير موجود", 404, "USER_NOT_FOUND");
      }

      const updated: User = {
        ...user,
        permissions,
        lastModified: new Date(),
        lastModifiedDevice: DEVICE_ID,
        synced: !this.isOnline,
        pendingSync: !this.isOnline,
      };

      await IndexedDBStorage.saveUser(updated);

      const syncItem = {
        type: "update" as const,
        entity: "user" as const,
        data: updated,
        timestamp: new Date(),
        retries: 0,
      };

      await IndexedDBStorage.addToSyncQueue(syncItem);

      if (this.isOnline) {
        try {
          const response = await fetch(`/api/users/${id}/permissions`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ permissions }),
          });
          const serverUser = await this.handleApiResponse(response);
          await IndexedDBStorage.saveUser({
            ...serverUser,
            synced: true,
            pendingSync: false,
          });
          return serverUser;
        } catch (error) {
          console.log(
            "[HybridStorage] Direct user permission update failed, keeping in sync queue:",
            error
          );
          if (error instanceof ApiError && error.status === 401) {
            throw error;
          }
        }
      }

      return updated;
    } catch (error) {
      console.log("[HybridStorage] Update user permissions error:", error);
      throw error;
    }
  }

  // --- AUTH & UTILITY METHODS ---

  static async login(username: string, password: string): Promise<User | null> {
    try {
      if (this.isOnline) {
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });

          const user = await this.handleApiResponse(response);
          await IndexedDBStorage.saveUser(user);
          localStorage.setItem("currentUser", JSON.stringify(user));

          await this.handleOnline();
          return user;
        } catch (error) {
          console.log(
            "[HybridStorage] Server login failed, trying offline",
            error
          );
          // Continue to offline login
        }
      }

      // Offline login
      const offlineUser = await IndexedDBStorage.getUserByUsername(username);
      if (offlineUser) {
        try {
          console.log(
            `[HybridStorage] Offline login attempt for user: ${username}`
          );
          const isValid = await PasswordUtils.comparePassword(
            password,
            offlineUser.password
          );

          if (isValid) {
            localStorage.setItem("currentUser", JSON.stringify(offlineUser));
            return offlineUser;
          } else {
            throw new ApiError(
              "كلمة المرور غير صحيحة",
              401,
              "INVALID_PASSWORD"
            );
          }
        } catch (error) {
          console.log("[HybridStorage] Offline login error:", error);
          throw error;
        }
      } else {
        throw new ApiError("المستخدم غير موجود", 404, "USER_NOT_FOUND");
      }
    } catch (error) {
      console.log("[HybridStorage] Login error:", error);
      throw error;
    }
  }

  static getCurrentUser(): User | null {
    try {
      if (typeof window === "undefined") return null;
      const stored = localStorage.getItem("currentUser");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.log("[HybridStorage] Get current user error:", error);
      return null;
    }
  }

  static async logout(): Promise<void> {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("currentUser");
      }

      if (this.isOnline) {
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.log("[HybridStorage] Logout error:", error);
          // Continue with local logout even if server logout fails
        }
      }
    } catch (error) {
      console.log("[HybridStorage] Logout error:", error);
      throw error;
    }
  }

  // --- SYNC LOGIC ---

  static async syncToServer(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const syncQueue = await IndexedDBStorage.getSyncQueue();

      for (const item of syncQueue) {
        try {
          let response: Response;
          let url: string;
          let method: string;
          let body: string | undefined = JSON.stringify(item.data);
          const headers = { "Content-Type": "application/json" };

          switch (item.entity) {
            case "invoice":
              url = `/api/invoices/${item.data.id || ""}`;
              method =
                item.type === "create"
                  ? "POST"
                  : item.type === "update"
                  ? "PUT"
                  : "DELETE";
              if (item.type === "delete") body = undefined;
              break;
            case "settings":
              url = "/api/settings";
              method = "PUT";
              break;
            case "user":
              if (item.type === "create") {
                url = "/api/users";
                method = "POST";
              } else if (item.type === "update" && item.data.permissions) {
                url = `/api/users/${item.data.id}/permissions`;
                method = "PUT";
                body = JSON.stringify({ permissions: item.data.permissions });
              } else if (item.type === "update") {
                url = `/api/users/${item.data.id}`;
                method = "PUT";
              } else {
                url = `/api/users/${item.data.id}`;
                method = "DELETE";
                body = undefined;
              }
              break;
            default:
              console.warn(
                `[HybridStorage] Unknown sync entity: ${item.entity}`
              );
              await IndexedDBStorage.removeSyncQueueItem(Number(item.id!));
              continue;
          }

          response = await fetch(url, { method, headers, body });

          if (response.ok) {
            await IndexedDBStorage.removeSyncQueueItem(Number(item.id!));

            if (item.type !== "delete") {
              const serverData = await response.json();
              if (item.entity === "invoice") {
                await IndexedDBStorage.saveInvoice({
                  ...serverData,
                  synced: true,
                  pendingSync: false,
                });
              } else if (item.entity === "user") {
                await IndexedDBStorage.saveUser({
                  ...serverData,
                  synced: true,
                  pendingSync: false,
                });
              } else if (item.entity === "settings") {
                await IndexedDBStorage.saveSettings({
                  ...serverData,
                  synced: true,
                  pendingSync: false,
                });
              }
            } else if (item.entity === "user") {
              await IndexedDBStorage.deleteUser(item.data.id);
            }
          } else {
            console.log(
              `[HybridStorage] Sync failed for ${item.entity} (ID: ${item.data.id}):`,
              response.status
            );
            // Increment retry count
            item.retries = (item.retries || 0) + 1;
            if (item.retries > 3) {
              // Remove from queue after 3 failed attempts
              await IndexedDBStorage.removeSyncQueueItem(Number(item.id!));
            }
          }
        } catch (error) {
          console.log(
            `[HybridStorage] Sync error for ${item.entity} (ID: ${item.data.id}):`,
            error
          );
          // Increment retry count for network errors too
          item.retries = (item.retries || 0) + 1;
          if (item.retries > 3) {
            await IndexedDBStorage.removeSyncQueueItem(Number(item.id!));
          }
        }
      }
    } catch (error) {
      console.log("[HybridStorage] Sync error:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  static async fetchLatestFromServer(): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Fetch first page only for initial sync - other pages will be fetched on demand
      const response = await fetch("/api/invoices?limit=50");
      const serverInvoices: Invoice[] = response.ok
        ? await response.json()
        : [];

      const serverUsersResponse = await fetch("/api/users");
      const serverUsers: User[] = serverUsersResponse.ok
        ? await serverUsersResponse.json()
        : [];

      const serverSettingsResponse = await fetch("/api/settings");
      const serverSettings: Settings = serverSettingsResponse.ok
        ? await serverSettingsResponse.json()
        : null;

      // Only sync the invoices we fetched (first 50)
      // This prevents overwriting local data with incomplete server data
      for (const invoice of serverInvoices) {
        await IndexedDBStorage.saveInvoice({
          ...invoice,
          synced: true,
          pendingSync: false,
        });
      }

      // Users and settings sync remains the same
      const localUsers = await IndexedDBStorage.getAllUsers();
      const serverUserIds = new Set(serverUsers.map((u) => u.id));

      for (const localUser of localUsers) {
        if (!serverUserIds.has(localUser.id) && !localUser.pendingSync) {
          await IndexedDBStorage.deleteUser(localUser.id);
        }
      }

      for (const user of serverUsers) {
        await IndexedDBStorage.saveUser({
          ...user,
          synced: true,
          pendingSync: false,
        });
      }

      if (serverSettings) {
        await IndexedDBStorage.saveSettings({
          ...serverSettings,
          synced: true,
          pendingSync: false,
        });
      }
    } catch (error) {
      console.log("[HybridStorage] Failed to fetch latest data:", error);
    }
  }
}

HybridStorage.init();
