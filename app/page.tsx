"use client"

import { useState, useEffect, useRef } from "react"
import { LoginPage } from "@/components/login-page"
import { InvoiceList } from "@/components/invoice-list"
import { DashboardHeader } from "@/components/dashboard-header"
import { CreateInvoiceForm } from "@/components/create-invoice-form"
import { InvoicePreview } from "@/components/invoice-preview"
import { SettingsPanel } from "@/components/settings-panel"
import { UserManagement } from "@/components/user-managment"
import { InvoiceStorage } from "@/lib/invoice-storage"
import { UserStorage } from "@/lib/user-storage"
import type { Invoice, User } from "@/lib/types"

type PageType = "dashboard" | "create" | "preview" | "settings" | "user-management"

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const printContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    UserStorage.initializeDefaultUsers()
    const user = UserStorage.getCurrentUser()
    setCurrentUser(user)
    if (user) {
      const stored = InvoiceStorage.getInvoices()
      setInvoices(stored)
    }
    setIsLoading(false)
  }, [])

  const handleLoginSuccess = () => {
    const user = UserStorage.getCurrentUser()
    setCurrentUser(user)
    const stored = InvoiceStorage.getInvoices()
    setInvoices(stored)
  }

  const handleLogout = () => {
    UserStorage.logout()
    setCurrentUser(null)
    setCurrentPage("dashboard")
    setInvoices([])
    setSelectedInvoice(null)
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

  const handleCreateInvoice = (invoice: Invoice) => {
    setInvoices((prev) => [...prev, invoice])
    setCurrentPage("preview")
    setSelectedInvoice(invoice)
  }

  const handleDeleteInvoice = (id: string) => {
    if (!canDeleteInvoice) {
      alert("ليس لديك صلاحية حذف الفواتير")
      return
    }
    if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
      InvoiceStorage.deleteInvoice(id)
      setInvoices((prev) => prev.filter((inv) => inv.id !== id))
    }
  }

  const handlePrintInvoice = async (invoice: Invoice) => {
    if (!canPrintInvoice) {
      alert("ليس لديك صلاحية طباعة الفواتير")
      return
    }

    // Get the current preview invoice content
    const previewContent = printContentRef.current;
    if (!previewContent) {
      console.error("Preview content not found");
      return;
    }

    // Clone the content to avoid modifying the original
    const printContent = previewContent.cloneNode(true) as HTMLDivElement;

    // Remove action buttons from the print version
    const buttons = printContent.querySelectorAll('button, .flex.gap-2.flex-wrap');
    buttons.forEach(button => button.remove());

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }

    // Write the HTML content to the print window
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
    `);

    printWindow.document.close();
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.netAmount, 0)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        invoiceCount={invoices.length}
        totalAmount={totalAmount}
        onCreateNew={() => setCurrentPage("create")}
        onSettings={() => setCurrentPage("settings")}
        onUserManagement={() => canManageUsers && setCurrentPage("user-management")}
        currentPage={currentPage}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="container mx-auto px-4 py-8">
        {currentPage === "dashboard" && (
          <InvoiceList
            invoices={invoices}
            onView={(invoice) => {
              setSelectedInvoice(invoice)
              setCurrentPage("preview")
            }}
            onDelete={handleDeleteInvoice}
            canDelete={canDeleteInvoice}
          />
        )}

        {currentPage === "create"  && (
          <CreateInvoiceForm onSave={handleCreateInvoice} onCancel={() => setCurrentPage("dashboard")} />
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