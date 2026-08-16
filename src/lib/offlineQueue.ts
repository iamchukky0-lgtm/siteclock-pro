/**
 * Offline Clock Queue
 * Stores pending attendance records in localStorage when offline.
 */

const QUEUE_KEY = "siteclock_offline_queue"

export type QueuedRecord = {
  workerId: string
  pin?: string
  type: "in" | "out" | "absent"
  latitude?: number | null
  longitude?: number | null
  selfieUrl?: string | null
  siteId?: string | null
  local_id: string
  queued_at: string
  synced: boolean
}

export function getQueue(): QueuedRecord[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]")
  } catch {
    return []
  }
}

export function addToQueue(
  record: Omit<QueuedRecord, "local_id" | "queued_at" | "synced">
): QueuedRecord {
  const queue = getQueue()
  const entry: QueuedRecord = {
    ...record,
    local_id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    queued_at: new Date().toISOString(),
    synced: false,
  }
  queue.push(entry)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return entry
}

export function markSynced(localId: string) {
  const queue = getQueue().map((e) =>
    e.local_id === localId ? { ...e, synced: true } : e
  )
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function removeSynced() {
  const queue = getQueue().filter((e) => !e.synced)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function getPendingQueue(): QueuedRecord[] {
  return getQueue().filter((e) => !e.synced)
}

export function getPendingCount(): number {
  return getPendingQueue().length
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true
  return navigator.onLine
}
