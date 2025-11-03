import type { Invoice } from "./types"

/**
 * Generates a filled DOCX file from template by replacing placeholders
 * Uses a workaround approach suitable for client-side processing
 * For production with proper DOCX editing, consider:
 * - Using docxtemplater library (client-side)
 * - Using python-docx via backend API
 * - Using a dedicated DOCX API service
 */

export class DocxTemplate {
  /**
   * Create a mock DOCX file by converting invoice HTML to downloadable format
   * This is a temporary solution - in production, you would:
   * 1. Have an actual .docx template file stored
   * 2. Use docxtemplater or similar to fill placeholders
   * 3. Return the filled .docx blob
   */
  static async generateFilledDocx(invoice: Invoice, username: string): Promise<Blob> {
    // Create HTML representation that matches the DOCX format
    const html = this.generateInvoiceHTML(invoice, username)

    // Convert to DOCX using a simple approach
    // In production, use: new Docxtemplater(template).setData(...).render()
    // For now, we'll create a downloadable file with proper structure

    const docContent = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:r>
        <w:t>الجمهورية اليمنية - مكتب النقل وادي حضرموت</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>سند وزن حمولة مركبة</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>رقم السند: ${invoice.invoiceNumber}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>اسم السائق: ${invoice.driverName}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>نوع المركبة: ${invoice.vehicleType}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>رقم المركبة: ${invoice.vehicleNumber}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>الوزن المسموح به: ${invoice.allowedWeightTotal} طن</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>وزن الحمولة المسموح به: ${invoice.allowedLoadWeight} طن</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>الوزن الفارغ: ${invoice.emptyWeight} طن</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>الوزن الزائد: ${invoice.overweight} طن</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>الرسوم: ${invoice.fee} ريال</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>الغرامة: ${invoice.penalty} ريال</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>الخصم: ${invoice.discount} ريال</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>المبلغ المستحق: ${invoice.payableAmount} ريال</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>المبلغ الصافي: ${invoice.netAmount} ريال</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>ميزان العبر: ${invoice.scaleName}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>اسم المستخدم: ${username}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`

    return new Blob([docContent], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
  }

  private static generateInvoiceHTML(invoice: Invoice, username: string): string {
    const dateStr = new Date(invoice.createdAt).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const formatCurrency = (amount: number) =>
      amount.toLocaleString("ar-YE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })

    return `
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body>
<h1 style="text-align: center;">الجمهورية اليمنية - مكتب النقل وادي حضرموت</h1>
<p style="text-align: center;">سند وزن حمولة مركبة</p>
<p style="text-align: center;"><strong>رقم السند: ${invoice.invoiceNumber}</strong></p>
<table border="1" cellpadding="8" style="width: 100%;">
<tr><td><strong>ميزان العبر</strong></td><td>${invoice.scaleName}</td><td><strong>اسم السائق</strong></td><td>${invoice.driverName}</td></tr>
<tr><td><strong>التاريخ والوقت</strong></td><td>${dateStr}</td><td><strong>نوع المركبة</strong></td><td>${invoice.vehicleType}</td></tr>
<tr><td><strong>رقم المركبة</strong></td><td>${invoice.vehicleNumber}</td><td><strong>الوزن المسموح به كاملاً</strong></td><td>${invoice.allowedWeightTotal} طن</td></tr>
</table>
<table border="1" cellpadding="8" style="width: 100%;">
<tr><th>النسبة %</th><th>المبلغ</th><th>البيان</th></tr>
<tr><td>${invoice.payableAmount > 0 ? ((invoice.fee / invoice.payableAmount) * 100).toFixed(2) : "0"}%</td><td>${formatCurrency(invoice.fee)} ريال</td><td>الرسوم</td></tr>
<tr><td>${invoice.payableAmount > 0 ? ((invoice.penalty / invoice.payableAmount) * 100).toFixed(2) : "0"}%</td><td>${formatCurrency(invoice.penalty)} ريال</td><td>الغرامة</td></tr>
<tr><td>-</td><td>${formatCurrency(invoice.emptyWeight)} طن</td><td>الوزن الفارغ</td></tr>
<tr><td>${invoice.payableAmount > 0 ? ((invoice.discount / invoice.payableAmount) * 100).toFixed(2) : "0"}%</td><td>${formatCurrency(invoice.discount)} ريال</td><td>الخصم</td></tr>
<tr><td>-</td><td>${formatCurrency(invoice.overweight)} طن</td><td>الوزن الزائد</td></tr>
<tr style="background-color: #f0f0f0;"><td>100%</td><td><strong>${formatCurrency(invoice.payableAmount)} ريال</strong></td><td><strong>المبلغ المستحق</strong></td></tr>
<tr style="background-color: #f0f0f0;"><td>-</td><td><strong>${formatCurrency(invoice.netAmount)} ريال</strong></td><td><strong>المبلغ الصافي</strong></td></tr>
</table>
<p>اسم المستخدم: ${username}</p>
</body>
</html>
    `
  }
}
