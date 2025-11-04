// Form validation utilities
import type { InvoiceFormData } from "./types"

export interface ValidationError {
  field: string
  message: string
}

export class InvoiceValidator {
  static validateInvoiceData(data: Partial<InvoiceFormData>): ValidationError[] {
    const errors: ValidationError[] = []

    // Required fields
    if (!data.driverName?.trim()) {
      errors.push({ field: "driverName", message: "اسم السائق مطلوب" })
    }

    if (!data.vehicleType?.trim()) {
      errors.push({ field: "vehicleType", message: "نوع المركبة مطلوب" })
    }

    if (!data.vehicleNumber?.trim()) {
      errors.push({ field: "vehicleNumber", message: "رقم المركبة مطلوب" })
    }

    // Numeric validations
    if ((data.allowedWeightTotal || 0) <= 0) {
      errors.push({
        field: "allowedWeightTotal",
        message: "الوزن المسموح به يجب أن يكون أكبر من صفر",
      })
    }

    if (!data.axles?.trim()) {
      errors.push({
        field: "axles",
        message: "عدد المحاور مطلوب",
      })
    }

    if ((data.payableAmount || 0) < 0) {
      errors.push({
        field: "payableAmount",
        message: "المبلغ المستحق لا يمكن أن يكون سالباً",
      })
    }

    if ((data.netAmount || 0) < 0) {
      errors.push({
        field: "netAmount",
        message: "المبلغ الصافي لا يمكن أن يكون سالباً",
      })
    }

    // Financial consistency
    const expectedNet = (data.payableAmount || 0) - (data.discount || 0) + (data.penalty || 0)
    if (Math.abs(expectedNet - (data.netAmount || 0)) > 1) {
      errors.push({
        field: "netAmount",
        message: "المبلغ الصافي غير متطابق مع الحساب (المستحق - الخصم + الغرامة)",
      })
    }

    return errors
  }

  static validateDriverName(name: string): boolean {
    return name.trim().length > 0 && name.trim().length <= 100
  }

  static validateVehicleNumber(number: string): boolean {
    return number.trim().length > 0 && number.trim().length <= 50
  }

  static validateAmount(amount: number): boolean {
    return amount >= 0 && Number.isFinite(amount)
  }

  static validateWeight(weight: number): boolean {
    return weight > 0 && Number.isFinite(weight)
  }
}
