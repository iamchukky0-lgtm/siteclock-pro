"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authApi, attendanceApi, sitesApi } from "@/lib/api"
import AttendanceMap from "@/components/AttendanceMap"

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function MapPage() {
  const router = useRouter()
  const [records, setRecords] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [date, setDate] = useState(today())
  const [loading, setLoading] = useState(true)

  async function load(d: string) {
    setLoading(true)
    try {
      await authApi.me()
      const [r, s] = await Promise.all([
        attendanceApi.list({ date: d, limit: 500 }),
        sitesApi.list({ all: true }),
      ])
      setRecords(r)
      setSites(s)
    } catch {
      router.push("/admin/login")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(date)
  }, [])

  const withGps = records.filter(
    (r) => r.latitude != null && r.longitude != null
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Map View</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Clock-in locations and site geofences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white text-sm"
          />
          <button
            onClick={() => load(date)}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500" /> Clock In
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500" /> Clock Out
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500" /> Site + radius
        </span>
        <span className="text-slate-500">
          {withGps.length} pin(s) with GPS for this day
        </span>
      </div>

      <AttendanceMap records={records} sites={sites} />

      {/* List of GPS records */}
      {withGps.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/40 text-slate-400">
              <tr>
                <th className="text-left px-4 py-3">Worker</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">Distance</th>
                <th className="text-left px-4 py-3">Coords</th>
              </tr>
            </thead>
            <tbody>
              {withGps.map((r) => (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className="px-4 py-3">{r.workerName}</td>
                  <td className="px-4 py-3 capitalize">
                    <span
                      className={
                        r.type === "in" ? "text-emerald-400" : "text-orange-400"
                      }
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {r.distanceFromSite != null
                      ? `${r.distanceFromSite}m`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {r.latitude?.toFixed(5)}, {r.longitude?.toFixed(5)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
