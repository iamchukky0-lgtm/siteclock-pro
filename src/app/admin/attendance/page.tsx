"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authApi, attendanceApi, workersApi, sitesApi } from "@/lib/api"

type Record = {
  id: string
  workerId: string
  workerName: string
  siteId?: string | null
  type: string
  timestamp: string
  status: string
  absenceReason?: string | null
  overrideNote?: string | null
}

type Worker = {
  id: string
  workerId: string
  fullName: string
  weekdayDailyRate?: number | null
  overtimeHourlyRate?: number | null
  saturdayDailyRate?: number | null
  siteId?: string | null
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfMonth() {
  const d = new Date()
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
}

function today() {
  return toDateStr(new Date())
}

export default function AttendanceReportsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<Record[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [from, setFrom] = useState(startOfMonth())
  const [to, setTo] = useState(today())
  const [siteId, setSiteId] = useState("")
  const [workerId, setWorkerId] = useState("")
  const [view, setView] = useState<"records" | "payroll">("records")

  async function load() {
    setLoading(true)
    try {
      await authApi.me()
      const [r, w, s] = await Promise.all([
        attendanceApi.list({ from, to, siteId: siteId || undefined, workerId: workerId || undefined, limit: 2000 }),
        workersApi.list({ status: "all" }),
        sitesApi.list(),
      ])
      setRecords(r)
      setWorkers(w)
      setSites(s)
    } catch {
      router.push("/admin/login")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Payroll summary per worker
  const payroll = useMemo(() => {
    const map: Record<
      string,
      {
        workerId: string
        name: string
        daysWorked: number
        saturdays: number
        absences: number
        weekdayRate: number
        saturdayRate: number
        total: number
        dates: Set<string>
      }
    > = {}

    const workerMap = Object.fromEntries(workers.map((w) => [w.workerId, w]))

    for (const r of records) {
      if (!map[r.workerId]) {
        const w = workerMap[r.workerId]
        map[r.workerId] = {
          workerId: r.workerId,
          name: r.workerName,
          daysWorked: 0,
          saturdays: 0,
          absences: 0,
          weekdayRate: w?.weekdayDailyRate || 0,
          saturdayRate: w?.saturdayDailyRate || 0,
          total: 0,
          dates: new Set(),
        }
      }

      const entry = map[r.workerId]
      const day = r.timestamp.slice(0, 10)
      const dayOfWeek = new Date(r.timestamp).getDay() // 0=Sun, 6=Sat

      if (r.type === "absent") {
        entry.absences++
      } else if (r.type === "in" && !entry.dates.has(day)) {
        entry.dates.add(day)
        if (dayOfWeek === 6) {
          entry.saturdays++
        } else if (dayOfWeek !== 0) {
          // Mon-Fri
          entry.daysWorked++
        }
      }
    }

    // Calculate totals
    for (const key of Object.keys(map)) {
      const e = map[key]
      e.total = e.daysWorked * e.weekdayRate + e.saturdays * e.saturdayRate
    }

    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [records, workers])

  function exportCSV() {
    if (view === "payroll") {
      const headers = [
        "Worker ID",
        "Name",
        "Weekday Days",
        "Saturday Days",
        "Absences",
        "Weekday Rate",
        "Saturday Rate",
        "Total Pay (ZAR)",
      ]
      const rows = payroll.map((p) => [
        p.workerId,
        p.name,
        p.daysWorked,
        p.saturdays,
        p.absences,
        p.weekdayRate,
        p.saturdayRate,
        p.total.toFixed(2),
      ])
      downloadCSV("payroll-export", headers, rows)
    } else {
      const headers = [
        "Date",
        "Time",
        "Worker ID",
        "Worker Name",
        "Type",
        "Status",
        "Absence Reason",
        "Note",
      ]
      const rows = records.map((r) => {
        const d = new Date(r.timestamp)
        return [
          d.toLocaleDateString("en-ZA"),
          d.toLocaleTimeString("en-ZA"),
          r.workerId,
          r.workerName,
          r.type,
          r.status,
          r.absenceReason || "",
          r.overrideNote || "",
        ]
      })
      downloadCSV("attendance-export", headers, rows)
    }
  }

  function downloadCSV(filename: string, headers: string[], rows: any[][]) {
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPay = payroll.reduce((sum, p) => sum + p.total, 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold mt-1">Attendance & Payroll</h1>
          </div>
          <button
            onClick={exportCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            Export CSV
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Site</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white text-sm"
            >
              <option value="">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Worker</label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white text-sm"
            >
              <option value="">All workers</option>
              {workers.map((w) => (
                <option key={w.workerId} value={w.workerId}>
                  {w.fullName} ({w.workerId})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={load}
              disabled={loading}
              className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 text-sm transition"
            >
              {loading ? "Loading..." : "Apply Filters"}
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setView("records")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === "records"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            Attendance Records ({records.length})
          </button>
          <button
            onClick={() => setView("payroll")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === "payroll"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            Payroll Summary
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-12">Loading...</p>
        ) : view === "records" ? (
          /* Records table */
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Worker</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No records in this period
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const d = new Date(r.timestamp)
                    return (
                      <tr key={r.id} className="border-t border-slate-800">
                        <td className="px-4 py-3">{d.toLocaleDateString("en-ZA")}</td>
                        <td className="px-4 py-3">{d.toLocaleTimeString("en-ZA")}</td>
                        <td className="px-4 py-3">
                          {r.workerName}{" "}
                          <span className="text-slate-500 font-mono text-xs">
                            ({r.workerId})
                          </span>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          <span
                            className={
                              r.type === "in"
                                ? "text-emerald-400"
                                : r.type === "out"
                                ? "text-amber-400"
                                : "text-red-400"
                            }
                          >
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-400">
                          {r.status}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {r.absenceReason || r.overrideNote || "—"}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Payroll summary */
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-6">
              <div>
                <p className="text-sm text-slate-400">Workers</p>
                <p className="text-2xl font-bold">{payroll.length}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Pay</p>
                <p className="text-2xl font-bold text-emerald-400">
                  R{totalPay.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Period</p>
                <p className="text-sm font-medium mt-1">
                  {from} → {to}
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/60 text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3">Worker</th>
                    <th className="text-right px-4 py-3">Weekdays</th>
                    <th className="text-right px-4 py-3">Saturdays</th>
                    <th className="text-right px-4 py-3">Absences</th>
                    <th className="text-right px-4 py-3">Rate (W/S)</th>
                    <th className="text-right px-4 py-3">Total Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No payroll data for this period
                      </td>
                    </tr>
                  ) : (
                    payroll.map((p) => (
                      <tr key={p.workerId} className="border-t border-slate-800">
                        <td className="px-4 py-3">
                          {p.name}{" "}
                          <span className="text-slate-500 font-mono text-xs">
                            ({p.workerId})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{p.daysWorked}</td>
                        <td className="px-4 py-3 text-right">{p.saturdays}</td>
                        <td className="px-4 py-3 text-right text-red-400">
                          {p.absences || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          R{p.weekdayRate} / R{p.saturdayRate}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                          R{p.total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500">
              Note: Weekday days = Mon–Fri clock-ins. Saturday days use Saturday rate.
              Overtime hours are not yet calculated (requires clock-out times). Absences are counted but not deducted automatically.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
