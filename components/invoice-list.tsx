"use client"

import { useState, useMemo } from "react"
import type { Invoice } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Printer, Eye, Trash2 } from "lucide-react"

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

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b  from-primary to-primary/80 text-primary-foreground">
        <CardTitle className="text-right">قائمة الفواتير</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
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
                          <Button size="sm" variant="ghost" onClick={() => onView(invoice)} title="عرض">
                            <Eye className="h-4 w-4" />
                          </Button>
                         
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDelete(invoice.id)}
                              title="حذف"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
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
