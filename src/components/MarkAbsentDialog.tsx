"use client"

import { useState, useEffect } from "react"
import { attendanceApi, adminsApi, sitesApi } from "@/lib/api"
import {
  buildAbsentMessage,
  openWhatsApp,
  normalizeSAPhone,
} from "@/lib/whatsapp"

const REASONS = ["Sick", "Unpaid Leave", "No-Show", "Other"] as const

type Worker = {
  workerId: string
  fullName: string
  siteId?: string | null
}

type Props = {
  workers: Worker[]
  onClose: () => void
  onSaved: () => void
}

export default function MarkAbsentDialog({ workers, onClose, onSaved }: Props) {
  const [workerId, setWorkerId] = useState("")
  const [reason, setReason] = useState<string>("Sick")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [notifyTargets, setNotifyTargets] = useState<
    { name: string; phone: string }[]
  >([])
  const [message, setMessage] = useState("")
  const [sites, setSites] = useState<any[]>([])

  useEffect(() => {
    sitesApi.list({ all: true }).then(setSites).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!workerId) {
      setError("Select a worker")
      return
    }
    setSaving(true)
    setError("")
    try {
      const worker = workers.find((w) => w.workerId === workerId)
      await attendanceApi.create({
        workerId,
        type: "absent",
        absenceReason: reason,
        overrideNote: note || undefined,
        status: "absent",
        siteId: worker?.siteId || undefined,
      })

      // Build WhatsApp message
      const site = sites.find((s) => s.id === worker?.siteId)
      const dateStr = new Date().toLocaleDateString("en-ZA")
      const msg = buildAbsentMessage(
        worker?.fullName || workerId,
        reason + (note ? ` — ${note}` : ""),
        site?.siteName,
        dateStr
      )
      setMessage(msg)

      // Collect people to notify: admins with phones
      // Prefer site-enabled WhatsApp; still allow manual notify either way
      try {
        const admins = await adminsApi.list()
        const targets = admins
          .filter((a: any) => a.isActive !== false && normalizeSAPhone(a.phoneNumber))
          .filter((a: any) => {
            if (a.isGlobalAdmin || a.isPayrollManager) return true
            if (!worker?.siteId) return true
            const ids = a.assignedSiteIds || []
            return ids.includes(worker.siteId)
          })
          .map((a: any) => ({
            name: a.fullName,
            phone: a.phoneNumber,
          }))
        setNotifyTargets(targets)
      } catch {
        setNotifyTargets([])
      }

      setDone(true)
      onSaved()
    } catch (err: any) {
      setError(err.message || "Failed to mark absent")
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
          <h2 className="text-lg font-bold text-emerald-400">Absence recorded</h2>
          <p className="text-sm text-slate-400">
            Optionally notify supervisors via WhatsApp:
          </p>

          {notifyTargets.length === 0 ? (
            <p className="text-sm text-slate-500">
              No admin phone numbers found. Add phone numbers under Team to enable
              quick WhatsApp notify.
            </p>
          ) : (
            <div className="space-y-2">
              {notifyTargets.map((t) => (
                <button
                  key={t.phone}
                  type="button"
                  onClick={() => openWhatsApp(t.phone, message)}
                  className="w-full flex items-center justify-between rounded-lg bg-emerald-900/40 border border-emerald-700 hover:bg-emerald-900/60 px-4 py-3 text-sm transition"
                >
                  <span className="text-emerald-200 font-medium">{t.name}</span>
                  <span className="text-emerald-400 text-xs">Open WhatsApp →</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 transition"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold">Mark Absent</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-200 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Worker *</label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              required
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select worker...</option>
              {workers.map((w) => (
                <option key={w.workerId} value={w.workerId}>
                  {w.fullName} ({w.workerId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Reason *</label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`py-2.5 rounded-lg text-sm font-medium transition ${
                    reason === r
                      ? "bg-orange-500 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Extra details..."
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 py-3 text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 transition"
            >
              {saving ? "Saving..." : "Mark Absent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
