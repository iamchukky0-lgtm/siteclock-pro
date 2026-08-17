"use client"

import { useEffect, useState, useMemo } from "react"
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
  const [showAbsent, setShowAbsent] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [siteFilter, setSiteFilter] = useState("")
  const { pendingCount, isSyncing, syncNow } = useOfflineSync()

  async function reloadToday() {
    const a = await attendanceApi.list({
      date: new Date().toISOString().slice(0, 10),
      limit: 500,
    })
    setTodayRecords(a)
  }

  useEffect(() => {
    async function load() {
      try {
        const { admin } = await authApi.me()
        setAdmin(admin)
        const [w, s] = await Promise.all([
          workersApi.list({ status: "active" }),
          sitesApi.list({ all: true }),
        ])
        setWorkers(w)
        setSites(s)
        await reloadToday()
      } catch {
        router.push("/admin/login")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // Build per-worker today status
  const workerStatus = useMemo(() => {
    const map = new Map<
      string,
      { name: string; workerId: string; trade?: string; ins: Date[]; outs: Date[]; siteId?: string }
    >()

    for (const w of workers) {
      if (siteFilter && w.siteId !== siteFilter) continue
      map.set(w.workerId, {
        name: w.fullName,
        workerId: w.workerId,
        trade: w.trade,
        ins: [],
        outs: [],
        siteId: w.siteId,
      })
    }

    for (const r of todayRecords) {
      if (r.type === "absent") continue
      let entry = map.get(r.workerId)
      if (!entry) {
        if (siteFilter) continue
        entry = {
          name: r.workerName,
          workerId: r.workerId,
          ins: [],
          outs: [],
        }
        map.set(r.workerId, entry)
      }
      const t = new Date(r.timestamp)
      if (r.type === "in") entry.ins.push(t)
      if (r.type === "out") entry.outs.push(t)
    }

    return Array.from(map.values()).map((e) => {
      e.ins.sort((a, b) => a.getTime() - b.getTime())
      e.outs.sort((a, b) => a.getTime() - b.getTime())
      const lastIn = e.ins[e.ins.length - 1]
      const lastOut = e.outs[e.outs.length - 1]
      const onSite = lastIn && (!lastOut || lastIn > lastOut)
      const firstIn = e.ins[0]
      const late =
        firstIn &&
        (firstIn.getHours() > 7 ||
          (firstIn.getHours() === 7 && firstIn.getMinutes() > 0))
      return {
        ...e,
        onSite: !!onSite,
        firstIn,
        lastOut,
        late: !!late && !!onSite,
        hasActivity: e.ins.length > 0 || e.outs.length > 0,
      }
    })
  }, [workers, todayRecords, siteFilter])

  const present = workerStatus.filter((w) => w.hasActivity)
  const onSiteNow = workerStatus.filter((w) => w.onSite)
  const lateArrivals = workerStatus.filter((w) => w.late)
  const clockedInToday = workerStatus.filter((w) => w.ins.length > 0).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        Loading dashboard...
      </div>
    )
  }

  const dateLabel = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5 flex flex-wrap items-center gap-2">
            <span>{dateLabel}</span>
            {sites.length > 0 && (
              <>
                <span className="text-slate-600">·</span>
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-white px-2 py-1"
                >
                  <option value="">All sites</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.siteName}
                    </option>
                  ))}
                </select>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowBulk(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
          >
            Bulk Clock In/Out
          </button>
          <button
            onClick={() => setShowAbsent(true)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm font-medium px-4 py-2.5 rounded-lg transition"
          >
            Mark Absent
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-amber-200">
            {isSyncing
              ? "Syncing..."
              : `${pendingCount} offline clock-in(s) waiting to sync`}
          </span>
          {!isSyncing && (
            <button
              onClick={() => syncNow()}
              className="text-amber-300 underline font-medium"
            >
              Sync now
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Workers" value={workers.length} accent="orange" />
        <StatCard label="Clocked In Today" value={clockedInToday} accent="green" />
        <StatCard label="On Site Now" value={onSiteNow.length} accent="blue" />
        <StatCard label="Late Arrivals" value={lateArrivals.length} accent="amber" sub="After 07:00" />
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <NavCard href="/admin/workers" title="Workers" desc="Manage & QR codes" />
        <NavCard href="/admin/attendance" title="Attendance" desc="Reports & payroll" />
        <NavCard href="/admin/sites" title="Sites" desc="Geofence settings" />
        <NavCard href="/admin/map" title="Map" desc="Clock-in locations" />
        <NavCard href="/admin/team" title="Team" desc="Admins & supervisors" />
      </div>

      {/* Today's attendance cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Today&apos;s Attendance</h2>
            <p className="text-sm text-slate-500">
              {present.length} worker{present.length !== 1 ? "s" : ""} with activity today
            </p>
          </div>
          <Link
            href="/admin/attendance"
            className="text-sm text-orange-400 hover:text-orange-300 font-medium"
          >
            Full report →
          </Link>
        </div>

        {present.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-12 text-center text-slate-500 text-sm">
            No clock-ins yet today
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {present
              .sort((a, b) => Number(b.onSite) - Number(a.onSite))
              .map((w) => (
                <div
                  key={w.workerId}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-11 h-11 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {w.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{w.name}</p>
                      <span className="text-xs font-mono text-slate-500">
                        {w.workerId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {w.trade || "—"} · In:{" "}
                      {w.firstIn
                        ? w.firstIn.toLocaleTimeString("en-ZA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}{" "}
                      · Out:{" "}
                      {w.lastOut
                        ? w.lastOut.toLocaleTimeString("en-ZA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {w.onSite ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-900/50 text-emerald-300">
                        On Site
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                        Out
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {showAbsent && (
        <MarkAbsentDialog
          workers={workers}
          onClose={() => setShowAbsent(false)}
          onSaved={reloadToday}
        />
      )}
      {showBulk && (
        <BulkClockDialog
          workers={workers}
          onClose={() => setShowBulk(false)}
          onSaved={reloadToday}
        />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string
  value: number
  accent: "orange" | "green" | "blue" | "amber"
  sub?: string
}) {
  const ring: Record<string, string> = {
    orange: "border-orange-500/30",
    green: "border-emerald-500/30",
    blue: "border-sky-500/30",
    amber: "border-amber-500/30",
  }
  const num: Record<string, string> = {
    orange: "text-orange-400",
    green: "text-emerald-400",
    blue: "text-sky-400",
    amber: "text-amber-400",
  }
  return (
    <div className={`bg-slate-900 border ${ring[accent]} rounded-xl p-4`}>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${num[accent]}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
    </div>
  )
}

function NavCard({
  href,
  title,
  desc,
}: {
  href: string
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="block bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-orange-500/40 rounded-xl p-4 transition"
    >
      <h3 className="font-semibold text-white text-sm">{title}</h3>
      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
    </Link>
  )
}
