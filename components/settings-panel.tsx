"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { InvoiceStorage } from "@/lib/invoice-storage";
import { UserStorage } from "@/lib/user-storage";
import type { Settings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Download, Upload, Trash2, User, AlertCircle } from "lucide-react";

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

  // Check permissions using existing permission types
  const canExportData = UserStorage.hasPermission("export_data");
  const canDeleteInvoices = UserStorage.hasPermission("delete_invoice");
  const canManageUsers = UserStorage.hasPermission("manage_users");
  
  // For settings management, use manage_users or admin role as fallback
  const canManageSettings = canManageUsers || currentUser?.role === "admin";

  // Update settings when user changes
  useEffect(() => {
    if (currentUser) {
      setSettings(prev => ({
        ...prev,
        username: currentUser.name
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
    if (!canManageSettings) {
      alert("ليس لديك صلاحية تعديل الإعدادات");
      return;
    }

    setIsSaving(true);
    try {
      InvoiceStorage.updateSettings(settings);
      
      if (currentUser && settings.username !== currentUser.name) {
        UserStorage.updateUserName(currentUser.id, settings.username);
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
    if (!canExportData) {
      alert("ليس لديك صلاحية تصدير البيانات");
      return;
    }

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
    if (!canExportData) {
      alert("ليس لديك صلاحية استيراد البيانات");
      return;
    }

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
    if (!canDeleteInvoices) {
      alert("ليس لديك صلاحية حذف الفواتير");
      return;
    }

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

      {/* Permission Warning */}
      {!canManageSettings && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div className="text-right flex-1">
            <p className="font-semibold text-yellow-800">صلاحيات محدودة</p>
            <p className="text-sm text-yellow-600">
              لديك صلاحية مشاهدة الإعدادات فقط. لا يمكنك إجراء تغييرات.
            </p>
          </div>
        </div>
      )}

      {/* Basic Settings */}
      <Card>
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-right">الإعدادات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-right">
              ميزان العبر الافتراضي
            </label>
            <Input
              name="defaultScale"
              value={settings.defaultScale}
              onChange={handleChange}
              className="text-right"
              disabled={!canManageSettings}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-right">
              وحدة الوزن الافتراضية
            </label>
            <select
              name="weightUnit"
              value={settings.weightUnit}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  weightUnit: e.target.value as any,
                }))
              }
              className="w-full border rounded-md p-2 text-right"
              disabled={!canManageSettings}
            >
              <option value="kg">كيلوجرام (KG)</option>
              <option value="ton">طن (TON)</option>
            </select>
          </div>

          {/* Invoice Number Format */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-right">
              صيغة رقم الفاتورة
            </label>
            <select
              name="invoiceNumberFormat"
              value={settings.invoiceNumberFormat}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  invoiceNumberFormat: e.target.value as any,
                }))
              }
              className="w-full border rounded-md p-2 text-right"
              disabled={!canManageSettings}
            >
              <option value="TRX-{number}">TRX-0001</option>
              <option value="INV-{number}">INV-0001</option>
              <option value="FY-{year}-{number}">FY-2025-0001</option>
              <option value="{day}{month}{year}-{number}">010125-0001</option>
            </select>
          </div>

          {/* Export & Import */}
          <div className="flex gap-3 justify-between mt-4">
            <Button 
              onClick={handleExport} 
              className="gap-2"
              disabled={!canExportData}
            >
              <Download className="h-4 w-4" /> 
              {canExportData ? "تصدير البيانات" : "غير مسموح"}
            </Button>

            <label className={`cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md ${
              canExportData 
                ? "bg-secondary cursor-pointer" 
                : "bg-gray-100 cursor-not-allowed opacity-50"
            }`}>
              <Upload className="h-4 w-4" />
              {canExportData ? "استيراد البيانات" : "غير مسموح"}
              {canExportData && (
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImport}
                  className="hidden"
                />
              )}
            </label>
          </div>

          {/* Delete All */}
          <Button
            variant="destructive"
            onClick={handleDeleteAll}
            className="gap-2 text-white"
            disabled={!canDeleteInvoices}
          >
            <Trash2 className="h-4 w-4" /> 
            {canDeleteInvoices ? "حذف جميع الفواتير" : "غير مسموح"}
          </Button>

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

      {/* Save Button - Only show if user can manage settings */}
      {canManageSettings && (
        <div className="flex gap-3 justify-start">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      )}
    </div>
  );
}