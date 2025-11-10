"use client";

import { useState, useEffect, useCallback } from "react";
import { HybridStorage } from "@/lib/hybrid-storage"; // Use HybridStorage
import type { User, Permission, UserFormData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { v4 as uuidv4 } from "uuid";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Shield, ArrowRight, Lock, Loader2 } from "lucide-react";
import { AdminFields } from "./admin-fields";

interface UserManagementProps {
  onClose: () => void;
}

const ALL_PERMISSIONS: { value: Permission; label: string }[] = [
  { value: "view_invoices", label: "عرض الفواتير" },
  { value: "create_invoice", label: "إنشاء فاتورة" },
  { value: "edit_invoice", label: "تعديل الفاتورة" },
  { value: "delete_invoice", label: "حذف الفاتورة" },
  { value: "print_invoice", label: "طباعة الفاتورة" },
  { value: "download_invoice", label: "تحميل الفاتورة" },
  { value: "export_data", label: "تصدير البيانات" },
  { value: "manage_users", label: "إدارة المستخدمين" },
  { value: "manage_permissions", label: "إدارة الصلاحيات" },
];

export function UserManagement({ onClose }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [newName, setName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(
    []
  );
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const currentUser = HybridStorage.getCurrentUser();
  const canManageUsers =
    currentUser?.permissions.includes("manage_users") ?? false;

  const fetchUsers = useCallback(async () => {
    if (canManageUsers) {
      const allUsers = await HybridStorage.getAllUsers();
      setUsers(allUsers);
    }
  }, [canManageUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // If user doesn't have permission, show access denied message
  if (!canManageUsers) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowRight className="h-4 w-4" />
            <h2 className="font-bold">رجوع</h2>
          </Button>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Lock className="h-16 w-16 text-red-500" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-red-600">وصول مرفوض</h3>
                <p className="text-muted-foreground">
                  ليس لديك صلاحية الوصول إلى إدارة المستخدمين
                </p>
                <p className="text-sm text-muted-foreground">
                  يلزم الحصول على صلاحية "إدارة المستخدمين" لعرض هذه الصفحة
                </p>
              </div>
              <Button onClick={onClose} variant="outline">
                العودة إلى لوحة التحكم
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddUser = async () => {
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      alert("يرجى ملء جميع الحقول: الاسم المعروض، اسم المستخدم، وكلمة المرور.");
      return;
    }

    setIsAddingUser(true);
    try {
      const userData: UserFormData = {
        name: newName,
        username: newUsername,
        password: newPassword,
      };
      await HybridStorage.addUser(userData);
      await fetchUsers(); // Refresh list
      setNewUsername("");
      setName("");
      setNewPassword("");
    } catch (error) {
      console.error("خطأ في إضافة المستخدم:", error);
      alert("حدث خطأ أثناء إضافة المستخدم.");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Prevent users from deleting themselves
    if (currentUser && currentUser.id === userId) {
      alert("لا يمكنك حذف حسابك الخاص");
      return;
    }

    // Prevent non-admin users from deleting admin users
    const userToDelete = users.find((u) => u.id === userId);
    if (userToDelete?.role === "admin" && currentUser?.role !== "admin") {
      alert("لا يمكنك حذف مستخدم مسؤول");
      return;
    }

    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      try {
        await HybridStorage.deleteUser(userId);
        await fetchUsers(); // Refresh list
      } catch (error) {
        console.error("خطأ في حذف المستخدم:", error);
        alert("حدث خطأ أثناء حذف المستخدم.");
      }
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    // Prevent non-admin users from modifying admin permissions
    if (selectedUser.role === "admin" && currentUser?.role !== "admin") {
      alert("لا يمكنك تعديل صلاحيات مستخدم مسؤول");
      return;
    }

    setIsUpdatingPermissions(true);

    try {
      await HybridStorage.updateUserPermissions(
        selectedUser.id,
        selectedPermissions
      );
      await fetchUsers(); // Refresh list

      // Close dialog and reset states
      setIsDialogOpen(false);
      setSelectedUser(null);
      setSelectedPermissions([]);
    } catch (error) {
      console.error("Failed to update permissions:", error);
      alert("حدث خطأ أثناء حفظ الصلاحيات");
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  const handleTogglePermission = (permission: Permission) => {
    if (isUpdatingPermissions) return;

    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleOpenDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!isUpdatingPermissions) {
      setIsDialogOpen(false);
      setSelectedUser(null);
      setSelectedPermissions([]);
    }
  };

  // Filter out current user from the list to prevent self-deletion
  const displayUsers = users.filter((user) => user.id !== currentUser?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowRight className="h-4 w-4" />
          <h2 className="font-bold">رجوع</h2>
        </Button>
      </div>
      {currentUser?.role === "admin" && (
        <AdminFields currentUser={currentUser} />
      )}
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">إدارة المستخدمين والصلاحيات</h2>
      </div>

      {/* Add New User */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-right text-lg">
            إضافة مستخدم جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">
                الاسم المعروض
              </label>
              <Input
                value={newName}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الذي يظهر في الفواتير"
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">
                اسم المستخدم
              </label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="للتسجيل والدخول فقط"
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">
                كلمة المرور
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="كلمة المرور للتسجيل"
                className="text-right"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddUser}
                className="w-full gap-2"
                disabled={isAddingUser}
              >
                {isAddingUser ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    إضافة
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-right">
            ⓘ الاسم المعروض: يظهر في الفواتير والمستندات | اسم المستخدم: للتسجيل
            والدخول فقط
          </p>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-right text-lg">قائمة المستخدمين</CardTitle>
        </CardHeader>
        <CardContent className="p-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الإجراءات</TableHead>
                <TableHead className="text-right">الصلاحيات</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-right">اسم المستخدم</TableHead>
                <TableHead className="text-right">الاسم المعروض</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className={!user.isActive ? "opacity-50" : ""}
                >
                  <TableCell className="text-right flex gap-2 justify-end">
                    <Dialog
                      open={isDialogOpen && selectedUser?.id === user.id}
                      onOpenChange={handleCloseDialog}
                    >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(user)}
                          disabled={
                            user.role === "admin" &&
                            currentUser?.role !== "admin"
                          }
                        >
                          تعديل
                        </Button>
                    
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-right">
                            تعديل صلاحيات: {selectedUser?.username}
                          </DialogTitle>
                        </DialogHeader>

                        {/* Loading Overlay */}
                        {isUpdatingPermissions && (
                          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                            <div className="text-center">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                              <p className="text-sm text-muted-foreground">
                                جاري تحديث الصلاحيات...
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {ALL_PERMISSIONS.map((perm) => (
                            <div
                              key={perm.value}
                              className={`flex items-center gap-3 p-2 rounded ${
                                isUpdatingPermissions
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:bg-muted cursor-pointer"
                              }`}
                            >
                              <Checkbox
                                checked={selectedPermissions.includes(
                                  perm.value
                                )}
                                onCheckedChange={() =>
                                  handleTogglePermission(perm.value)
                                }
                                id={perm.value}
                                disabled={
                                  isUpdatingPermissions ||
                                  (selectedUser?.role === "admin" &&
                                    currentUser?.role !== "admin")
                                }
                              />
                              <label
                                htmlFor={perm.value}
                                className={`text-sm flex-1 text-right ${
                                  isUpdatingPermissions
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                              >
                                {perm.label}
                              </label>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={handleSavePermissions}
                            className="flex-1 gap-2"
                            disabled={
                              isUpdatingPermissions ||
                              (selectedUser?.role === "admin" &&
                                currentUser?.role !== "admin")
                            }
                          >
                            {isUpdatingPermissions ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                جاري الحفظ...
                              </>
                            ) : (
                              "حفظ التغييرات"
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={handleCloseDialog}
                            disabled={isUpdatingPermissions}
                          >
                            إلغاء
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={
                        user.role === "admin" && currentUser?.role !== "admin"
                      }
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {user.permissions.length} صلاحيات
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        user.role === "admin"
                          ? "bg-primary/20"
                          : "bg-secondary/20"
                      }`}
                    >
                      {user.role === "admin" ? "مسؤول" : "مستخدم"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {user.username}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {user.name}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
