"use client"

import { useState } from "react"
import type { Invoice } from "@/lib/types"
import { PrinterService } from "@/lib/printer-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer, AlertCircle } from "lucide-react"

interface PrintDialogProps {
  invoice: Invoice
  username: string
  onClose: () => void
}

export function PrintDialog({ invoice, username, onClose }: PrintDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDirectPrint = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await PrinterService.printViaWeb(invoice)
      setTimeout(onClose, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ في الطباعة")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await PrinterService.downloadAsPDF(invoice)
      setTimeout(onClose, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ في التحميل")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="bg-primary/10">
        <CardTitle className="text-right flex items-center gap-2">
          <Printer className="h-5 w-5" />
          خيارات الطباعة
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {error && (
          <div className="flex gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={handleDirectPrint} disabled={isLoading} className="w-full">
            {isLoading ? "جاري الطباعة..." : "طباعة مباشرة"}
          </Button>

          <Button onClick={handleDownloadPDF} disabled={isLoading} variant="outline" className="w-full bg-transparent">
            {isLoading ? "جاري التحميل..." : "تحميل كـ PDF"}
          </Button>

          <Button onClick={onClose} disabled={isLoading} variant="ghost" className="w-full">
            إلغاء
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
          <p>• الطباعة المباشرة: سيظهر حوار الطباعة من متصفحك</p>
          <p>• تحميل PDF: سيتم حفظ الفاتورة كملف PDF على جهازك</p>
        </div>
      </CardContent>
    </Card>
  )
}
