/**
 * Format currency with English numerals
 * Converts Arabic numerals to English
 */
export function formatCurrencyEN(amount: number): string {
    if(!amount ||amount==0)return "0.00 ريال"
  const amountNumber= amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return `${amountNumber} ريال`
}

/**
 * Format date with English numerals
 * Converts Arabic numerals to English
 */
export const formatDateTime = (date: string | Date) => {
  const d = typeof date === "string" ? new Date(date) : date

  const hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()

  const period = hours < 12 ? 'ص' : 'م'
  const formattedHours = hours % 12 || 12

  return ` ${day}-${month}-${year}  ${formattedHours}:${minutes}:${seconds} ${period}`
}
