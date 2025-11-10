"use client";

import { useState, useEffect } from "react";
import type { Invoice, Permission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Eye,
  Trash2,
  Lock,
  Edit,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { HybridStorage } from "@/lib/hybrid-storage";
import { formatDateTime, formatCurrencyEN } from "@/lib/formatters";
import { useCallback } from "react";

interface InvoiceListProps {
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
}

export function InvoiceList({
  onView,
  onEdit,
  onDelete,
  canDelete = true,
}: InvoiceListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [invoicesData, setInvoicesData] = useState<{
    invoices: Invoice[];
    total: number;
  }>({
    invoices: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  const currentUser = HybridStorage.getCurrentUser();
  const hasPermission = (permission: Permission) =>
    currentUser?.permissions.includes(permission) ?? false;

  const canViewInvoices = hasPermission("view_invoices");
  const canDeleteInvoice = hasPermission("delete_invoice") && canDelete;
  const canEditInvoice = hasPermission("edit_invoice");

  const fetchInvoices = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const startDateObj = startDate ? new Date(startDate) : undefined;
        const endDateObj = endDate ? new Date(endDate) : undefined;

        const result = await HybridStorage.getInvoices(
          {
            searchTerm: searchTerm || undefined,
            startDate: startDateObj,
            endDate: endDateObj,
          },
          { page, limit: itemsPerPage }
        );

        setInvoicesData(result);
      } catch (error) {
        console.error("[InvoiceList] Failed to fetch invoices:", error);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, itemsPerPage]
  ); // Removed currentPage dependency

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when filters change
      fetchInvoices(1);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, startDate, endDate, fetchInvoices]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchInvoices(page);
  };

  const totalPages = Math.ceil(invoicesData.total / itemsPerPage);

  const handleView = (invoice: Invoice) => {
    onView(invoice);
  };

  const handleEdit = (invoice: Invoice) => {
    if (!canEditInvoice) {
      alert("ليس لديك صلاحية تعديل الفواتير");
      return;
    }
    onEdit(invoice);
  };

  const handleDelete = (id: string) => {
    if (!canDeleteInvoice) {
      alert("ليس لديك صلاحية حذف الفواتير");
      return;
    }
    onDelete(id);
  };

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
    );
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
                {canViewInvoices && canDeleteInvoice && canEditInvoice
                  ? "مسموح لك بعرض، تعديل، وحذف الفواتير"
                  : canViewInvoices
                  ? "مسموح لك بعرض الفواتير فقط"
                  : "غير مسموح لك بعرض الفواتير"}
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                canViewInvoices
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {canViewInvoices ? "✓ مسموح" : "✗ غير مسموح"}
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-semibold mb-2 text-right">
                بحث سريع
              </label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="ابحث برقم السند أو اسم السائق أو رقم المركبة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 text-right"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="min-w-40">
              <label className="block text-sm font-semibold mb-2 text-right">
                من تاريخ
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-right"
                disabled={loading}
              />
            </div>

            <div className="min-w-40">
              <label className="block text-sm font-semibold mb-2 text-right">
                إلى تاريخ
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-right"
                disabled={loading}
              />
            </div>

            <div className="flex items-center">
              <Button
                onClick={() => {
                  setCurrentPage(1);
                  fetchInvoices(1);
                }}
                disabled={loading}
              >
                تطبيق
              </Button>
              {(searchTerm || startDate || endDate) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStartDate("");
                    setEndDate("");
                    setCurrentPage(1);
                    fetchInvoices(1); // fetch all invoices after reset
                  }}
                  disabled={loading}
                >
                  إعادة تعيين
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {totalPages > 0 && (
                <span className="font-semibold text-foreground">
                  {loading
                    ? "جاري التحميل..."
                    : `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(
                        currentPage * itemsPerPage,
                        invoicesData.total
                      )} من ${invoicesData.total}`}
                </span>
              )}
            </div>
            <div>
              إجمالي الفواتير المفلترة:{" "}
              <span className="font-semibold text-foreground">
                {invoicesData.total}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        {invoicesData.invoices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="text-right">رقم السند</TableHead>
                    <TableHead className="text-right">اسم السائق</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-center">
                      المبلغ المستحق
                    </TableHead>
                    <TableHead className="text-center">المبلغ الصافي</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell className="text-right font-semibold text-primary">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.driverName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDateTime(invoice.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatCurrencyEN(invoice.payableAmount)}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {formatCurrencyEN(invoice.netAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleView(invoice)}
                            title="عرض"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {canEditInvoice ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(invoice)}
                              title="تعديل"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled
                              title="ليس لديك صلاحية التعديل"
                              className="opacity-50 cursor-not-allowed"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}

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

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground order-2 sm:order-1">
                  الصفحة{" "}
                  <span className="font-semibold text-foreground">
                    {currentPage}
                  </span>{" "}
                  من{" "}
                  <span className="font-semibold text-foreground">
                    {totalPages}
                  </span>
                </div>

                <div className="flex gap-2 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    className="gap-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابقة
                  </Button>

                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: Math.min(5, totalPages) }).map(
                      (_, i) => {
                        const pageNum =
                          currentPage > 3 ? currentPage - 2 + i : i + 1;
                        if (pageNum > totalPages) return null;
                        return (
                          <Button
                            key={pageNum}
                            variant={
                              currentPage === pageNum ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="min-w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="gap-2"
                  >
                    التالية
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {loading
                ? "جاري التحميل..."
                : "لا توجد فواتير مطابقة لفلتر البحث"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
