"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { InvoiceList } from "@/components/invoice-list"
import { DashboardHeader } from "@/components/dashboard-header"
import { CreateInvoiceForm } from "@/components/create-invoice-form"
import { InvoicePreview } from "@/components/invoice-preview"
import { SettingsPanel } from "@/components/settings-panel"
import { UserManagement } from "@/components/user-managment"
import { HybridStorage } from "@/lib/hybrid-storage"
import type { Invoice, InvoiceFormData, User } from "@/lib/types"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { toast } from "sonner"

type PageType = "dashboard" | "create" | "preview" | "settings" | "user-management"

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isOnline, setIsOnline] = useState(HybridStorage.isOnline)
  const [isEditing, setIsEditing] = useState(false)
  const printContentRef = useRef<HTMLDivElement>(null)
  const [totalInvoices, setTotalInvoices] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const router = useRouter()

  // Single initialization effect
  useEffect(() => {
    const initializeApp = async () => {
      try {
        HybridStorage.init()

        const user = HybridStorage.getCurrentUser()
        if (!user) {
          router.replace("/login?redirect=/")
          return
        }

        setCurrentUser(user)

        // Fetch initial data only once
        const result = await HybridStorage.getInvoices({}, { page: 1, limit: 10 })
        setTotalInvoices(result.total)
        const amount = result.invoices.reduce((sum, inv) => sum + inv.netAmount, 0)
        setTotalAmount(amount)

        const handleOnline = () => {
          console.log("[Home] Went online")
          setIsOnline(true)
          toast.success("تم استعادة الاتصال بالإنترنت")
        }

        const handleOffline = () => {
          console.log("[Home] Went offline")
          setIsOnline(false)
          toast.warning("أنت الآن غير متصل بالإنترنت")
        }

        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)

        return () => {
          window.removeEventListener("online", handleOnline)
          window.removeEventListener("offline", handleOffline)
        }
      } catch (error: any) {
        console.log("[Home] Initialization error:", error)
        toast.error("خطأ في تهيئة التطبيق: " + (error.message || "خطأ غير معروف"))
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [router])

  const handleLogout = async () => {
    try {
      await HybridStorage.logout()
      setCurrentUser(null)
      setCurrentPage("dashboard")
      setSelectedInvoice(null)
      toast.success("تم تسجيل الخروج بنجاح")
      router.replace("/login")
    } catch (error: any) {
      console.log("[Home] Logout error:", error)
      toast.error("فشل في تسجيل الخروج: " + (error.message || "خطأ غير معروف"))
    }
  }

  const handleSaveInvoice = async (invoiceData: InvoiceFormData): Promise<Invoice> => {
    try {
      let invoice: Invoice
      if (isEditing && selectedInvoice) {
        const updated = await HybridStorage.updateInvoice(selectedInvoice.id, invoiceData)
        if (!updated) throw new Error("Failed to update invoice")
        invoice = updated
        setIsEditing(false)
        toast.success("تم تحديث الفاتورة بنجاح")
      } else {
        invoice = await HybridStorage.saveInvoice(invoiceData)
        toast.success("تم إنشاء الفاتورة بنجاح")
      }

      // Update totals after saving
      const result = await HybridStorage.getInvoices({}, { page: 1, limit: 1 })
      setTotalInvoices(result.total)
      
      setCurrentPage("preview")
      setSelectedInvoice(invoice)
      return invoice
    } catch (error: any) {
      console.log("[Home] Error saving invoice:", error)
      toast.error("فشل في حفظ الفاتورة: " + (error.message || "خطأ غير معروف"))
      throw error
    }
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsEditing(true)
    setCurrentPage("create")
  }

  const handleDeleteInvoice = async (id: string) => {
    const canDeleteInvoice = currentUser?.permissions.includes("delete_invoice") ?? false
    if (!canDeleteInvoice) {
      toast.error("ليس لديك صلاحية حذف الفواتير")
      return
    }

    if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
      try {
        await HybridStorage.deleteInvoice(id)
        // Update totals after deletion
        const result = await HybridStorage.getInvoices({}, { page: 1, limit: 1 })
        setTotalInvoices(result.total)
        
        if (selectedInvoice?.id === id) {
          setSelectedInvoice(null)
          setCurrentPage("dashboard")
        }
        toast.success("تم حذف الفاتورة بنجاح")
      } catch (error: any) {
        console.log("[Home] Error deleting invoice:", error)
        toast.error("فشل في حذف الفاتورة: " + (error.message || "خطأ غير معروف"))
      }
    }
  }

  // Check permissions
  const canCreateInvoice = currentUser?.permissions.includes("create_invoice") ?? false
  const canDeleteInvoice = currentUser?.permissions.includes("delete_invoice") ?? false
  const canPrintInvoice = currentUser?.permissions.includes("print_invoice") ?? false
  const canDownloadInvoice = currentUser?.permissions.includes("download_invoice") ?? false
  const canViewInvoices = currentUser?.permissions.includes("view_invoices") ?? false
  const canManageUsers = currentUser?.permissions.includes("manage_users") ?? false

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null // Will redirect in useEffect
  }

  const handlePrintInvoice = async (invoice: Invoice) => {
    if (!canPrintInvoice) {
      toast.error("ليس لديك صلاحية طباعة الفواتير")
      return
    }

    const previewContent = printContentRef.current
    if (!previewContent) {
      console.log("Preview content not found")
      toast.error("خطأ في معاينة الفاتورة للطباعة")
      return
    }

    try {
      const printContent = previewContent.cloneNode(true) as HTMLDivElement
      const buttons = printContent.querySelectorAll("button, .flex.gap-2.flex-wrap")
      buttons.forEach((button) => button.remove())

      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        toast.error("يرجى السماح بالنوافذ المنبثقة للطباعة")
        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة - ${invoice.invoiceNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
              color: #00008B;
            }
            * {
              box-sizing: border-box;
            }
            .print-container {
              max-width: 100%;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            table, th, td {
              border: 1px solid #00008B;
            }
            th, td {
              padding: 8px;
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .font-bold {
              font-weight: bold;
            }
            .bg-gray-50 {
              background-color: #f8f9fa;
            }
            .border {
              border: 1px solid #00008B;
            }
            .border-black {
              border-color: #00008B;
            }
            .p-2 {
              padding: 8px;
            }
            .p-3 {
              padding: 12px;
            }
            .p-8 {
              padding: 32px;
            }
            .space-y-4 > * + * {
              margin-top: 16px;
            }
            .space-y-6 > * + * {
              margin-top: 24px;
            }
            .mb-1 {
              margin-bottom: 4px;
            }
            .mb-10 {
              margin-bottom: 40px;
            }
            .mb-12 {
              margin-bottom: 48px;
            }
            .mt-6 {
              margin-top: 24px;
            }
            .text-sm {
              font-size: 14px;
            }
            .text-xs {
              font-size: 12px;
            }
            .text-base {
              font-size: 16px;
            }
            .text-lg {
              font-size: 18px;
            }
            .text-2xl {
              font-size: 24px;
            }
            .leading-relaxed {
              line-height: 1.625;
            }
            .grid {
              display: grid;
            }
            .grid-cols-3 {
              grid-template-columns: repeat(3, 1fr);
            }
            .gap-4 {
              gap: 16px;
            }
            .w-1\\/4 {
              width: 25%;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 100);
            };
          </script>
        </body>
        </html>
      `)

      printWindow.document.close()
      toast.success("جاري فتح نافذة الطباعة...")
    } catch (error) {
      console.log("[Home] Print error:", error)
      toast.error("فشل في طباعة الفاتورة")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PWAInstallPrompt />
      <DashboardHeader
        invoiceCount={totalInvoices}
        totalAmount={totalAmount}
        onCreateNew={() => {
          if (!canCreateInvoice) {
            toast.error("ليس لديك صلاحية إنشاء فواتير جديدة")
            return
          }
          setSelectedInvoice(null)
          setIsEditing(false)
          setCurrentPage("create")
        }}
        onSettings={() => setCurrentPage("settings")}
        onUserManagement={() => {
          if (!canManageUsers) {
            toast.error("ليس لديك صلاحية إدارة المستخدمين")
            return
          }
          setCurrentPage("user-management")
        }}
        currentPage={currentPage}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="container mx-auto px-4 py-8">
        {currentPage === "dashboard" && (
          <InvoiceList
            onView={(invoice) => {
              setSelectedInvoice(invoice)
              setCurrentPage("preview")
            }}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            canDelete={canDeleteInvoice}
          />
        )}

        {currentPage === "create" && (
          <CreateInvoiceForm
            onSave={handleSaveInvoice}
            onCancel={() => {
              setIsEditing(false)
              setSelectedInvoice(null)
              setCurrentPage("dashboard")
            }}
            initialData={isEditing ? selectedInvoice : null}
          />
        )}

        {currentPage === "preview" && selectedInvoice && (
          <div ref={printContentRef}>
            <InvoicePreview
              invoice={selectedInvoice}
              onPrint={() => handlePrintInvoice(selectedInvoice)}
              onBack={() => setCurrentPage("dashboard")}
            />
          </div>
        )}

        {currentPage === "settings" && (
          <SettingsPanel onSave={() => setCurrentPage("dashboard")} onClose={() => setCurrentPage("dashboard")} />
        )}

        {currentPage === "user-management" && canManageUsers && (
          <UserManagement onClose={() => setCurrentPage("dashboard")} />
        )}
      </main>
    </div>
  )
}