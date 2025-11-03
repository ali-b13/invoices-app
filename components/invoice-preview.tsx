"use client";
import type { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Printer, Download, FileText, Edit } from "lucide-react";
import { useState } from "react";
import { UserStorage } from "@/lib/user-storage";

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
  const currentUser = UserStorage.getCurrentUser();
  const collectorName = currentUser?.name || "Unknown";
  const penaltyText = `غراسة (10000) ريال على كل طن زائد فوق الوزن المسموح به قابل للمضاعفة في حالة تجاوز الوزن الزائد 30% من وزن الحمولة المسموح به وفقاً للمركبة أو السائق أو السائق والمركبة معاً`;

  const formatArabicDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-YE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleDownload = async (format: "docx" | "pdf") => {
    setIsDownloading(true);
    setDownloadFormat(format);
    try {
      if (format === "pdf") {
        const { PDFGenerator } = await import("@/lib/pdf-generator");
        await PDFGenerator.downloadInvoiceAsPDF(invoice);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">عرض الفاتورة</h2>
        </div>

        <div className="flex gap-2 flex-wrap">
    
          <Button
            onClick={onPrint}
            className="gap-2 bg-transparent"
            variant="outline"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">طباعة</span>
          </Button>
          <Button
            onClick={() => handleDownload("pdf")}
            disabled={isDownloading && downloadFormat === "pdf"}
            className="gap-2"
            variant="outline"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isDownloading && downloadFormat === "pdf"
                ? "جاري..."
                : "تحميل PDF"}
            </span>
          </Button>
          <Button
            onClick={() => handleDownload("docx")}
            disabled={isDownloading && downloadFormat === "docx"}
            className="gap-2"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isDownloading && downloadFormat === "docx"
                ? "جاري..."
                : "تحميل DOCX"}
            </span>
          </Button>
        </div>
      </div>

      <Card className="p-8 bg-white text-blue-900 font-extrabold">
        <div className="space-y-4">
          {/* Header - Exactly like template */}
          <div className="text-center">
            <h1 className="text-lg font-bold mb-1">
              الجمهورية اليمنية - مكتب النقل وادي حضرموت
            </h1>
            <p className="text-base font-bold">ميزان العبر</p>
          </div>

          {/* Main Data Table - 2 columns layout exactly like template */}
          <table className="w-full border-collapse border border-black text-sm">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-bold text-right w-1/4">
                  رقم المنتج
                </td>
                <td className="border border-black p-2 text-center w-1/4">
                  {invoice.invoiceNumber}
                </td>
                <td className="border border-black p-2 font-bold text-right w-1/4">
                  التاريخ والوقت
                </td>
                <td className="border border-black p-2 text-center w-1/4">
                  {formatArabicDate(invoice.createdAt)}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold text-right">
                  اسم السائق
                </td>
                <td className="border border-black p-2 text-center">
                  {invoice.driverName}
                </td>
                <td className="border border-black p-2 font-bold text-right">
                  رقم المركبة
                </td>
                <td className="border border-black p-2 text-center">
                  {invoice.vehicleNumber}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold text-right">
                  نوع المركبة
                </td>
                <td className="border border-black p-2 text-center">
                  {invoice.vehicleType}
                </td>
                <td className="border border-black p-2 font-bold text-right">
                  عدد المحاور
                </td>
                <td className="border border-black p-2 text-center">
                  {invoice.axles}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold text-right">
                  الوزن المسموح به كاملاً
                </td>
                <td className="border border-black p-2 text-center">
                  {invoice.allowedWeightTotal} طن
                </td>
                <td className="border border-black p-2 font-bold text-right">
                  وزن الحمولة المسموح به
                </td>
                <td className="border border-black p-2 text-center">
                  {invoice.allowedLoadWeight} طن
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold text-right">
                  الرسوم
                </td>
                <td className="border border-black p-2 text-center">
                  {formatCurrency(invoice.fee)} ريال
                </td>
                <td className="border border-black p-2 font-bold text-right">
                  الوزن الفعلي
                </td>
                <td className="border border-black p-2 text-center">
                  {invoice.emptyWeight} طن
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold text-right">
                  الغرامة
                </td>
                <td className="border border-black p-2 text-center">
                  {formatCurrency(invoice.penalty)} ريال
                </td>
                <td className="border border-black p-2 font-bold text-right">
                  الوزن الزائد
                </td>
                <td className="border border-black p-2 text-center">
                  {invoice.overweight} طن
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold text-right">
                  الخصم
                </td>
                <td className="border border-black p-2 text-center">
                  {formatCurrency(invoice.discount)} ريال
                </td>
                <td className="border border-black p-2 font-bold text-right">
                  المبلغ المستحق
                </td>
                <td className="border border-black p-2 text-center">
                  {formatCurrency(invoice.payableAmount)} ريال
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold text-right">
                  النوع
                </td>
                <td className="border border-black p-2 text-center">
                  {invoice.type}
                </td>
                <td className="border border-black p-2 font-bold text-right">
                  المبلغ الصافي
                </td>
                <td className="border border-black p-2 text-center">
                  {formatCurrency(invoice.netAmount)} ريال
                </td>
              </tr>

              {/* ✅ Penalty Section - full width cell */}
              {penaltyText && (
                <tr>
                  <td
                    colSpan={4}
                    className="border border-black p-3 text-center text-xs leading-relaxed font-bold"
                  >
                    {penaltyText}
                  </td>
                </tr>
              )}

              {/* ✅ Note Section - label + text side by side */}
              {invoice.note && (
                <tr>
                  <td className="border border-black p-2 font-bold text-right w-1/4">
                    ملاحظة
                  </td>
                  <td
                    colSpan={3}
                    className="border border-black p-2 text-right"
                  >
                    {invoice.note}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Ministry Text - Exactly like template */}
          <div className="border border-black p-3 text-center text-sm bg-gray-50">
            تحت إشراف مكتب وزارة النقل بالوادي والصحراء
          </div>

          {/* Signature Area - Exactly like template */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="text-sm font-bold mb-1">اسم المستخدم</p>
              <p className="text-xs mb-10">{collectorName}</p>
            </div>

            <div className="text-center">
              <p className="text-sm font-bold mb-12">التوقيع</p>
            </div>

            <div className="text-center">
              <p className="text-sm font-bold mb-12">الختم</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
