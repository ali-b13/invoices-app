"use client";

import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
  TextRun,
  Packer,
  WidthType,
} from "docx";
import type { Invoice } from "@/lib/types";

type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export class DocxGenerator {
  static createInvoiceDocument(
    invoice: Invoice,
    collectorName: string
  ): Document {
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

    // Generate penalty text similar to your React component
    const penaltyText =
      invoice.overweight > 0
        ? `غرامة (10000) ريال على كل طن زائد فوق الوزن المسموح به قابل للمضاعفة في حالة تجاوز الوزن الزائد من وزن الحمولة المسموح به وفقاً للمركبة أو السائق أو السائق والمركبة معاً`
        : "";

    const borderStyle = {
      top: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
      bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
      left: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
      right: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
    };

    const noBorderStyle = {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    };
    const createStyledCell = (
      text: string,
      isBold: boolean = false,
      alignment: Align = AlignmentType.CENTER,
      colSpan?: number,
      hasBorder: boolean = true
    ) => {
      return new TableCell({
        children: [
          new Paragraph({
            alignment: alignment,
            children: [
              new TextRun({
                text: text,
                bold: isBold,
                rightToLeft: true,
                color: "00008B",
                size: 20,
              }),
            ],
          }),
        ],
        borders: hasBorder ? borderStyle : noBorderStyle,
        verticalAlign: VerticalAlign.CENTER,
        columnSpan: colSpan,
        shading: { type: "clear", fill: "FFFFFF" },
        margins: {
          top: 80, // space above text
          bottom: 80, // space below text
          left: 80, // space from left border
          right: 80, // space from right border
        },
      });
    };

    // Header Section - Always Centered
    const headerTable = new Table({
      alignment: AlignmentType.CENTER, // Ensures entire table is centered in the document
      width: { size: 100, type: WidthType.PERCENTAGE }, // Full width for safety
      rows: [
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 4,
              verticalAlign: VerticalAlign.CENTER,
              borders: borderStyle,
              shading: { type: "clear", fill: "FFFFFF" },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER, // text centered horizontally
                  children: [
                    new TextRun({
                      text: "الجمهورية اليمنية - مكتب النقل وادي حضرموت",
                      bold: true,
                      size: 22,
                      rightToLeft: true,
                      color: "00008B",
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "ميزان العبر",
                      bold: true,
                      size: 20,
                      rightToLeft: true,
                      color: "00008B",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    const mainTableRows = [
      new TableRow({
        children: [
          createStyledCell("رقم السند", true, AlignmentType.RIGHT),
          createStyledCell(invoice.invoiceNumber?.toString() || ""),
          createStyledCell("التاريخ والوقت", true, AlignmentType.RIGHT),
          createStyledCell(formatArabicDate(invoice.createdAt)),
        ],
      }),
      // Row 2
      new TableRow({
        children: [
          createStyledCell("اسم السائق", true, AlignmentType.RIGHT),
          createStyledCell(invoice.driverName || ""),
          createStyledCell("رقم المركبة", true, AlignmentType.RIGHT),
          createStyledCell(invoice.vehicleNumber || ""),
        ],
      }),
      // Row 3
      new TableRow({
        children: [
          createStyledCell("نوع المركبة", true, AlignmentType.RIGHT),
          createStyledCell(invoice.vehicleType || ""),
          createStyledCell("عدد المحاور", true, AlignmentType.RIGHT),
          createStyledCell(invoice.axles?.toString() || ""),
        ],
      }),
      // Row 4
      new TableRow({
        children: [
          createStyledCell(
            "الوزن المسموح به كاملاً",
            true,
            AlignmentType.RIGHT
          ),
          createStyledCell(`${invoice.allowedWeightTotal} ${invoice.allowedLoadWeightUnit}`),
          createStyledCell("وزن الحمولة المسموح به", true, AlignmentType.RIGHT),
          createStyledCell(`${invoice.allowedLoadWeight} ${invoice.allowedLoadWeightUnit}`),
        ],
      }),
      // Row 5
      new TableRow({
        children: [
          createStyledCell("الرسوم", true, AlignmentType.RIGHT),
          createStyledCell(`${formatCurrency(invoice.fee)} ريال`),
          createStyledCell("الوزن الفعلي", true, AlignmentType.RIGHT),
          createStyledCell(`${invoice.emptyWeight} ${invoice.allowedLoadWeightUnit}`),
        ],
      }),
      // Row 6
      new TableRow({
        children: [
          createStyledCell("الغرامة", true, AlignmentType.RIGHT),
          createStyledCell(`${formatCurrency(invoice.penalty)} ريال`),
          createStyledCell("الوزن الزائد", true, AlignmentType.RIGHT),
          createStyledCell(`${invoice.overweight} ${invoice.allowedLoadWeightUnit}`),
        ],
      }),
      // Row 7
      new TableRow({
        children: [
          createStyledCell("الخصم", true, AlignmentType.RIGHT),
          createStyledCell(`${formatCurrency(invoice.discount)} ريال`),
          createStyledCell("المبلغ المستحق", true, AlignmentType.RIGHT),
          createStyledCell(`${formatCurrency(invoice.payableAmount)} ريال`),
        ],
      }),
      // Row 8
      new TableRow({
        children: [
          createStyledCell("النوع", true, AlignmentType.RIGHT),
          createStyledCell(invoice.type || ""),
          createStyledCell("المبلغ الصافي", true, AlignmentType.RIGHT),
          createStyledCell(`${formatCurrency(invoice.netAmount)} ريال`),
        ],
      }),
    ];

    // Add penalty row if needed
    // Add penalty row if needed
    if (penaltyText) {
      mainTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: penaltyText,
                      bold: false,
                      size: 18,
                      rightToLeft: true,
                      color: "00008B",
                    }),
                  ],
                }),
              ],
              columnSpan: 4,
              borders: borderStyle,
              verticalAlign: VerticalAlign.CENTER,
              shading: {
                type: "clear",
                fill: "FFFFFF",
              },
            }),
          ],
        })
      );
    }

    // Add note row if needed
    if (invoice.note) {
      mainTableRows.push(
        new TableRow({
          children: [
            createStyledCell("ملاحظة", true, AlignmentType.RIGHT),
            new TableCell({
              margins: { top: 80, bottom: 80, left: 80, right: 80 }, // added margins
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: invoice.note,
                      rightToLeft: true,
                      color: "00008B",
                      size: 20,
                    }),
                  ],
                }),
              ],
              columnSpan: 3,
              borders: borderStyle,
              verticalAlign: VerticalAlign.CENTER,
              shading: {
                type: "clear",
                fill: "FFFFFF",
              },
            }),
          ],
        })
      );
    }

    const mainTable = new Table({
      rows: mainTableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: true,
    });

    // Ministry Text Section
    const ministryTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              margins: { top: 80, bottom: 80, left: 80, right: 80 },

              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "تحت إشراف مكتب وزارة النقل بالوادي والصحراء",
                      size: 20,
                      rightToLeft: true,
                      color: "00008B",
                    }),
                  ],
                }),
              ],
              borders: borderStyle,
              shading: {
                type: "clear",
                fill: "F8F9FA",
              },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const signatureTable = new Table({
      visuallyRightToLeft: true,
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        // First row: Labels
        new TableRow({
          children: ["اسم المستخدم", "التوقيع", "الختم"].map(
            (label) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: label,
                        bold: true,
                        size: 20,
                        rightToLeft: true,
                        color: "00008B",
                      }),
                    ],
                  }),
                ],
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
                shading: { type: "clear", fill: "FFFFFF" },
              })
          ),
        }),
        // Second row: Values / Spaces
        new TableRow({
          children: [collectorName, "", ""].map(
            (value) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: value,
                        size: 18,
                        rightToLeft: true,
                        color: "00008B",
                      }),
                    ],
                  }),
                  ...Array(6).fill(new Paragraph({ text: "" })), // empty lines for spacing
                ],
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
                shading: { type: "clear", fill: "FFFFFF" },
              })
          ),
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    return new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 500,
                right: 500,
                bottom: 500,
                left: 500,
              },
            },
          },
          children: [
            headerTable,
            new Paragraph({ text: "" }),
            mainTable,
            new Paragraph({ text: "" }),
            ministryTable,
            new Paragraph({ text: "" }),
            signatureTable,
          ],
        },
      ],
    });
  }

  static async downloadInvoiceAsDocx(
    invoice: Invoice,
    collectorName: string
  ): Promise<void> {
    try {
      const doc = DocxGenerator.createInvoiceDocument(invoice, collectorName);
      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `فاتورة-${invoice.invoiceNumber}.docx`);
    } catch (error) {
      console.error("Error downloading DOCX:", error);
      throw error;
    }
  }
}
