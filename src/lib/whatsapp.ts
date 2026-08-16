/**
 * WhatsApp helpers — uses wa.me links (free, opens WhatsApp with pre-filled message)
 */

/** Normalize SA phone to +27... */
export function normalizeSAPhone(phone: string | null | undefined): string {
  if (!phone) return ""
  let p = phone.replace(/\s+/g, "").replace(/\D/g, "")
  if (p.startsWith("27")) return "+" + p
  if (p.startsWith("0")) return "+27" + p.slice(1)
  if (!p.startsWith("+") && p.length >= 9) return "+27" + p
  return p.startsWith("+") ? p : ""
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizeSAPhone(phone)
  const digits = normalized.replace(/\+/g, "")
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function openWhatsApp(phone: string, message: string) {
  const url = buildWhatsAppUrl(phone, message)
  if (typeof window !== "undefined") {
    window.open(url, "_blank")
  }
  return url
}

export function buildAbsentMessage(
  workerName: string,
  reason: string,
  siteName: string | null | undefined,
  date: string
): string {
  return `🚨 SiteClock Pro — Absence Alert

Worker: ${workerName}
Site: ${siteName || "N/A"}
Date: ${date}
Reason: ${reason}

Please follow up if needed.`
}

export function buildNoShowMessage(
  workerName: string,
  siteName: string | null | undefined
): string {
  return `🚨 SiteClock Pro — No-Show

${workerName} has not clocked in today${
    siteName ? ` at ${siteName}` : ""
  }.

Please check.`
}
