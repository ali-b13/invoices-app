import type { User, Permission, UserRole } from "./types"

const USERS_KEY = "users"
const CURRENT_USER_KEY = "currentUser"

const DEFAULT_ADMIN_PERMISSIONS: Permission[] = [
  "view_invoices",
  "create_invoice",
  "edit_invoice",
  "delete_invoice",
  "print_invoice",
  "download_invoice",
  "export_data",
  "manage_users",
  "manage_permissions",
]

const DEFAULT_USER_PERMISSIONS: Permission[] = ["view_invoices", "create_invoice", "print_invoice", "download_invoice"]

export class UserStorage {
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

  static initializeDefaultUsers() {
    const users = this.getFromStorage(USERS_KEY, null)
    if (!users) {
      const defaultUsers: User[] = [
        {
          id: "admin_1",
          name:"Ali Alamri",
          username: "admin",
          password: "admin123", // Default admin password
          role: "admin",
          permissions: DEFAULT_ADMIN_PERMISSIONS,
          createdAt: new Date(),
          isActive: true,
        },
        {
          id: "user_1",
          name:"User 2",
          username: "user",
          password: "user123",
          role: "user",
          permissions: DEFAULT_USER_PERMISSIONS,
          createdAt: new Date(),
          isActive: true,
        },
      ]
      this.setToStorage(USERS_KEY, defaultUsers)
    }
  }

  static login(username: string, password: string): User | null {
    const users = this.getFromStorage(USERS_KEY, []) as User[]
    const user = users.find((u) => u.username == username && u.password == password && u.isActive)
    if (user) {
      const sessionUser = {
        ...user,
        createdAt: new Date(user.createdAt),
      }
      this.setToStorage(CURRENT_USER_KEY, sessionUser)
      return sessionUser
    }
    return null
  }

  static logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CURRENT_USER_KEY)
    }
  }

  static getCurrentUser(): User | null {
    const user = this.getFromStorage(CURRENT_USER_KEY, null)
    return user
      ? {
          ...user,
          createdAt: new Date(user.createdAt),
        }
      : null
  }

  static isLoggedIn(): boolean {
    return this.getCurrentUser() !== null
  }

  static hasPermission(permission: Permission): boolean {
    const user = this.getCurrentUser()
    return user ? user.permissions.includes(permission) : false
  }

  static getAllUsers(): User[] {
    return (this.getFromStorage(USERS_KEY, []) as User[]).map((u) => ({
      ...u,
      createdAt: new Date(u.createdAt),
    }))
  }

  static addUser(username: string, password: string, role: UserRole = "user",name:string): User {
    const users = this.getAllUsers()
    const newUser: User = {
      id: `user_${Date.now()}`,
      username,
      password,
      name,
      role,
      permissions: role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS,
      createdAt: new Date(),
      isActive: true,
    }
    users.push(newUser)
    this.setToStorage(USERS_KEY, users)
    return newUser
  }
   static updateUserName(userId: string, newName: string): User | null {
    const users = this.getAllUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) return null;

    users[userIndex].name = newName;
    this.setToStorage(USERS_KEY, users);

    // Also update current user in session if it's the same user
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      const updatedCurrentUser = { ...currentUser, name: newName };
      this.setToStorage(CURRENT_USER_KEY, updatedCurrentUser);
    }

    return users[userIndex];
  }

  static updateUser(userId: string, updates: { name?: string; permissions?: Permission[] }): User | null {
    const users = this.getAllUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) return null;

    if (updates.name !== undefined) {
      users[userIndex].name = updates.name;
    }
    if (updates.permissions !== undefined) {
      users[userIndex].permissions = updates.permissions;
    }

    this.setToStorage(USERS_KEY, users);

    // Update current user session if needed
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      const updatedCurrentUser = { ...currentUser, ...updates };
      this.setToStorage(CURRENT_USER_KEY, updatedCurrentUser);
    }

    return users[userIndex];
  }

  static deleteUser(userId: string): boolean {
    const users = this.getAllUsers()
    const filtered = users.filter((u) => u.id !== userId)
    if (filtered.length === users.length) return false
    this.setToStorage(USERS_KEY, filtered)
    return true
  }

  static updateUserPermissions(userId: string, permissions: Permission[]): User | null {
    const users = this.getAllUsers()
    const userIndex = users.findIndex((u) => u.id === userId)
    if (userIndex === -1) return null
    users[userIndex].permissions = permissions
    this.setToStorage(USERS_KEY, users)
    return users[userIndex]
  }

  static toggleUserStatus(userId: string): User | null {
    const users = this.getAllUsers()
    const userIndex = users.findIndex((u) => u.id === userId)
    if (userIndex === -1) return null
    users[userIndex].isActive = !users[userIndex].isActive
    this.setToStorage(USERS_KEY, users)
    return users[userIndex]
  }
}
