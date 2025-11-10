import { connectDB } from "./mongodb";
import { User } from "./models/User";
import { PasswordUtils } from "./password-utils";

const ADMIN_ID = "admin-user";

export async function initializeAdminUser() {
  try {
    await connectDB();

    // Check if admin user exists by ID
    const existingAdmin = await User.findById(ADMIN_ID);
    
    if (!existingAdmin) {
      console.log("Creating admin user...");
      const hashedPassword = PasswordUtils.hashPasswordSync("admin123");
      
      await User.create({
        _id: ADMIN_ID,
        username: "admin",
        name: "System Administrator",
        password: hashedPassword,
        role: "admin" as const,
        permissions: [
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
        isActive: true,
        createdAt: new Date(),
        lastModified: new Date(),
        lastModifiedDevice: "system",
        synced: true,
        pendingSync: false,
      });

      console.log("Admin user created successfully");
      console.log("Admin password hash:", hashedPassword.substring(0, 20) + "...");
    } else {
      console.log("Admin user already exists");
      console.log("Admin password hash:", existingAdmin.password.substring(0, 20) + "...");
    }
  } catch (error) {
    console.error("Error initializing admin user:", error);
  }
}