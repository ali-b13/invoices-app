// Printer service for multi-platform printing support
import type { Invoice } from "./types"
import { PDFGenerator } from "./pdf-generator"

export class PrinterService {
  /**
   * Web printing via browser print dialog
   */
  static async printViaWeb(invoice: Invoice): Promise<void> {
    try {
       const pdfBytes = new Uint8Array(await PDFGenerator.generateInvoicePDF(invoice));      
      // Convert Uint8Array to Blob properly
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)

      // Create invisible iframe for printing
      const iframe = document.createElement("iframe")
      iframe.style.display = "none"
      iframe.src = url
      document.body.appendChild(iframe)

      // Wait for iframe to load before printing
      iframe.onload = () => {
        try {
          iframe.contentWindow?.print()
        } catch (error) {
          console.error("Print error:", error)
        }
      }

      // Cleanup after a delay
      setTimeout(() => {
        document.body.removeChild(iframe)
        URL.revokeObjectURL(url)
      }, 3000)
    } catch (error) {
      console.error("Failed to print via web:", error)
      throw new Error("فشل في الطباعة عبر المتصفح")
    }
  }

  /**
   * Print to PDF file
   */
  static async downloadAsPDF(invoice: Invoice): Promise<void> {
    try {
       await PDFGenerator.downloadInvoiceAsPDF(invoice,)
      
    } catch (error) {
      console.error("Failed to download PDF:", error)
      throw new Error("فشل في تحميل الفاتورة")
    }
  }

  /**
   * Check if device supports native printing (mobile)
   */
  static supportsNativePrinting(): boolean {
    return (
      typeof window !== "undefined" &&
      ("print" in window || "print" in navigator || navigator.userAgent.toLowerCase().includes("mobile"))
    )
  }
  

  /**
   * Get printer-friendly invoice HTML (updated to match the template exactly)
   */
  static getInvoiceHTML(invoice: Invoice, username: string = "خالد صالح الديني"): string {
  const formatArabicDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-YE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  const penaltyText = `غرامة (10000) ريال على كل طن زائد فوق الوزن المسموح به قابل للمضاعفة في حالة تجاوز الوزن الزائد من وزن الحمولة المسموح به وفقاً للمركبة أو السائق أو السائق والمركبة معاً`

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>فاتورة ${invoice.invoiceNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }
        body {
          font-family: "Arial", "Segoe UI", sans-serif;
          direction: rtl;
          font-size: 12px;
          line-height: 1.4;
          margin: 0;
          padding: 10px;
          color: #00008b;
        }
        .container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border: 1px solid #000;
          background-color: #f5f5f5;
          padding: 6px 0;
          margin-bottom: 10px;
        }
        .header h1 {
          font-size: 16px;
          margin-bottom: 3px;
          font-weight: bold;
        }
        .header p {
          font-size: 14px;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 5px 0;
          font-size: 11px;
        }
        td {
          border: 1px solid #000;
          padding: 4px 6px;
          vertical-align: middle;
        }
        .field-label {
          font-weight: bold;
          text-align: right;
          background-color: #f5f5f5;
          width: 25%;
        }
        .value {
          text-align: center;
          background-color: #f5f5f5;
          width: 25%;
        }
        .note-box {
          border: 1px solid #000;
          padding: 6px;
          margin: 8px 0;
          background-color: #f5f5f5;
          font-size: 10px;
        }
        .note-box strong {
          display: block;
          margin-bottom: 4px;
        }
        .penalty-box {
          border: 1px solid #000;
          padding: 8px;
          margin: 10px 0;
          text-align: center;
          font-size: 10px;
          background-color: #f5f5f5;
          line-height: 1.5;
          font-weight: bold;
        }
        .ministry-box {
          border: 1px solid #000;
          padding: 6px;
          margin: 8px 0;
          text-align: center;
          background-color: #f5f5f5;
          font-size: 10px;
          font-weight: bold;
        }
        .signature-area {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-top: 25px;
          text-align: center;
          font-size: 10px;
        }
        .signature-item {
          background-color: #f5f5f5;
          border: 1px solid #000;
          padding: 6px;
        }
        .signature-label {
          font-weight: bold;
          margin-bottom: 35px;
        }
        .signature-line {
          border-top: 1px solid #000;
          margin-top: 35px;
          padding-top: 3px;
        }
        @media print {
          body {
            margin: 0;
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>الجمهورية اليمنية - مكتب النقل والنقل وادي حضرموت</h1>
          <p>ميزان العبر</p>
        </div>

        <!-- Note Section -->
        ${
          invoice.note
            ? `
        <div class="note-box">
          <strong>ملاحظة:</strong>
          <span>${invoice.note}</span>
        </div>
        `
            : ""
        }

        <!-- Main Invoice Table -->
        <table>
          <tbody>
            <tr>
              <td class="field-label">رقم السند</td>
              <td class="value">${invoice.invoiceNumber}</td>
              <td class="field-label">التاريخ والوقت</td>
              <td class="value">${formatArabicDate(invoice.createdAt)}</td>
            </tr>
            <tr>
              <td class="field-label">اسم السائق</td>
              <td class="value">${invoice.driverName}</td>
              <td class="field-label">رقم المركبة</td>
              <td class="value">${invoice.vehicleNumber}</td>
            </tr>
            <tr>
              <td class="field-label">نوع المركبة</td>
              <td class="value">${invoice.vehicleType}</td>
              <td class="field-label">عدد المحاور</td>
              <td class="value">${invoice.axles}</td>
            </tr>
            <tr>
              <td class="field-label">الوزن المسموح به كاملاً</td>
              <td class="value">${invoice.allowedWeightTotal} طن</td>
              <td class="field-label">وزن الحمولة المسموح به</td>
              <td class="value">${invoice.allowedLoadWeight} طن</td>
            </tr>
            <tr>
              <td class="field-label">الرسوم</td>
              <td class="value">${formatCurrency(invoice.fee)} ريال</td>
              <td class="field-label">الوزن الفعلي</td>
              <td class="value">${invoice.emptyWeight} طن</td>
            </tr>
            <tr>
              <td class="field-label">الغرامة</td>
              <td class="value">${formatCurrency(invoice.penalty)} ريال</td>
              <td class="field-label">الوزن الزائد</td>
              <td class="value">${invoice.overweight} طن</td>
            </tr>
            <tr>
              <td class="field-label">الخصم</td>
              <td class="value">${formatCurrency(invoice.discount)} ريال</td>
              <td class="field-label">المبلغ المستحق</td>
              <td class="value">${formatCurrency(invoice.payableAmount)} ريال</td>
            </tr>
            <tr>
              <td class="field-label">النوع</td>
              <td class="value">${invoice.type}</td>
              <td class="field-label">المبلغ الصافي</td>
              <td class="value">${formatCurrency(invoice.netAmount)} ريال</td>
            </tr>
          </tbody>
        </table>

        <!-- Penalty Text -->
        <div class="penalty-box">
          ${penaltyText}
        </div>

        <!-- Ministry Box -->
        <div class="ministry-box">
          تحت إشراف مكتب وزارة النقل بالوادي والصحراء
        </div>

        <!-- Signature Section -->
        <div class="signature-area">
          <div class="signature-item">
            <div class="signature-label">الختم</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-item">
            <div class="signature-label">التوقيع</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-item">
            <div class="signature-label">اسم المستخدم</div>
            <div>${username}</div>
            <div class="signature-line"></div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

  /**
   * Print using HTML method (alternative to PDF)
   */
  static async printViaHTML(invoice: Invoice, username: string = "خالد صالح الديني"): Promise<void> {
    try {
      const htmlContent = this.getInvoiceHTML(invoice, username)
      
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (!printWindow) {
        throw new Error("تعذر فتح نافذة الطباعة")
      }

      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
        // Don't close immediately - wait for print dialog
        setTimeout(() => {
          printWindow.close()
        }, 500)
      }
    } catch (error) {
      console.error("Failed to print via HTML:", error)
      throw new Error("فشل في الطباعة")
    }
  }
}