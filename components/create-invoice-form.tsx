"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { InvoiceStorage } from "@/lib/invoice-storage";
import { UserStorage } from "@/lib/user-storage";
import type { Invoice, InvoiceFormData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Calculator, Lock } from "lucide-react";

interface CreateInvoiceFormProps {
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
  initialData?: Invoice;
}

export function CreateInvoiceForm({
  onSave,
  onCancel,
  initialData,
}: CreateInvoiceFormProps) {
  const settings = InvoiceStorage.getSettings();
  const now = new Date();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user has permission to create invoices
  const canCreateInvoice = UserStorage.hasPermission("create_invoice");
  const currentUser = UserStorage.getCurrentUser();

  const [formData, setFormData] = useState<Partial<InvoiceFormData>>({
    driverName: "",
    vehicleType: "",
    vehicleNumber: "",
    allowedLoadWeightUnit: settings.weightUnit,
    allowedWeightTotal: 0,
    axles: "",
    allowedLoadWeight: 0,
    fee: 0,
    penalty: 0,
    emptyWeight: 0,
    discount: 0,
    overweight: 0,
    type: "",
    routeOrRegion: "",
    payableAmount: 0,
    netAmount: 0,
    note: "",
    scaleName: settings.defaultScale,
    invoiceNumber: InvoiceStorage.generateInvoiceNumber(),
    createdAt: now,
    ...initialData,
  });

  // If user doesn't have permission, show access denied message
  if (!canCreateInvoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">إنشاء فاتورة جديدة</h2>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Lock className="h-16 w-16 text-red-500" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-red-600">وصول مرفوض</h3>
                <p className="text-muted-foreground">
                  ليس لديك صلاحية إنشاء فواتير جديدة
                </p>
                <p className="text-sm text-muted-foreground">
                  يلزم الحصول على صلاحية "إنشاء فاتورة" لإضافة فواتير جديدة
                </p>
              </div>
              <Button onClick={onCancel} variant="outline">
                العودة إلى لوحة التحكم
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auto-calculate amounts when fee, penalty, or discount changes
  useEffect(() => {
    const fee = Number(formData.fee) || 0;
    const penalty = Number(formData.penalty) || 0;
    const discount = Number(formData.discount) || 0;

    // Calculate payable amount (fee + penalty)
    const payableAmount = fee + penalty;

    // Calculate net amount (payable amount - discount)
    const netAmount = Math.max(0, payableAmount - discount);

    setFormData((prev) => ({
      ...prev,
      payableAmount,
      netAmount,
    }));
  }, [formData.fee, formData.penalty, formData.discount]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double check permission before submitting
    if (!UserStorage.hasPermission("create_invoice")) {
      alert("ليس لديك صلاحية إنشاء فواتير");
      return;
    }

    setIsSubmitting(true);

    try {
      const invoice = InvoiceStorage.saveInvoice(formData as InvoiceFormData);
      onSave(invoice);
    } catch (error) {
      console.error("خطأ في حفظ الفاتورة:", error);
      alert("حدث خطأ أثناء حفظ الفاتورة");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-YE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">إنشاء فاتورة جديدة</h2>
      </div>

      {/* User Info Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="font-semibold text-blue-800">{currentUser?.name}</p>
            <p className="text-sm text-blue-600">مسموح لك بإنشاء فواتير جديدة</p>
          </div>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            ✓ مسموح
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Info */}
        <Card>
          <CardHeader className="bg-primary/10">
            <CardTitle className="text-right">
              معلومات الفاتورة الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  رقم السند
                </label>
                <Input
                  name="invoiceNumber"
                  value={formData.invoiceNumber || ""}
                  disabled
                  className="text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  ميزان العبر
                </label>
                <Input
                  name="scaleName"
                  value={formData.scaleName || ""}
                  onChange={handleChange}
                  className="text-right"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  اسم السائق
                </label>
                <Input
                  name="driverName"
                  value={formData.driverName || ""}
                  onChange={handleChange}
                  className="text-right"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  التاريخ والوقت
                </label>
                <Input
                  name="createdAt"
                  type="datetime-local"
                  value={
                    formData.createdAt
                      ? new Date(formData.createdAt).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      createdAt: new Date(e.target.value),
                    }))
                  }
                  className="text-right"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <CardHeader className="bg-primary/10">
            <CardTitle className="text-right">معلومات المركبة</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  نوع المركبة
                </label>
                <Input
                  name="vehicleType"
                  value={formData.vehicleType || ""}
                  onChange={handleChange}
                  className="text-right"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  رقم المركبة
                </label>
                <Input
                  name="vehicleNumber"
                  value={formData.vehicleNumber || ""}
                  onChange={handleChange}
                  className="text-right"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الوزن المسموح به كاملاً
                </label>
                <Input
                  name="allowedWeightTotal"
                  type="number"
                  value={formData.allowedWeightTotal || 0}
                  onChange={handleChange}
                  className="text-right"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  عدد المحاور
                </label>
                <Input
                  name="axles"
                  type="number"
                  value={formData.axles || ""}
                  onChange={handleChange}
                  className="text-right"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weight Info */}
        <Card>
          <CardHeader className="bg-primary/10">
            <CardTitle className="text-right">معلومات الأوزان</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  وزن الحمولة المسموح به
                </label>
                <div className="flex gap-2">
                  <Input
                    name="allowedLoadWeight"
                    type="number"
                    value={formData.allowedLoadWeight || 0}
                    onChange={handleChange}
                    className="text-right"
                    required
                  />
                  <select
                    name="allowedLoadWeightUnit"
                    value={formData.allowedLoadWeightUnit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        allowedLoadWeightUnit: e.target.value as any,
                      }))
                    }
                    className="border rounded-md px-2"
                  >
                    <option value="kg">كيلوجرام (KG)</option>
                    <option value="ton">طن (TON)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الوزن الفارغ
                </label>
                <Input
                  name="emptyWeight"
                  type="number"
                  value={formData.emptyWeight || 0}
                  onChange={handleChange}
                  className="text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الوزن الزائد
                </label>
                <Input
                  name="overweight"
                  type="number"
                  value={formData.overweight || 0}
                  onChange={handleChange}
                  className="text-right"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Info */}
        <Card>
          <CardHeader className="bg-primary/10">
            <CardTitle className="text-right flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              المعلومات المالية (حساب تلقائي)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الرسوم
                </label>
                <Input
                  name="fee"
                  type="number"
                  value={formData.fee || 0}
                  onChange={handleChange}
                  className="text-right"
                  placeholder="أدخل قيمة الرسوم"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الغرامة
                </label>
                <Input
                  name="penalty"
                  type="number"
                  value={formData.penalty || 0}
                  onChange={handleChange}
                  className="text-right"
                  placeholder="أدخل قيمة الغرامة"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الخصم
                </label>
                <Input
                  name="discount"
                  type="number"
                  value={formData.discount || 0}
                  onChange={handleChange}
                  className="text-right"
                  placeholder="أدخل قيمة الخصم"
                />
              </div>

              {/* Calculation Summary */}
              <div className="md:col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold">الرسوم:</span>
                    <span className="font-mono">
                      {formatCurrency(formData.fee || 0)} ريال
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold">الغرامة:</span>
                    <span className="font-mono">
                      {formatCurrency(formData.penalty || 0)} ريال
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="font-semibold">المبلغ المستحق:</span>
                    <span className="font-mono text-blue-600 font-bold">
                      {formatCurrency(
                        (formData.fee || 0) + (formData.penalty || 0)
                      )}{" "}
                      ريال
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold">الخصم:</span>
                    <span className="font-mono text-red-600">
                      - {formatCurrency(formData.discount || 0)} ريال
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                    <span>المبلغ الصافي:</span>
                    <span className="text-green-600 font-mono">
                      {formatCurrency(formData.netAmount || 0)} ريال
                    </span>
                  </div>
                </div>
              </div>

              {/* Hidden fields for form submission */}
              <input
                type="hidden"
                name="payableAmount"
                value={formData.payableAmount || 0}
              />
              <input
                type="hidden"
                name="netAmount"
                value={formData.netAmount || 0}
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader className="bg-primary/10">
            <CardTitle className="text-right">معلومات إضافية</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">
                النوع
              </label>
              <Input
                name="type"
                value={formData.type || ""}
                onChange={handleChange}
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">
                القارة (خط السير)
              </label>
              <Input
                name="routeOrRegion"
                value={formData.routeOrRegion || ""}
                onChange={handleChange}
                className="text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-right">
                ملاحظة
              </label>
              <textarea
                name="note"
                value={formData.note || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md text-right resize-none h-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-3 justify-start">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? "جاري الحفظ..." : "حفظ الفاتورة"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            إلغاء
          </Button>
        </div>
      </form>
    </div>
  );
}