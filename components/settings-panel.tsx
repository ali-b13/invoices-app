"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { InvoiceStorage } from "@/lib/invoice-storage";
import { UserStorage } from "@/lib/user-storage"; // Import UserStorage
import type { Settings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Download, Upload, Trash2, User } from "lucide-react";

interface SettingsPanelProps {
  onSave: () => void;
  onClose: () => void;
}

export function SettingsPanel({ onSave, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>(
    InvoiceStorage.getSettings()
  );
  const [currentUser, setCurrentUser] = useState(UserStorage.getCurrentUser());
  const [isSaving, setIsSaving] = useState(false);
  // Update settings when user changes
  useEffect(() => {
    if (currentUser) {
      setSettings(prev => ({
        ...prev,
        username: currentUser.name // Use display name from UserStorage
      }));
    }
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      InvoiceStorage.updateSettings(settings);
      
      // Also update the current user's display name if it was changed
      if (currentUser && settings.username !== currentUser.name) {
        // You'll need to add this method to UserStorage
        UserStorage.updateUserName(currentUser.id, settings.username);
        // Refresh current user data
        const updatedUser = UserStorage.getCurrentUser();
        setCurrentUser(updatedUser);
      }
      
      onSave();
    } catch (error) {
      console.error("خطأ في حفظ الإعدادات:", error);
      alert("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsSaving(false);
    }
  };
  const handleExport = () => {
    const data = InvoiceStorage.exportAsJSON();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (InvoiceStorage.importFromJSON(content)) {
        alert("تم استيراد البيانات بنجاح");
        window.location.reload();
      } else {
        alert("فشل في استيراد البيانات. تأكد من صيغة الملف");
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteAll = () => {
    if (
      confirm(
        "هل أنت متأكد من حذف جميع الفواتير؟ هذا الإجراء لا يمكن التراجع عنه."
      )
    ) {
      InvoiceStorage.deleteAllInvoices();
      alert("تم حذف جميع الفواتير");
      window.location.reload();
    }
  };

  return (
   <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">الإعدادات</h2>
      </div>

      {/* Basic Settings */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-right">الإعدادات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Remove the username input from here */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-right">
              ميزان العبر الافتراضي
            </label>
            <Input
              name="defaultScale"
              value={settings.defaultScale}
              onChange={handleChange}
              className="text-right"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-right">
              صيغة رقم الفاتورة
            </label>
            <Input
              name="invoiceNumberFormat"
              value={settings.invoiceNumberFormat}
              onChange={handleChange}
              className="text-right"
              disabled
            />
          </div>
          
          {/* Display current user info */}
          {currentUser && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-blue-600" />
                <div className="text-right flex-1">
                  <p className="font-semibold text-blue-800">{currentUser.name}</p>
                  <p className="text-sm text-blue-600">اسم المستخدم الحالي</p>
                  <p className="text-xs text-blue-500 mt-1">
                    لتغيير الاسم، الرجاء استخدام صفحة إدارة المستخدمين
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-3 justify-start">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
        <Button variant="outline" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}
