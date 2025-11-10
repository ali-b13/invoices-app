"use client";

import { useState, useEffect } from "react";
import type { Invoice, Permission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
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
  RefreshCw,
} from "lucide-react";
import { HybridStorage } from "@/lib/hybrid-storage";
import { formatDateTime, formatCurrencyEN } from "@/lib/formatters";
import { useCallback } from "react";
import { ApiError } from "next/dist/server/api-utils";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
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
  const [refreshing, setRefreshing] = useState(false);
  const itemsPerPage = 10;

  const currentUser = HybridStorage.getCurrentUser();
  const hasPermission = (permission: Permission) =>
    currentUser?.permissions.includes(permission) ?? false;

  const canViewInvoices = hasPermission("view_invoices");
  const canDeleteInvoice = hasPermission("delete_invoice") && canDelete;
  const canEditInvoice = hasPermission("edit_invoice");

  const fetchInvoices = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
      if (error instanceof ApiError) {
        toast.error(error.message);

        if (error.statusCode === 401) {
          router.push("/login");
          return;
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, startDate, endDate, itemsPerPage, router]);

  // Initial fetch and filter changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      fetchInvoices(1);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, startDate, endDate, fetchInvoices]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchInvoices(page);
  };

  const handleRefresh = () => {
    fetchInvoices(currentPage, true);
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
          <CardTitle className="text-right text-lg md:text-xl">قائمة الفواتير</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-3 md:space-y-4">
            <Lock className="h-12 w-12 md:h-16 md:w-16 text-red-500" />
            <div className="space-y-1 md:space-y-2">
              <h3 className="text-lg md:text-xl font-bold text-red-600">وصول مرفوض</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                ليس لديك صلاحية عرض الفواتير
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">
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
        <CardTitle className="text-right text-lg md:text-xl">قائمة الفواتير</CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        {/* Permission Status Banner */}
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="font-semibold text-blue-800 text-sm md:text-base">{currentUser?.name}</p>
              <p className="text-xs md:text-sm text-blue-600">
                {canViewInvoices && canDeleteInvoice && canEditInvoice
                  ? "مسموح لك بعرض، تعديل، وحذف الفواتير"
                  : canViewInvoices
                  ? "مسموح لك بعرض الفواتير فقط"
                  : "غير مسموح لك بعرض الفواتير"}
              </p>
            </div>
            <div
              className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium ${
                canViewInvoices
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {canViewInvoices ? "✓ مسموح" : "✗ غير مسموح"}
            </div>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="w-full md:flex-1 md:min-w-64">
              <label className="block text-xs md:text-sm font-semibold mb-1 md:mb-2 text-right">
                بحث سريع
              </label>
              <div className="relative">
                <Search className="absolute right-2 md:right-3 top-2 md:top-3 h-3 w-3 md:h-4 md:w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="ابحث برقم السند أو اسم السائق أو رقم المركبة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-8 md:pr-10 text-right text-xs md:text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="w-full md:w-auto grid grid-cols-2 gap-2 md:flex md:gap-3">
              <div className="min-w-0">
                <label className="block text-xs md:text-sm font-semibold mb-1 md:mb-2 text-right">
                  من تاريخ
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-right text-xs md:text-sm"
                  disabled={loading}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs md:text-sm font-semibold mb-1 md:mb-2 text-right">
                  إلى تاريخ
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-right text-xs md:text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="w-full md:w-auto flex gap-2 mt-2 md:mt-0">
              <Button
                onClick={() => {
                  setCurrentPage(1);
                  fetchInvoices(1);
                }}
                disabled={loading}
                size="sm"
                className="text-xs md:text-sm"
              >
                تطبيق
              </Button>
              
              <Button
                onClick={handleRefresh}
                disabled={loading || refreshing}
                size="sm"
                variant="outline"
                className="text-xs md:text-sm gap-1"
              >
                <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ${refreshing ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              
              {(searchTerm || startDate || endDate) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStartDate("");
                    setEndDate("");
                    setCurrentPage(1);
                    fetchInvoices(1);
                  }}
                  disabled={loading}
                  size="sm"
                  className="text-xs md:text-sm"
                >
                  إعادة تعيين
                </Button>
              )}
            </div>
          </div>

          {/* Results Info */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs md:text-sm text-muted-foreground">
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
                    <TableHead className="text-right text-xs md:text-sm p-2 md:p-4">رقم السند</TableHead>
                    <TableHead className="text-right text-xs md:text-sm p-2 md:p-4">اسم السائق</TableHead>
                    <TableHead className="text-right text-xs md:text-sm p-2 md:p-4">التاريخ</TableHead>
                    <TableHead className="text-center text-xs md:text-sm p-2 md:p-4">المبلغ الصافي</TableHead>
                    <TableHead className="text-center text-xs md:text-sm p-2 md:p-4">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell className="text-right font-semibold text-primary text-xs md:text-sm p-2 md:p-4">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-right text-xs md:text-sm p-2 md:p-4">
                        {invoice.driverName}
                      </TableCell>
                      <TableCell className="text-right text-xs md:text-sm p-2 md:p-4">
                        {formatDateTime(invoice.createdAt)}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs md:text-sm p-2 md:p-4">
                        {formatCurrencyEN(invoice.netAmount)}
                      </TableCell>
                      <TableCell className="text-center p-2 md:p-4">
                        <div className="flex gap-1 md:gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleView(invoice)}
                            title="عرض"
                            className="h-8 w-8 md:h-9 md:w-9 p-0"
                          >
                            <Eye className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>

                          {canEditInvoice ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(invoice)}
                              title="تعديل"
                              className="h-8 w-8 md:h-9 md:w-9 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                            >
                              <Edit className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled
                              title="ليس لديك صلاحية التعديل"
                              className="h-8 w-8 md:h-9 md:w-9 p-0 opacity-50 cursor-not-allowed"
                            >
                              <Edit className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          )}

                          {canDeleteInvoice ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(invoice.id)}
                              title="حذف"
                              className="h-8 w-8 md:h-9 md:w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled
                              title="ليس لديك صلاحية الحذف"
                              className="h-8 w-8 md:h-9 md:w-9 p-0 opacity-50 cursor-not-allowed"
                            >
                              <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t">
                <div className="text-xs md:text-sm text-muted-foreground order-2 sm:order-1">
                  الصفحة{" "}
                  <span className="font-semibold text-foreground">
                    {currentPage}
                  </span>{" "}
                  من{" "}
                  <span className="font-semibold text-foreground">
                    {totalPages}
                  </span>
                </div>

                <div className="flex gap-1 md:gap-2 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    className="gap-1 md:gap-2 text-xs md:text-sm"
                  >
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">السابقة</span>
                  </Button>

                  <div className="flex items-center gap-1 px-1 md:px-2">
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
                            className="min-w-8 md:min-w-10 h-8 md:h-9 text-xs md:text-sm"
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
                    className="gap-1 md:gap-2 text-xs md:text-sm"
                  >
                    <span className="hidden sm:inline">التالية</span>
                    <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 md:py-12">
            <p className="text-muted-foreground text-sm md:text-base">
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