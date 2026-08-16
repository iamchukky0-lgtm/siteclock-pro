"use client"

import { useEffect, useCallback, useState } from "react"
import {
  getPendingQueue,
  markSynced,
  removeSynced,
  getPendingCount,
} from "@/lib/offlineQueue"
import { attendanceApi } from "@/lib/api"

export function useOfflineSync(onSyncComplete?: () => void) {
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  const refreshCount = useCallback(() => {
    setPendingCount(getPendingCount())
  }, [])

  const syncNow = useCallback(async () => {
    const pending = getPendingQueue()
    if (pending.length === 0) return

    setIsSyncing(true)
    for (const entry of pending) {
      try {
        const { local_id, queued_at, synced, ...record } = entry
        await attendanceApi.create(record)
        markSynced(local_id)
      } catch (err) {
        console.warn("Offline sync failed for", entry.local_id, err)
        // Leave in queue to retry
      }
    }
    removeSynced()
    const remaining = getPendingCount()
    setPendingCount(remaining)
    setIsSyncing(false)
    if (remaining === 0 && onSyncComplete) onSyncComplete()
  }, [onSyncComplete])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    refreshCount()

    const handleOnline = () => {
      setIsOnline(true)
      refreshCount()
      syncNow()
    }
    const handleOffline = () => {
      setIsOnline(false)
      refreshCount()
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    if (navigator.onLine) syncNow()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [syncNow, refreshCount])

  return { pendingCount, isSyncing, isOnline, syncNow, refreshCount }
}
