"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { LoginPage } from "@/components/login-page"
import { InvoiceList } from "@/components/invoice-list"
import { DashboardHeader } from "@/components/dashboard-header"
import { CreateInvoiceForm } from "@/components/create-invoice-form"
import { InvoicePreview } from "@/components/invoice-preview"
import { SettingsPanel } from "@/components/settings-panel"
import { UserManagement } from "@/components/user-managment"
import { HybridStorage } from "@/lib/hybrid-storage"
import type { Invoice, InvoiceFormData, User } from "@/lib/types"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

type PageType = "dashboard" | "create" | "preview" | "settings" | "user-management"

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isOnline, setIsOnline] = useState(HybridStorage.isOnline)
  const [isEditing, setIsEditing] = useState(false)
  const printContentRef = useRef<HTMLDivElement>(null)
 const [totalInvoices,setTotalInvoices]=useState(0)
const fetchInvoices = useCallback(async (page: number = 1) => {
  const result = await HybridStorage.getInvoices({}, { page, limit: 10 })
  setInvoices(result.invoices)
  setTotalInvoices(result.total)
}, [])

  useEffect(() => {
    const initializeApp = async () => {
      try {
        HybridStorage.init()

        const user = HybridStorage.getCurrentUser()
        setCurrentUser(user)

        if (user) {
          await fetchInvoices()
        }

        const handleOnline = async () => {
          console.log("[Home] Went online - syncing data")
          setIsOnline(true)
          await fetchInvoices()
        }

        const handleOffline = () => {
          console.log("[Home] Went offline")
          setIsOnline(false)
        }

        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)

        return () => {
          window.removeEventListener("online", handleOnline)
          window.removeEventListener("offline", handleOffline)
        }
      } catch (error) {
        console.error("[Home] Initialization error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [fetchInvoices])

  const handleLoginSuccess = async () => {
    const user = HybridStorage.getCurrentUser()
    setCurrentUser(user)
    await fetchInvoices()
  }

  const handleLogout = async () => {
    HybridStorage.logout()
    setCurrentUser(null)
    setCurrentPage("dashboard")
    setInvoices([])
    setSelectedInvoice(null)
  }

  const handleSaveInvoice = async (invoiceData: InvoiceFormData): Promise<Invoice> => {
    let invoice: Invoice
    if (isEditing && selectedInvoice) {
      const updated = await HybridStorage.updateInvoice(selectedInvoice.id, invoiceData)
      if (!updated) throw new Error("Failed to update invoice")
      invoice = updated
      setIsEditing(false)
    } else {
      invoice = await HybridStorage.saveInvoice(invoiceData)
    }

    await fetchInvoices()

    setCurrentPage("preview")
    setSelectedInvoice(invoice)
    return invoice
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsEditing(true)
    setCurrentPage("create")
  }

  const handleDeleteInvoice = async (id: string) => {
    const canDeleteInvoice = currentUser?.permissions.includes("delete_invoice") ?? false
    if (!canDeleteInvoice) {
      alert("ليس لديك صلاحية حذف الفواتير")
      return
    }
    if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
      await HybridStorage.deleteInvoice(id)
      await fetchInvoices()
      if (selectedInvoice?.id === id) {
        setSelectedInvoice(null)
        setCurrentPage("dashboard")
      }
    }
  }

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
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  const handlePrintInvoice = async (invoice: Invoice) => {
    if (!canPrintInvoice) {
      alert("ليس لديك صلاحية طباعة الفواتير")
      return
    }

    const previewContent = printContentRef.current
    if (!previewContent) {
      console.error("Preview content not found")
      return
    }

    const printContent = previewContent.cloneNode(true) as HTMLDivElement
    const buttons = printContent.querySelectorAll("button, .flex.gap-2.flex-wrap")
    buttons.forEach((button) => button.remove())

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة للطباعة")
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
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.netAmount, 0)

  return (
    <div className="min-h-screen bg-background">
       <PWAInstallPrompt />
      <DashboardHeader
        invoiceCount={totalInvoices}
        totalAmount={totalAmount}
        onCreateNew={() => {
          setSelectedInvoice(null)
          setIsEditing(false)
          setCurrentPage("create")
        }}
        onSettings={() => setCurrentPage("settings")}
        onUserManagement={() => canManageUsers && setCurrentPage("user-management")}
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
