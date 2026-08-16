"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authApi, workersApi, sitesApi, attendanceApi } from "@/lib/api"
import Link from "next/link"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import MarkAbsentDialog from "@/components/MarkAbsentDialog"
import BulkClockDialog from "@/components/BulkClockDialog"

export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<any>(null)
  const [workers, setWorkers] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [todayRecords, setTodayRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { pendingCount, isSyncing, syncNow } = useOfflineSync()
  const [showAbsent, setShowAbsent] = useState(false)
  const [showBulk, setShowBulk] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { admin } = await authApi.me()
        setAdmin(admin)

        const [w, s, a] = await Promise.all([
          workersApi.list({ status: "active" }),
          sitesApi.list(),
          attendanceApi.list({
            date: new Date().toISOString().slice(0, 10),
            limit: 100,
          }),
        ])
        setWorkers(w)
        setSites(s)
        setTodayRecords(a)
      } catch {
        router.push("/admin/login")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        Loading dashboard...
      </div>
    )
  }

  const clockedIn = todayRecords.filter((r) => r.type === "in").length
  const absents = todayRecords.filter((r) => r.type === "absent").length

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Welcome back, {admin?.fullName}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowBulk(true)}
            className="bg-orange-500 hover:bg-orange-600 text-sm font-medium px-4 py-2 rounded-lg transition text-white"
          >
            Bulk Clock
          </button>
          <button
            onClick={() => setShowAbsent(true)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Mark Absent
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-amber-200">
            {isSyncing ? "Syncing..." : `${pendingCount} offline clock-in(s) waiting to sync`}
          </span>
          {!isSyncing && (
            <button onClick={() => syncNow()} className="text-amber-300 underline font-medium">
              Sync now
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Workers" value={workers.length} />
        <StatCard label="Sites" value={sites.length} />
        <StatCard label="Clocked In Today" value={clockedIn} color="emerald" />
        <StatCard label="Absences Today" value={absents} color="amber" />
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <NavCard href="/admin/workers" title="Workers" desc="Manage workers & rates" icon="👷" />
        <NavCard href="/admin/attendance" title="Attendance" desc="Reports & payroll" icon="📋" />
        <NavCard href="/admin/sites" title="Sites" desc="Geofence settings" icon="📍" />
        <NavCard href="/admin/map" title="Map" desc="Clock-in locations" icon="🗺️" />
        <NavCard href="/admin/team" title="Team" desc="Admins & supervisors" icon="🛡️" />
      </div>

      {/* Today's activity */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Today&apos;s Attendance</h2>
        {todayRecords.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-10 text-center text-slate-500 text-sm">
            No records yet today
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/40 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Worker</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayRecords.slice(0, 20).map((r) => (
                  <tr key={r.id} className="border-t border-slate-800/80">
                    <td className="px-4 py-3">{r.workerName}</td>
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
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-500">
                      {r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAbsent && (
        <MarkAbsentDialog
          workers={workers}
          onClose={() => setShowAbsent(false)}
          onSaved={() => {
            attendanceApi
              .list({ date: new Date().toISOString().slice(0, 10), limit: 100 })
              .then(setTodayRecords)
              .catch(() => {})
          }}
        />
      )}

      {showBulk && (
        <BulkClockDialog
          workers={workers}
          onClose={() => setShowBulk(false)}
          onSaved={() => {
            attendanceApi
              .list({ date: new Date().toISOString().slice(0, 10), limit: 100 })
              .then(setTodayRecords)
              .catch(() => {})
          }}
        />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color = "slate",
}: {
  label: string
  value: number
  color?: string
}) {
  const colors: Record<string, string> = {
    slate: "text-white",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  }
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[color]}`}>{value}</p>
    </div>
  )
}

function NavCard({
  href,
  title,
  desc,
  icon,
}: {
  href: string
  title: string
  desc: string
  icon: string
}) {
  return (
    <Link
      href={href}
      className="block bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition group"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-white group-hover:text-orange-400 transition">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
        </div>
      </div>
    </Link>
  )
}
