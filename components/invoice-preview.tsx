"use client";
import type { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, Download, FileText, ArrowRight, Lock } from "lucide-react";
import { useState } from "react";
import { HybridStorage } from "@/lib/hybrid-storage";
import { formatCurrencyEN, formatDateTime } from "@/lib/formatters";
import { PDFGenerator } from "@/lib/pdf-generator";

interface InvoicePreviewProps {
  invoice: Invoice;
  onPrint: () => void;
  onBack: () => void;
}

export function InvoicePreview({
  invoice,
  onPrint,
  onBack,
}: InvoicePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"docx" | "pdf" | null>(
    null
  );
  const currentUser = HybridStorage.getCurrentUser();
  const collectorName ="خالد صالح الديني"
  
  // Check permissions
  const canPrintInvoice = currentUser?.permissions.includes("print_invoice");
  const canDownloadInvoice = currentUser?.permissions.includes("download_invoice");
  
  const penaltyText = `غرامة (10000) ريال على كل طن زائد فوق الوزن المسموح به قابل للمضاعفة في حالة تجاوز الوزن الزائد 30% من وزن الحمولة المسموح به وفقاً للمركبة أو السائق أو السائق والمركبة معاً`;

  const handlePrint = () => {
    if (!canPrintInvoice) {
      alert("ليس لديك صلاحية طباعة الفواتير");
      return;
    }
    onPrint();
  };

  const handleDownload = async (format: "docx" | "pdf") => {
    if (!canDownloadInvoice) {
      alert("ليس لديك صلاحية تحميل الفواتير");
      return;
    }

    setIsDownloading(true);
    setDownloadFormat(format);
    try {
      if (format === "pdf") {
          PDFGenerator.downloadInvoiceAsPDF(invoice);
      } else {
        const { DocxGenerator } = await import("@/lib/docx-generator");
        await DocxGenerator.downloadInvoiceAsDocx(invoice, collectorName);
      }
    } catch (error) {
      console.error("[v0] Failed to download:", error);
      alert(`حدث خطأ أثناء تحميل ملف ${format.toUpperCase()}`);
    } finally {
      setIsDownloading(false);
      setDownloadFormat(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="self-start sm:self-center">
          <ArrowRight className="h-4 w-4 ml-1" />
          <span className="font-bold text-sm md:text-base">رجوع</span>
        </Button>

        <div className="flex gap-2 flex-wrap self-start sm:self-center">
          {/* Print Button */}
          {canPrintInvoice ? (
            <Button
              onClick={handlePrint}
              className="gap-1 md:gap-2 bg-transparent"
              variant="outline"
              size="sm"
            >
              <Printer className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm hidden sm:inline">طباعة</span>
              <span className="text-xs md:text-sm sm:hidden">طباعة</span>
            </Button>
          ) : (
            <Button
              className="gap-1 md:gap-2 bg-transparent opacity-50 cursor-not-allowed"
              variant="outline"
              disabled
              size="sm"
              title="ليس لديك صلاحية الطباعة"
            >
              <Lock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">غير مسموح</span>
            </Button>
          )}

          {/* PDF Download Button */}
          {canDownloadInvoice ? (
            <Button
              onClick={() => handleDownload("pdf")}
              disabled={isDownloading && downloadFormat === "pdf"}
              className="gap-1 md:gap-2"
              variant="outline"
              size="sm"
            >
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm hidden sm:inline">
                {isDownloading && downloadFormat === "pdf"
                  ? "جاري..."
                  : "تحميل PDF"}
              </span>
              <span className="text-xs md:text-sm sm:hidden">PDF</span>
            </Button>
          ) : (
            <Button
              className="gap-1 md:gap-2 opacity-50 cursor-not-allowed"
              variant="outline"
              disabled
              size="sm"
              title="ليس لديك صلاحية التحميل"
            >
              <Lock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">غير مسموح</span>
            </Button>
          )}

          {/* DOCX Download Button */}
          {canDownloadInvoice ? (
            <Button
              onClick={() => handleDownload("docx")}
              disabled={isDownloading && downloadFormat === "docx"}
              className="gap-1 md:gap-2"
              variant="outline"
              size="sm"
            >
              <Download className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm hidden sm:inline">
                {isDownloading && downloadFormat === "docx"
                  ? "جاري..."
                  : "تحميل DOCX"}
              </span>
              <span className="text-xs md:text-sm sm:hidden">DOCX</span>
            </Button>
          ) : (
            <Button
              className="gap-1 md:gap-2 opacity-50 cursor-not-allowed"
              variant="outline"
              disabled
              size="sm"
              title="ليس لديك صلاحية التحميل"
            >
              <Lock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm">غير مسموح</span>
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Card */}
      <Card className="p-4 md:p-8 bg-white text-blue-900 font-extrabold">
        <div className="space-y-3 md:space-y-4">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-sm md:text-lg font-bold mb-1">
              الجمهورية اليمنية - مكتب النقل وادي حضرموت
            </h1>
            <p className="text-xs md:text-base font-bold">ميزان العبر</p>
          </div>

          {/* Invoice Table - Responsive */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-xs md:text-sm min-w-[600px]">
              <tbody>
                <tr>
                  <td className="border border-black p-1 md:p-2 font-bold text-right w-1/4">
                    رقم السند
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center w-1/4">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="border border-black p-1 md:p-2 font-bold text-right w-1/4">
                    التاريخ والوقت
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center w-1/4">
                    {formatDateTime(new Date(invoice.createdAt))}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    اسم السائق
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {invoice.driverName}
                  </td>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    رقم المركبة
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {invoice.vehicleNumber}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    نوع المركبة
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {invoice.vehicleType}
                  </td>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    عدد المحاور
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {invoice.axles}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    الوزن المسموح به كاملاً
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {invoice.allowedWeightTotal}
                  </td>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    وزن الحمولة المسموح به
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {invoice.allowedLoadWeight}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    الرسوم
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {formatCurrencyEN(invoice.fee)}
                  </td>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    الوزن الفعلي
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {invoice.emptyWeight}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    الغرامة
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {formatCurrencyEN(invoice.penalty)}
                  </td>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    الوزن الزائد
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {invoice.overweight}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    الخصم
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {formatCurrencyEN(invoice.discount)}
                  </td>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    المبلغ المستحق
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {formatCurrencyEN(invoice.payableAmount)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    النوع
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {invoice.type}
                  </td>
                  <td className="border border-black p-1 md:p-2 font-bold text-right">
                    المبلغ الصافي
                  </td>
                  <td className="border border-black p-1 md:p-2 text-center">
                    {formatCurrencyEN(invoice.netAmount)} 
                  </td>
                </tr>

                {/* Penalty Section */}
                {penaltyText && (
                  <tr>
                    <td
                      colSpan={4}
                      className="border border-black p-2 md:p-3 text-center text-xs leading-relaxed font-bold"
                    >
                      {penaltyText}
                    </td>
                  </tr>
                )}

                {/* Note Section */}
                <tr>
                  <td className="border border-black p-1 md:p-2 font-bold text-right w-1/4">
                    ملاحظة
                  </td>
                  <td
                    colSpan={3}
                    className="border border-black p-1 md:p-2 text-right"
                  >
                    {invoice.note||""} 
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Ministry Text */}
          <div className="border border-black p-2 md:p-3 text-center text-xs md:text-sm bg-gray-50">
            تحت إشراف مكتب وزارة النقل بالوادي والصحراء
          </div>

          {/* Signature Area */}
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
    </div>
  );
}