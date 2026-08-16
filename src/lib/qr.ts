/**
 * QR utilities for SiteClock Pro
 * QR content format: SITECLOCK:WORKER_ID
 */

export function workerQrValue(workerId: string): string {
  return `SITECLOCK:${workerId}`
}

export function parseWorkerQr(raw: string): string | null {
  const text = raw.trim()
  if (text.startsWith("SITECLOCK:")) {
    return text.replace("SITECLOCK:", "").trim() || null
  }
  // Also accept plain worker ID
  if (/^[A-Za-z0-9\-_]{2,20}$/.test(text)) {
    return text.toUpperCase()
  }
  return null
}
