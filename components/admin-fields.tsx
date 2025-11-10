"use client";

import { useState } from "react";
import { HybridStorage } from "@/lib/hybrid-storage";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, UserCog, CheckCircle, XCircle } from "lucide-react";

interface AdminFieldsProps {
  currentUser: User;
}

export function AdminFields({ currentUser }: AdminFieldsProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newName, setNewName] = useState(currentUser.name);
  const [newUsername, setNewUsername] = useState(currentUser.username);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

 const handleUpdateCredentials = async () => {
  if (!currentPassword) {
    setMessage({ type: "error", text: "يجب إدخال كلمة المرور الحالية للمتابعة" });
    return;
  }

  if (!newName.trim() || !newUsername.trim()) {
    setMessage({ type: "error", text: "يجب ملء جميع الحقول الإلزامية" });
    return;
  }

  if (newPassword && newPassword !== confirmPassword) {
    setMessage({ type: "error", text: "كلمات المرور الجديدة غير متطابقة" });
    return;
  }

  if (newPassword && newPassword.length < 6) {
    setMessage({ type: "error", text: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
    return;
  }

  setIsUpdating(true);
  setMessage(null);

  try {
    // Verify current password first
    console.log("Verifying current password...");
    const isValid = await verifyCurrentPassword(currentPassword);
    
    if (!isValid) {
      setMessage({ type: "error", text: "كلمة المرور الحالية غير صحيحة" });
      setIsUpdating(false);
      return;
    }

    console.log("Current password verified, preparing update...");

    // Prepare update data - send plain text password to let server hash it
    const updateData: any = {
      name: newName,
      username: newUsername,
    };

    // Only include password if changed (send as plain text - server will hash it)
    if (newPassword) {
      updateData.password = newPassword;
      console.log("Including new password in update");
    }

    console.log("Sending update to server...", { 
      name: newName, 
      username: newUsername, 
      hasNewPassword: !!newPassword 
    });

    // Update user credentials
    const updatedUser = await HybridStorage.updateUser(currentUser.id, updateData);

    if (updatedUser) {
      setMessage({ 
        type: "success", 
        text: "تم تحديث بيانات الاعتماد بنجاح" 
      });

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

    } else {
      throw new Error("Failed to update user");
    }

  } catch (error: any) {
    console.error("Error updating admin credentials:", error);
    setMessage({ 
      type: "error", 
      text: error.message || "حدث خطأ أثناء تحديث البيانات" 
    });
  } finally {
    setIsUpdating(false);
  }
};

  const verifyCurrentPassword = async (password: string): Promise<boolean> => {
    try {
      // Try online verification first
      if (HybridStorage.isOnline) {
        const response = await fetch("/api/auth/verify-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: currentUser.id, 
            password: currentPassword 
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return result.valid;
        }
      }

      // Fallback to offline verification
      const allUsers = await HybridStorage.getAllUsers();
      const currentUserFromDB = allUsers.find(u => u.id === currentUser.id);
      
      if (currentUserFromDB) {
        // Use bcrypt to compare passwords
        const bcrypt = await import("bcryptjs");
        return bcrypt.compareSync(password, currentUserFromDB.password);
      }

      return false;
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  };

  const resetForm = () => {
    setNewName(currentUser.name);
    setNewUsername(currentUser.username);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
  };

  const hasChanges = 
    newName !== currentUser.name || 
    newUsername !== currentUser.username || 
    newPassword.length > 0;

  return (
    <Card>
      <CardHeader className="bg-primary/10">
        <CardTitle className="text-right text-lg flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          تحديث بيانات المسؤول
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === "success" 
              ? "bg-green-50 text-green-800 border border-green-200" 
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Name */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-right">
              الاسم الحالي
            </label>
            <Input
              value={currentUser.name}
              disabled
              className="text-right bg-gray-50"
            />
          </div>

          {/* Current Username */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-right">
              اسم المستخدم الحالي
            </label>
            <Input
              value={currentUser.username}
              disabled
              className="text-right bg-gray-50"
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h4 className="text-right font-semibold text-primary">
            تحديث البيانات
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New Name */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">
                الاسم الجديد <span className="text-red-500">*</span>
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="أدخل الاسم الجديد"
                className="text-right"
              />
            </div>

            {/* New Username */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">
                اسم المستخدم الجديد <span className="text-red-500">*</span>
              </label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم الجديد"
                className="text-right"
              />
            </div>
          </div>

          {/* Current Password Verification */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-right">
              كلمة المرور الحالية <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية للموافقة"
                className="text-right pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة (اختياري)"
                  className="text-right pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-right">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تأكيد كلمة المرور الجديدة"
                  className="text-right pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Password Match Indicator */}
          {newPassword && confirmPassword && (
            <div className={`text-sm text-right ${
              newPassword === confirmPassword ? "text-green-600" : "text-red-600"
            }`}>
              {newPassword === confirmPassword ? "✓ كلمات المرور متطابقة" : "✗ كلمات المرور غير متطابقة"}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={isUpdating || !hasChanges}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleUpdateCredentials}
              disabled={isUpdating || !hasChanges || !currentPassword}
              className="gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                "تحديث البيانات"
              )}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground text-right space-y-1">
          <p>• كلمة المرور الحالية مطلوبة للموافقة على أي تغييرات</p>
          <p>• كلمة المرور الجديدة اختيارية - اتركها فارغة للحفاظ على كلمة المرور الحالية</p>
          <p>• سيتم تسجيل خروجك تلقائياً بعد تغيير اسم المستخدم أو كلمة المرور</p>
        </div>
      </CardContent>
    </Card>
  );
}