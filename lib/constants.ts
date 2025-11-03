// Application constants
export const APP_TITLE = "نظام فواتير النقل"
export const APP_SUBTITLE = "Wadi Hadhramawt Transport Invoice System"

export const INVOICE_FIELDS = {
  HEADER: "الجمهورية اليمنية - مكتب النقل وادي حضرموت",
  SCALE_NAME: "ميزان العبر",
  DRIVER_NAME: "اسم السائق",
  DATE_TIME: "التاريخ والوقت",
  VEHICLE_TYPE: "نوع المركبة",
  VEHICLE_NUMBER: "رقم المركبة",
  ALLOWED_WEIGHT: "الوزن المسموح به كاملاً",
  AXLES: "عدد المحاور",
  ALLOWED_LOAD: "وزن الحمولة المسموح به",
  FEE: "الرسوم",
  PENALTY: "الغرامة",
  EMPTY_WEIGHT: "الوزن الفارغ",
  DISCOUNT: "الخصم",
  OVERWEIGHT: "الوزن الزائد",
  TYPE: "النوع",
  ROUTE: "القارة (خط السير)",
  PAYABLE_AMOUNT: "المبلغ المستحق",
  NET_AMOUNT: "المبلغ الصافي",
  NOTE: "ملاحظة",
} as const

export const PENALTY_TEXT = `غراسة (10000) ريال على كل طن زائد فوق الوزن المسموح به قابل للمضاعفة في حالة تجاوز الوزن الزائد 30% من وزن الحمولة المسموح به وفقاً للمركبة أو السائق أو السائق والمركبة معاً`

export const MINISTRY_TEXT = "تحت إشراف مكتب وزارة النقل بالوادي والصحراء"

export const DEFAULT_SETTINGS = {
  username: "خالد صالح الديني",
  defaultScale: "ميزان العبر",
  invoiceNumberFormat: "TRN",
} as const
