"use client"

import { useState, useEffect } from "react"
import { UserStorage } from "@/lib/user-storage"
import type { User, Permission } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, Shield } from "lucide-react"

interface UserManagementProps {
  onClose: () => void
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
]

export function UserManagement({ onClose }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
    const [newName, setName] = useState("")

  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([])

  useEffect(() => {
    setUsers(UserStorage.getAllUsers())
  }, [])

  const handleAddUser = () => {
    if (newUsername.trim() && newPassword.trim()) {
      UserStorage.addUser(newUsername, newPassword, "user",newName)
      setUsers(UserStorage.getAllUsers())
      setNewUsername("")
      setName("")
      setNewPassword("")
    }
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      UserStorage.deleteUser(userId)
      setUsers(UserStorage.getAllUsers())
    }
  }

  const handleSavePermissions = () => {
    if (selectedUser) {
      UserStorage.updateUserPermissions(selectedUser.id, selectedPermissions)
      setUsers(UserStorage.getAllUsers())
      setSelectedUser(null)
    }
  }

  const handleTogglePermission = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">إدارة المستخدمين والصلاحيات</h2>
      </div>

      {/* Add New User */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-right text-lg">إضافة مستخدم جديد</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
              <label className="block text-sm font-semibold mb-2 text-right">الاسم  </label>
              <Input
                value={newName}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">اسم المستخدم</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">كلمة المرور</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="text-right"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddUser} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                إضافة
              </Button>
            </div>
          </div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className={!user.isActive ? "opacity-50" : ""}>
                  <TableCell className="text-right flex gap-2 justify-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setSelectedPermissions(user.permissions)
                          }}
                        >
                          تعديل
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-right">تعديل صلاحيات: {selectedUser?.username}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {ALL_PERMISSIONS.map((perm) => (
                            <div key={perm.value} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                              <Checkbox
                                checked={selectedPermissions.includes(perm.value)}
                                onCheckedChange={() => handleTogglePermission(perm.value)}
                                id={perm.value}
                              />
                              <label htmlFor={perm.value} className="text-sm cursor-pointer flex-1 text-right">
                                {perm.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <Button onClick={handleSavePermissions} className="w-full mt-4">
                          حفظ التغييرات
                        </Button>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right text-sm">{user.permissions.length} صلاحيات</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`px-2 py-1 rounded text-sm ${user.role === "admin" ? "bg-primary/20" : "bg-secondary/20"}`}
                    >
                      {user.role === "admin" ? "مسؤول" : "مستخدم"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{user.username}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
        إغلاق
      </Button>
    </div>
  )
}
