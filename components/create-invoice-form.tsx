"use client"
import { v4 as uuidv4 } from "uuid"
import type React from "react"
import { useState, useEffect } from "react"
import { HybridStorage } from "@/lib/hybrid-storage"
import type { Invoice, InvoiceFormData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Save, Lock } from "lucide-react"

interface CreateInvoiceFormProps {
  onSave: (invoice: Invoice) => void
  onCancel: () => void
  initialData?: Invoice | null
}

export function CreateInvoiceForm({ onSave, onCancel, initialData }: CreateInvoiceFormProps) {
  const [settings, setSettings] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Function to fetch settings
  const fetchSettings = async () => {
    const settingsData = await HybridStorage.getSettings()
    setSettings(settingsData)
  }

  // Function to generate invoice number based on settings format
  const generateInvoiceNumber = () => {
    if (!settings?.invoiceNumberFormat) {
      return `INV-${Date.now()}`
    }

    const format = settings.invoiceNumberFormat
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

    let invoiceNumber = format
      .replace(/{number}/g, randomNum)
      .replace(/{year}/g, year.toString())
      .replace(/{month}/g, month)
      .replace(/{day}/g, day)

    return invoiceNumber
  }

  // Function to format date in م 10:30:14 2-11-2025 format
  const formatDateTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const period = hours < 12 ? 'ص' : 'م';
    const formattedHours = hours % 12 || 12;
    
    return `${period} ${formattedHours}:${minutes}:${seconds} ${day}-${month}-${year}`;
  }

  // Function to parse the custom date format back to Date object
  const parseDateTime = (dateString: string): Date => {
    const now = new Date();
    
    if (!dateString) return now;
    
    try {
      const parts = dateString.split(' ');
      if (parts.length < 3) return now;
      
      const period = parts[0]; // ص or م
      const time = parts[1]; // HH:MM:SS
      const date = parts[2]; // D-M-YYYY
      
      const [hours, minutes, seconds] = time.split(':').map(Number);
      const [day, month, year] = date.split('-').map(Number);
      
      let hour24 = hours;
      if (period === 'م' && hours < 12) {
        hour24 = hours + 12;
      } else if (period === 'ص' && hours === 12) {
        hour24 = 0;
      }
      
      return new Date(year, month - 1, day, hour24, minutes, seconds);
    } catch (error) {
      console.error('Error parsing date:', error);
      return now;
    }
  }

  // Check if user has permission to create invoices
  const currentUser = HybridStorage.getCurrentUser()
  const canCreateInvoice = currentUser?.permissions.includes("create_invoice") ?? false
  const collectorName = "خالد صالح الديني"

  const [formData, setFormData] = useState<Partial<InvoiceFormData>>({
    id: uuidv4(),
    driverName: "",
    vehicleType: "",
    vehicleNumber: "",
    allowedWeightTotal: "0",
    axles: "",
    allowedLoadWeight: "0",
    fee: 0,
    penalty: 0,
    emptyWeight: "0",
    discount: 0,
    overweight: "0",
    type: "",
    payableAmount: 0,
    netAmount: 0,
    note: "",
    scaleName: "Default Scale",
    invoiceNumber: "",
    createdAt: new Date(),
    ...initialData,
  })

  // Convert initial data if provided
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        allowedWeightTotal: initialData.allowedWeightTotal?.toString() || "0",
        allowedLoadWeight: initialData.allowedLoadWeight?.toString() || "0",
        emptyWeight: initialData.emptyWeight?.toString() || "0",
        overweight: initialData.overweight?.toString() || "0",
        axles: initialData.axles?.toString() || "",
      }))
    }
  }, [initialData])

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (settings) {
      const newInvoiceNumber = generateInvoiceNumber()
      setFormData((prev) => ({
        ...prev,
        scaleName: settings.defaultScale,
        invoiceNumber: initialData?.invoiceNumber || newInvoiceNumber,
      }))
    }
  }, [settings])

  const penaltyText = `غرامة (10000) ريال على كل طن زائد فوق الوزن المسموح به قابل للمضاعفة في حالة تجاوز الوزن الزائد 30% من وزن الحمولة المسموح به وفقاً للمركبة أو السائق أو السائق والمركبة معاً`

  // Auto-calculate amounts when fee, penalty, or discount changes
  useEffect(() => {
    const fee = Number(formData.fee) || 0
    const penalty = Number(formData.penalty) || 0
    const discount = Number(formData.discount) || 0

    // Calculate payable amount (fee + penalty)
    const payableAmount = fee + penalty

    // Calculate net amount (payable amount - discount)
    const netAmount = Math.max(0, payableAmount - discount)

    setFormData((prev) => ({
      ...prev,
      payableAmount,
      netAmount,
    }))
  }, [formData.fee, formData.penalty, formData.discount])

  // If user doesn't have permission, show access denied message
  if (!canCreateInvoice) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">إنشاء فاتورة جديدة</h2>
        </div>

        <Card>
          <div className="p-4 md:p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-3 md:space-y-4">
              <Lock className="h-12 w-12 md:h-16 md:w-16 text-red-500" />
              <div className="space-y-1 md:space-y-2">
                <h3 className="text-lg md:text-xl font-bold text-red-600">وصول مرفوض</h3>
                <p className="text-sm md:text-base text-muted-foreground">ليس لديك صلاحية إنشاء فواتير جديدة</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  يلزم الحصول على صلاحية "إنشاء فاتورة" لإضافة فواتير جديدة
                </p>
              </div>
              <Button onClick={onCancel} variant="outline" className="text-sm">
                العودة إلى لوحة التحكم
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    // For text inputs, keep as string
    if (type === "text") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    } else if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: Number(value) || 0,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = parseDateTime(e.target.value);
    setFormData((prev) => ({
      ...prev,
      createdAt: dateValue,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Double check permission before submitting
    if (!canCreateInvoice) {
      alert("ليس لديك صلاحية إنشاء فواتير")
      return
    }

    setIsSubmitting(true)

    try {
      // Convert string weights to numbers for storage
      const submissionData = {
        ...formData,
        allowedWeightTotal: formData.allowedWeightTotal || "0",
        allowedLoadWeight:formData.allowedLoadWeight || "0",
        emptyWeight: formData.emptyWeight || "0",
        overweight: formData.overweight || "0",
        axles: formData.axles || "0",
      }

      const invoice = await HybridStorage.saveInvoice(submissionData as InvoiceFormData)
      onSave(invoice)
    } catch (error) {
      console.error("خطأ في حفظ الفاتورة:", error)
      alert("حدث خطأ أثناء حفظ الفاتورة")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl md:text-2xl font-bold">إنشاء فاتورة جديدة</h2>
      </div>

      {/* User Info Banner */}
      <div className="p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="font-semibold text-blue-800 text-sm md:text-base">{currentUser?.name}</p>
            <p className="text-xs md:text-sm text-blue-600">مسموح لك بإنشاء فواتير جديدة</p>
          </div>
          <div className="bg-green-100 text-green-800 px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium">✓ مسموح</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <Card className="p-4 md:p-8 bg-white text-blue-900 font-extrabold">
          <div className="space-y-3 md:space-y-4">
            <div className="text-center">
              <h1 className="text-sm md:text-lg font-bold mb-1">الجمهورية اليمنية - مكتب النقل وادي حضرموت</h1>
              <p className="text-xs md:text-base font-bold">ميزان العبر</p>
            </div>

            {/* Mobile Responsive Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-xs md:text-sm min-w-[600px]">
                <tbody>
                  <tr>
                    <td className="border border-black p-1 md:p-2 font-bold text-right w-1/4">رقم السند</td>
                    <td className="border border-black p-1 md:p-2 text-center w-1/4">
                      <input
                        name="invoiceNumber"
                        value={formData.invoiceNumber || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            invoiceNumber: e.target.value,
                          }))
                        }
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        readOnly
                      />
                    </td>
                    <td className="border border-black p-1 md:p-2 font-bold text-right w-1/4">التاريخ والوقت</td>
                    <td className="border border-black p-1 md:p-2 text-center w-1/4">
                      <input
                        name="createdAt"
                        type="text"
                        value={formData.createdAt ? formatDateTime(new Date(formData.createdAt)) : formatDateTime(new Date())}
                        onChange={handleDateTimeChange}
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        placeholder="م 10:30:14 2-11-2025"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">اسم السائق</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <input
                        name="driverName"
                        value={formData.driverName || ""}
                        onChange={handleChange}
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        required
                        placeholder="أدخل اسم السائق"
                      />
                    </td>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">رقم المركبة</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <input
                        name="vehicleNumber"
                        value={formData.vehicleNumber || ""}
                        onChange={handleChange}
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        required
                        placeholder="أدخل رقم المركبة"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">نوع المركبة</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <input
                        name="vehicleType"
                        value={formData.vehicleType || ""}
                        onChange={handleChange}
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        required
                        placeholder="أدخل نوع المركبة"
                      />
                    </td>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">عدد المحاور</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <input
                        name="axles"
                        type="text"
                        value={formData.axles || ""}
                        onChange={handleChange}
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        required
                        placeholder="0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">الوزن المسموح به كاملاً</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <input
                        name="allowedWeightTotal"
                        type="text"
                        value={formData.allowedWeightTotal || "0"}
                        onChange={handleChange}
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        required
                        placeholder="0"
                      />
                    </td>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">وزن الحمولة المسموح به</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <input
                        name="allowedLoadWeight"
                        type="text"
                        value={formData.allowedLoadWeight || "0"}
                        onChange={handleChange}
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        required
                        placeholder="0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">الرسوم</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          name="fee"
                          type="number"
                          value={formData.fee || 0}
                          onChange={handleChange}
                          className="w-16 md:w-24 bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                          placeholder="0"
                        />
                        <span className="font-extrabold text-blue-900 text-xs md:text-sm">ريال</span>
                      </div>
                    </td>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">الوزن الفعلي</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <input
                        name="emptyWeight"
                        type="text"
                        value={formData.emptyWeight || "0"}
                        onChange={handleChange}
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">الغرامة</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          name="penalty"
                          type="number"
                          value={formData.penalty || 0}
                          onChange={handleChange}
                          className="w-16 md:w-24 bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                          placeholder="0"
                        />
                        <span className="font-extrabold text-blue-900 text-xs md:text-sm">ريال</span>
                      </div>
                    </td>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">الوزن الزائد</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <input
                        name="overweight"
                        type="text"
                        value={formData.overweight || "0"}
                        onChange={handleChange}
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">الخصم</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          name="discount"
                          type="number"
                          value={formData.discount || 0}
                          onChange={handleChange}
                          className="w-16 md:w-24 bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                          placeholder="0"
                        />
                        <span className="font-extrabold text-blue-900 text-xs md:text-sm">ريال</span>
                      </div>
                    </td>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">المبلغ المستحق</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-extrabold text-blue-900 text-xs md:text-sm">
                          {formatCurrency(formData.payableAmount || 0)}
                        </span>
                        <span className="font-extrabold text-blue-900 text-xs md:text-sm">ريال</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">النوع</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <input
                        name="type"
                        value={formData.type || ""}
                        onChange={handleChange}
                        className="w-full bg-transparent text-center border-none outline-none font-extrabold text-blue-900 text-xs md:text-sm"
                        placeholder="أدخل النوع"
                      />
                    </td>
                    <td className="border border-black p-1 md:p-2 font-bold text-right">المبلغ الصافي</td>
                    <td className="border border-black p-1 md:p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-extrabold text-blue-900 text-xs md:text-sm">{formatCurrency(formData.netAmount || 0)}</span>
                        <span className="font-extrabold text-blue-900 text-xs md:text-sm">ريال</span>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td colSpan={4} className="border border-black p-2 md:p-3 text-center text-xs leading-relaxed font-bold">
                      {penaltyText}
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-black p-1 md:p-2 font-bold text-right w-1/4">ملاحظة</td>
                    <td colSpan={3} className="border border-black p-1 md:p-2 text-right">
                      <textarea
                        name="note"
                        value={formData.note || ""}
                        onChange={handleChange}
                        className="w-full bg-transparent text-right border-none outline-none font-extrabold text-blue-900 resize-none text-xs md:text-sm"
                        rows={2}
                        placeholder="أدخل ملاحظة (اختياري)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-black p-2 md:p-3 text-center text-xs md:text-sm bg-gray-50">
              تحت إشراف مكتب وزارة النقل بالوادي والصحراء
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4 mt-4 md:mt-6">
              <div className="text-center">
                <p className="text-xs md:text-sm font-bold mb-1">اسم المستخدم</p>
                <p className="text-xs mb-6 md:mb-10">{collectorName}</p>
              </div>

              <div className="text-center">
                <p className="text-xs md:text-sm font-bold mb-6 md:mb-12">التوقيع</p>
              </div>

              <div className="text-center">
                <p className="text-xs md:text-sm font-bold mb-6 md:mb-12">الختم</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-2 md:gap-3 justify-start flex-wrap">
          <Button type="submit" disabled={isSubmitting} className="gap-2 text-sm md:text-base">
            <Save className="h-4 w-4" />
            {isSubmitting ? "جاري الحفظ..." : "حفظ الفاتورة"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="text-sm md:text-base">
            <ArrowLeft className="h-4 w-4 ml-2" />
            إلغاء
          </Button>
        </div>
      </form>
    </div>
  )
}