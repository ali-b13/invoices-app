import jsPDF from "jspdf"
import type { Invoice } from "./types"
import { amiriRegular } from "./fonts/amiriRegularBase64"
import { formatCurrencyEN, formatDateTime } from "./formatters"

export class PDFGenerator {
  static async generateInvoicePDF(invoice: Invoice): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      try {
        // Create new PDF document
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        })

        // Add Arabic font
        doc.addFileToVFS("Amiri-Regular.ttf", amiriRegular)
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal")
        doc.setFont("Amiri", "normal")

        const pageWidth = doc.internal.pageSize.getWidth()
        const margin = 15
        let yPosition = margin

        // Colors
        const darkBlue = [0, 0, 139] // #00008B
        const lightGray = [248, 249, 250] // #F8F9FA
        const borderBlue = [0, 0, 139] // Blue borders

        // ===== HEADER SECTION =====
        doc.setFontSize(16)
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2])

        const headerText1 = "الجمهورية اليمنية - مكتب النقل وادي حضرموت"
        const headerText2 = "ميزان العبر"

        const textWidth1 = doc.getTextWidth(headerText1)
        const textWidth2 = doc.getTextWidth(headerText2)

        // Draw header border - thin blue
        doc.setDrawColor(borderBlue[0], borderBlue[1], borderBlue[2])
        doc.setLineWidth(0.3)
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 15)

        // Fill background
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, "F")

        // Draw border again over fill
        doc.setDrawColor(borderBlue[0], borderBlue[1], borderBlue[2])
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 15)

        // Center text in header
        doc.text(headerText1, (pageWidth - textWidth1) / 2, yPosition + 6)
        doc.text(headerText2, (pageWidth - textWidth2) / 2, yPosition + 12)

        yPosition += 20

        // ===== MAIN DATA TABLE =====
        const colWidth = (pageWidth - 2 * margin) / 4
        const rowHeight = 8

        // Define all rows exactly like the template
        const rows = [
          // Row 1
          {
            rightLabel: "رقم السند",
            rightValue: invoice.invoiceNumber || "",
            leftLabel: "التاريخ والوقت",
            leftValue: formatDateTime(invoice.createdAt),
          },
          // Row 2
          {
            rightLabel: "اسم السائق",
            rightValue: invoice.driverName || "",
            leftLabel: "رقم المركبة",
            leftValue: invoice.vehicleNumber || "",
          },
          // Row 3
          {
            rightLabel: "نوع المركبة",
            rightValue: invoice.vehicleType || "",
            leftLabel: "عدد المحاور",
            leftValue: invoice.axles?.toString() || "",
          },
          // Row 4
          {
            rightLabel: "الوزن المسموح به كاملاً",
            rightValue: `${invoice.allowedWeightTotal}`,
            leftLabel: "وزن الحمولة المسموح به",
            leftValue: `${invoice.allowedLoadWeight}`,
          },
          // Row 5
          {
            rightLabel: "الرسوم",
            rightValue: `${this.formatCurrency(invoice.fee)} ريال`,
            leftLabel: "الوزن الفعلي",
            leftValue: `${invoice.emptyWeight}`,
          },
          // Row 6
          {
            rightLabel: "الغرامة",
            rightValue: `${this.formatCurrency(invoice.penalty)} ريال`,
            leftLabel: "الوزن الزائد",
            leftValue: `${invoice.overweight} `,
          },
          // Row 7
          {
            rightLabel: "الخصم",
            rightValue: `${this.formatCurrency(invoice.discount)} ريال`,
            leftLabel: "المبلغ المستحق",
            leftValue: `${this.formatCurrency(invoice.payableAmount)} ريال`,
          },
          // Row 8
          {
            rightLabel: "النوع",
            rightValue: invoice.type || "",
            leftLabel: "المبلغ الصافي",
            leftValue: `${this.formatCurrency(invoice.netAmount)} ريال`,
          },
        ]

        // Draw table manually with thin blue borders
        doc.setFontSize(10)

        rows.forEach((row, index) => {
          const rowY = yPosition + index * rowHeight

          // Draw cell borders - thin blue
          doc.setDrawColor(borderBlue[0], borderBlue[1], borderBlue[2])
          doc.setLineWidth(0.3)

          // Draw cells from right to left (RTL)
          doc.rect(pageWidth - margin - colWidth, rowY, colWidth, rowHeight) // Right label
          doc.rect(pageWidth - margin - colWidth * 2, rowY, colWidth, rowHeight) // Right value
          doc.rect(pageWidth - margin - colWidth * 3, rowY, colWidth, rowHeight) // Left label
          doc.rect(pageWidth - margin - colWidth * 4, rowY, colWidth, rowHeight) // Left value

          // Draw text - RTL alignment
          doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2])

          // Right label (bold equivalent) - rightmost cell
          doc.setFontSize(10)
          doc.text(row.rightLabel, pageWidth - margin - 2, rowY + 5, { align: "right" })

          // Right value - second from right
          doc.setFontSize(10)
          doc.text(row.rightValue, pageWidth - margin - colWidth - colWidth / 2, rowY + 5, { align: "center" })

          // Left label (bold equivalent) - third from right
          doc.setFontSize(10)
          doc.text(row.leftLabel, pageWidth - margin - colWidth * 2 - 2, rowY + 5, { align: "right" })

          // Left value - leftmost cell
          doc.setFontSize(10)
          doc.text(row.leftValue, pageWidth - margin - colWidth * 3 - colWidth / 2, rowY + 5, { align: "center" })
        })

        yPosition += rows.length * rowHeight + 5

        // ===== PENALTY TEXT =====
        doc.setDrawColor(borderBlue[0], borderBlue[1], borderBlue[2])
        doc.setLineWidth(0.3)
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 12)

        doc.setFontSize(8)
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2])

        // Split penalty text to fit better
        const penaltyLine1 = "غرامة (10000) ريال على كل طن زائد فوق الوزن المسموح به قابل للمضاعفة"
        const penaltyLine2 =
          "في حالة تجاوز الوزن الزائد 30% من وزن الحمولة المسموح به وفقاً للمركبة أو السائق أو السائق والمركبة معاً"

        const line1Width = doc.getTextWidth(penaltyLine1)
        const line2Width = doc.getTextWidth(penaltyLine2)

        doc.text(penaltyLine1, (pageWidth - line1Width) / 2, yPosition + 4)
        doc.text(penaltyLine2, (pageWidth - line2Width) / 2, yPosition + 8)

        yPosition += 15

        // ===== NOTE SECTION =====
        // Calculate title width based on text
        const noteTitle = "ملاحظة"
        doc.setFontSize(10)
        const titleWidth = doc.getTextWidth(noteTitle) + 8 // Add padding
        
        // Note value takes the remaining space
        const noteValueWidth = pageWidth - 2 * margin - titleWidth
        
        // Draw the two separate boxes
        doc.setDrawColor(borderBlue[0], borderBlue[1], borderBlue[2])
        doc.setLineWidth(0.3)
        
        // Title box (fixed width based on text)
        doc.rect(pageWidth - margin - titleWidth, yPosition, titleWidth, 10)
        
        // Value box (takes remaining space)
        doc.rect(margin, yPosition, noteValueWidth, 10)

        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2])

        // Draw title in title box (centered)
        doc.setFontSize(10)
        doc.text(noteTitle, pageWidth - margin - titleWidth / 2, yPosition + 6, { align: "center" })

        // Draw note text in value box (right-aligned with padding)
        let noteText = invoice.note || ""
        const maxNoteWidth = noteValueWidth - 10 // Padding
        
        // Handle long text by splitting into multiple lines
        if (noteText) {
          const lines = this.splitTextIntoLines(doc, noteText, maxNoteWidth)
          const lineHeight = 4
          const startY = yPosition + 4
          
          lines.forEach((line, index) => {
            if (index * lineHeight < 10) { // Ensure it fits in the box
              doc.text(line, pageWidth - margin - titleWidth - 5, startY + (index * lineHeight), { align: "right" })
            }
          })
        } else {
          // Empty note
          doc.text("", pageWidth - margin - titleWidth - 5, yPosition + 6, { align: "right" })
        }

        yPosition += 12

        // ===== MINISTRY TEXT =====
        doc.setDrawColor(borderBlue[0], borderBlue[1], borderBlue[2])
        doc.setLineWidth(0.3)
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 10)

        // Fill with light gray background
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, "F")

        // Draw border again
        doc.setDrawColor(borderBlue[0], borderBlue[1], borderBlue[2])
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 10)

        doc.setFontSize(10)
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2])
        const ministryText = "تحت إشراف مكتب وزارة النقل بالوادي والصحراء"
        const ministryWidth = doc.getTextWidth(ministryText)
        doc.text(ministryText, (pageWidth - ministryWidth) / 2, yPosition + 6)

        yPosition += 15

        // ===== SIGNATURE SECTION =====
        const collectorName = "خالد صالح الديني"

        const sigColWidth = (pageWidth - 2 * margin) / 3

        // Signature labels (first row) - RTL order
        doc.setFontSize(10)
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2])

        // Draw labels in RTL order: اسم المستخدم, التوقيع, الختم
        doc.text("اسم المستخدم", pageWidth - margin - sigColWidth / 2, yPosition + 5, { align: "center" })
        doc.text("التوقيع", pageWidth - margin - sigColWidth - sigColWidth / 2, yPosition + 5, { align: "center" })
        doc.text("الختم", pageWidth - margin - sigColWidth * 2 - sigColWidth / 2, yPosition + 5, { align: "center" })

        yPosition += 8

        // Draw signature areas with empty space (second row) - RTL order
        doc.text(collectorName, pageWidth - margin - sigColWidth / 2, yPosition + 5, { align: "center" })
        doc.text("", pageWidth - margin - sigColWidth - sigColWidth / 2, yPosition + 5, { align: "center" })
        doc.text("", pageWidth - margin - sigColWidth * 2 - sigColWidth / 2, yPosition + 5, { align: "center" })

        // Add some empty lines for signature space
        for (let i = 0; i < 4; i++) {
          yPosition += 3
          doc.text("", pageWidth - margin - sigColWidth / 2, yPosition, { align: "center" })
          doc.text("", pageWidth - margin - sigColWidth - sigColWidth / 2, yPosition, { align: "center" })
          doc.text("", pageWidth - margin - sigColWidth * 2 - sigColWidth / 2, yPosition, { align: "center" })
        }

        // Convert to Uint8Array
        const pdfBytes = doc.output("arraybuffer")
        resolve(new Uint8Array(pdfBytes))
      } catch (error) {
        console.error("PDF generation error:", error)
        reject(error)
      }
    })
  }

  /**
   * Split text into multiple lines to fit within maxWidth
   */
  private static splitTextIntoLines(doc: jsPDF, text: string, maxWidth: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = words[0]

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const width = doc.getTextWidth(currentLine + ' ' + word)
      
      if (width < maxWidth) {
        currentLine += ' ' + word
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    
    lines.push(currentLine)
    return lines
  }

  private static formatCurrency(amount: number): string {
    if(!amount || amount==0) return "0.00"
    return amount.toLocaleString("ar-YE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  static async downloadInvoiceAsPDF(invoice: Invoice): Promise<void> {
    try {
      const pdfBytes: Uint8Array = await this.generateInvoicePDF(invoice)
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })
      const url: string = URL.createObjectURL(blob)
      const link: HTMLAnchorElement = document.createElement("a")
      link.href = url
      link.download = `فاتورة-${invoice.invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error: unknown) {
      console.error("[v0] PDF download failed:", error)
      throw error
    }
  }
}