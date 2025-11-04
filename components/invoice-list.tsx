"use client"

import { useState, useMemo } from "react"
import type { Invoice } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Eye, Trash2, Lock, AlertCircle } from "lucide-react"
import { UserStorage } from "@/lib/user-storage"

interface InvoiceListProps {
  invoices: Invoice[]
  onView: (invoice: Invoice) => void
  onDelete: (id: string) => void
  canDelete?: boolean
}

export function InvoiceList({
  invoices,
  onView,
  onDelete,
  canDelete = true,
}: InvoiceListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today" | "week">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Check permissions
  const canViewInvoices = UserStorage.hasPermission("view_invoices")
  const canDeleteInvoice = UserStorage.hasPermission("delete_invoice") && canDelete
  const currentUser = UserStorage.getCurrentUser()

  // If user doesn't have view permission, show access denied
  if (!canViewInvoices) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b from-primary to-primary/80 text-primary-foreground">
          <CardTitle className="text-right">قائمة الفواتير</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Lock className="h-16 w-16 text-red-500" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-red-600">وصول مرفوض</h3>
              <p className="text-muted-foreground">
                ليس لديك صلاحية عرض الفواتير
              </p>
              <p className="text-sm text-muted-foreground">
                يلزم الحصول على صلاحية "عرض الفواتير" لعرض هذه الصفحة
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const filtered = useMemo(() => {
    let result = invoices

    // Search filter
    if (searchTerm) {
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.includes(searchTerm) ||
          inv.driverName.includes(searchTerm) ||
          inv.vehicleNumber.includes(searchTerm),
      )
    }

    // Date filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    if (filterPeriod === "today") {
      result = result.filter((inv) => {
        const invDate = new Date(inv.createdAt.getFullYear(), inv.createdAt.getMonth(), inv.createdAt.getDate())
        return invDate.getTime() === today.getTime()
      })
    } else if (filterPeriod === "week") {
      result = result.filter((inv) => new Date(inv.createdAt) >= weekAgo)
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [invoices, searchTerm, filterPeriod])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedInvoices = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-YE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  const handleView = (invoice: Invoice) => {
    onView(invoice)
  }

  const handleDelete = (id: string) => {
    if (!canDeleteInvoice) {
      alert("ليس لديك صلاحية حذف الفواتير")
      return
    }
    onDelete(id)
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b from-primary to-primary/80 text-primary-foreground">
        <CardTitle className="text-right">قائمة الفواتير</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Permission Status Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="font-semibold text-blue-800">{currentUser?.name}</p>
              <p className="text-sm text-blue-600">
                {canViewInvoices && canDeleteInvoice 
                  ? "مسموح لك بعرض وحذف الفواتير"
                  : canViewInvoices 
                  ? "مسموح لك بعرض الفواتير فقط"
                  : "غير مسموح لك بعرض الفواتير"
                }
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              canViewInvoices 
                ? "bg-green-100 text-green-800" 
                : "bg-red-100 text-red-800"
            }`}>
              {canViewInvoices ? "✓ مسموح" : "✗ غير مسموح"}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث برقم السند أو اسم السائق أو رقم المركبة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <select
              value={filterPeriod}
              onChange={(e) => {
                setFilterPeriod(e.target.value as typeof filterPeriod)
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">جميع الفترات</option>
              <option value="today">اليوم</option>
              <option value="week">هذا الأسبوع</option>
            </select>
          </div>
          <div className="text-sm text-muted-foreground">
            إجمالي الفواتير: <span className="font-semibold text-foreground">{filtered.length}</span>
          </div>
        </div>

        {/* Table */}
        {paginatedInvoices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="text-right">رقم السند</TableHead>
                    <TableHead className="text-right">اسم السائق</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-center">المبلغ المستحق</TableHead>
                    <TableHead className="text-center">المبلغ الصافي</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell className="text-right font-semibold text-primary">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="text-right">{invoice.driverName}</TableCell>
                      <TableCell className="text-right">{formatDate(invoice.createdAt)}</TableCell>
                      <TableCell className="text-center">{formatCurrency(invoice.payableAmount)} ريال</TableCell>
                      <TableCell className="text-center font-semibold">
                        {formatCurrency(invoice.netAmount)} ريال
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          {/* View Button - Always shown if user can view invoices */}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleView(invoice)} 
                            title="عرض"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                         
                          {/* Delete Button - Only shown if user has delete permission */}
                          {canDeleteInvoice ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(invoice.id)}
                              title="حذف"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled
                              title="ليس لديك صلاحية الحذف"
                              className="opacity-50 cursor-not-allowed"
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  الصفحة {currentPage} من {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    السابقة
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    التالية
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد فواتير حتى الآن</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}