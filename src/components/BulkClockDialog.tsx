"use client"

import { useState, useMemo } from "react"
import { attendanceApi } from "@/lib/api"

type Worker = {
  workerId: string
  fullName: string
  siteId?: string | null
  status?: string
}

type Props = {
  workers: Worker[]
  onClose: () => void
  onSaved: () => void
}

export default function BulkClockDialog({ workers, onClose, onSaved }: Props) {
  const activeWorkers = useMemo(
    () => workers.filter((w) => w.status !== "inactive"),
    [workers]
  )

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [type, setType] = useState<"in" | "out">("in")
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [results, setResults] = useState<{ ok: number; fail: number }>({
    ok: 0,
    fail: 0,
  })

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === activeWorkers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(activeWorkers.map((w) => w.workerId)))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selected.size === 0) {
      setError("Select at least one worker")
      return
    }

    setSaving(true)
    setError("")
    setProgress(0)
    let ok = 0
    let fail = 0
    const list = Array.from(selected)

    for (let i = 0; i < list.length; i++) {
      const workerId = list[i]
      const worker = activeWorkers.find((w) => w.workerId === workerId)
      try {
        await attendanceApi.create({
          workerId,
          type,
          status: "supervisor_override",
          overrideNote: "Bulk clock by supervisor",
          siteId: worker?.siteId || undefined,
        })
        ok++
      } catch {
        fail++
      }
      setProgress(i + 1)
    }

    setResults({ ok, fail })
    setDone(true)
    setSaving(false)
    if (ok > 0) onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-bold">Bulk Clock</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            ×
          </button>
        </div>

        {done ? (
          <div className="p-6 space-y-4 text-center">
            <p className="text-emerald-400 text-lg font-semibold">
              Done — {results.ok} succeeded
              {results.fail > 0 && (
                <span className="text-red-400">, {results.fail} failed</span>
              )}
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="bg-red-900/40 border border-red-700 text-red-200 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("in")}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                    type === "in"
                      ? "bg-orange-500 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Clock In
                </button>
                <button
                  type="button"
                  onClick={() => setType("out")}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition ${
                    type === "out"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Clock Out
                </button>
              </div>

              {/* Select all */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {selected.size} of {activeWorkers.length} selected
                </p>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm text-orange-400 hover:text-orange-300"
                >
                  {selected.size === activeWorkers.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              </div>

              {/* Worker list */}
              <div className="space-y-1 max-h-64 overflow-y-auto border border-slate-800 rounded-xl p-2">
                {activeWorkers.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">
                    No active workers
                  </p>
                ) : (
                  activeWorkers.map((w) => (
                    <label
                      key={w.workerId}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/60 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(w.workerId)}
                        onChange={() => toggle(w.workerId)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {w.fullName}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {w.workerId}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {saving && (
                <p className="text-sm text-slate-400 text-center">
                  Processing {progress} / {selected.size}...
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 rounded-lg border border-slate-700 py-3 text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || selected.size === 0}
                className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 transition"
              >
                {saving
                  ? `Clocking ${progress}/${selected.size}...`
                  : `Clock ${type.toUpperCase()} (${selected.size})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
