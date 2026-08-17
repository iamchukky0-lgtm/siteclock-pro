"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authApi, workersApi, sitesApi } from "@/lib/api"
import WorkerQR from "@/components/WorkerQR"

type Worker = {
  id: string
  fullName: string
  workerId: string
  phoneNumber?: string | null
  pin: string
  trade?: string | null
  siteId?: string | null
  status: string
  idNumber?: string | null
  residentialAddress?: string | null
  nextOfKinName?: string | null
  nextOfKinPhone?: string | null
  nextOfKinRelationship?: string | null
  hasWorkPermit: boolean
  weekdayDailyRate?: number | null
  overtimeHourlyRate?: number | null
  saturdayDailyRate?: number | null
  site?: { siteName: string } | null
}

const emptyForm = {
  fullName: "",
  workerId: "",
  phoneNumber: "",
  pin: "",
  trade: "",
  siteId: "",
  idNumber: "",
  residentialAddress: "",
  nextOfKinName: "",
  nextOfKinPhone: "",
  nextOfKinRelationship: "",
  hasWorkPermit: false,
  weekdayDailyRate: "",
  overtimeHourlyRate: "",
  saturdayDailyRate: "",
  status: "active",
}

export default function WorkersPage() {
  const router = useRouter()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [qrWorker, setQrWorker] = useState<Worker | null>(null)
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active")

  async function load() {
    try {
      await authApi.me()
      const [w, s] = await Promise.all([
        workersApi.list({ status: "all" }),
        sitesApi.list(),
      ])
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

  function openCreate() {
    setEditingId(null)
    setForm({ ...emptyForm })
    setError("")
    setShowForm(true)
  }

  function openEdit(w: Worker) {
    setEditingId(w.id)
    setForm({
      fullName: w.fullName || "",
      workerId: w.workerId || "",
      phoneNumber: w.phoneNumber || "",
      pin: w.pin || "",
      trade: w.trade || "",
      siteId: w.siteId || "",
      idNumber: w.idNumber || "",
      residentialAddress: w.residentialAddress || "",
      nextOfKinName: w.nextOfKinName || "",
      nextOfKinPhone: w.nextOfKinPhone || "",
      nextOfKinRelationship: w.nextOfKinRelationship || "",
      hasWorkPermit: w.hasWorkPermit || false,
      weekdayDailyRate: w.weekdayDailyRate?.toString() || "",
      overtimeHourlyRate: w.overtimeHourlyRate?.toString() || "",
      saturdayDailyRate: w.saturdayDailyRate?.toString() || "",
      status: w.status || "active",
    })
    setError("")
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    try {
      const payload = {
        ...form,
        weekdayDailyRate: form.weekdayDailyRate ? Number(form.weekdayDailyRate) : null,
        overtimeHourlyRate: form.overtimeHourlyRate ? Number(form.overtimeHourlyRate) : null,
        saturdayDailyRate: form.saturdayDailyRate ? Number(form.saturdayDailyRate) : null,
        siteId: form.siteId || null,
      }

      if (editingId) {
        await workersApi.update(editingId, payload)
      } else {
        if (!form.fullName || !form.workerId || !form.pin) {
          setError("Full name, Worker ID and PIN are required")
          setSaving(false)
          return
        }
        await workersApi.create(payload)
      }

      setShowForm(false)
      await load()
    } catch (err: any) {
      setError(err.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete worker "${name}"? This cannot be undone.`)) return
    try {
      await workersApi.delete(id)
      await load()
    } catch (err: any) {
      alert(err.message || "Delete failed")
    }
  }

  async function toggleStatus(w: Worker) {
    try {
      await workersApi.update(w.id, {
        status: w.status === "active" ? "inactive" : "active",
      })
      await load()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const filtered = workers.filter((w) => {
    if (filter === "all") return true
    return w.status === filter
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading workers...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-xl font-bold mt-1">Worker Management</h1>
          </div>
          <button
            onClick={openCreate}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            + Add Worker
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex gap-2">
          {(["active", "inactive", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                filter === f
                  ? "bg-orange-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {f} ({workers.filter((w) => (f === "all" ? true : w.status === f)).length})
            </button>
          ))}
        </div>

        {/* Worker cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-12 text-center text-slate-500">
              No workers found
            </div>
          ) : (
            filtered.map((w) => (
              <div
                key={w.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {(w.fullName || "?")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{w.fullName}</p>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          w.status === "active"
                            ? "bg-emerald-900/50 text-emerald-300"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {w.workerId}
                      {w.trade ? ` · ${w.trade}` : ""}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {w.site?.siteName || "No site"}
                      {w.weekdayDailyRate != null
                        ? ` · R${w.weekdayDailyRate}/day`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setQrWorker(w)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-sky-400 hover:bg-slate-800"
                  >
                    QR
                  </button>
                  <button
                    onClick={() => openEdit(w)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-emerald-400 hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(w)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-amber-400 hover:bg-slate-800"
                  >
                    {w.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDelete(w.id, w.fullName)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-red-400 hover:bg-slate-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </main>


      {/* QR Modal */}
      {qrWorker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Worker QR Code</h2>
              <button
                onClick={() => setQrWorker(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            <WorkerQR
              workerId={qrWorker.workerId}
              workerName={qrWorker.fullName}
              size={220}
            />
            <p className="text-center text-xs text-slate-500 mt-4">
              Worker scans this QR on the clock-in page
            </p>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? "Edit Worker" : "Add New Worker"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-900/40 border border-red-700 text-red-200 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Basic info */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                  Basic Info
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field
                    label="Full Name *"
                    value={form.fullName}
                    onChange={(v) => setForm({ ...form, fullName: v })}
                    required
                  />
                  <Field
                    label="Worker ID *"
                    value={form.workerId}
                    onChange={(v) => setForm({ ...form, workerId: v.toUpperCase() })}
                    required
                    placeholder="W001"
                  />
                  <Field
                    label="4-Digit PIN *"
                    value={form.pin}
                    onChange={(v) =>
                      setForm({ ...form, pin: v.replace(/\D/g, "").slice(0, 4) })
                    }
                    required
                    placeholder="1234"
                  />
                  <Field
                    label="Phone Number"
                    value={form.phoneNumber}
                    onChange={(v) => setForm({ ...form, phoneNumber: v })}
                    placeholder="0821234567"
                  />
                  <Field
                    label="Trade / Role"
                    value={form.trade}
                    onChange={(v) => setForm({ ...form, trade: v })}
                    placeholder="Bricklayer, Electrician..."
                  />
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Site</label>
                    <select
                      value={form.siteId}
                      onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                      className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">— No site —</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.siteName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Rates */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                  Rates (ZAR)
                </h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field
                    label="Weekday Daily Rate"
                    value={form.weekdayDailyRate}
                    onChange={(v) => setForm({ ...form, weekdayDailyRate: v })}
                    type="number"
                    placeholder="450"
                  />
                  <Field
                    label="Overtime Hourly Rate"
                    value={form.overtimeHourlyRate}
                    onChange={(v) => setForm({ ...form, overtimeHourlyRate: v })}
                    type="number"
                    placeholder="75"
                  />
                  <Field
                    label="Saturday Daily Rate"
                    value={form.saturdayDailyRate}
                    onChange={(v) => setForm({ ...form, saturdayDailyRate: v })}
                    type="number"
                    placeholder="350"
                  />
                </div>
              </section>

              {/* Personal / Documents */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                  Personal & Documents
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field
                    label="ID / Passport Number"
                    value={form.idNumber}
                    onChange={(v) => setForm({ ...form, idNumber: v })}
                  />
                  <Field
                    label="Residential Address"
                    value={form.residentialAddress}
                    onChange={(v) => setForm({ ...form, residentialAddress: v })}
                  />
                  <Field
                    label="Next of Kin Name"
                    value={form.nextOfKinName}
                    onChange={(v) => setForm({ ...form, nextOfKinName: v })}
                  />
                  <Field
                    label="Next of Kin Phone"
                    value={form.nextOfKinPhone}
                    onChange={(v) => setForm({ ...form, nextOfKinPhone: v })}
                  />
                  <Field
                    label="Relationship"
                    value={form.nextOfKinRelationship}
                    onChange={(v) => setForm({ ...form, nextOfKinRelationship: v })}
                    placeholder="Wife, Mother..."
                  />
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="hasWorkPermit"
                      checked={form.hasWorkPermit}
                      onChange={(e) =>
                        setForm({ ...form, hasWorkPermit: e.target.checked })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="hasWorkPermit" className="text-sm text-slate-300">
                      Has work permit
                    </label>
                  </div>
                </div>
              </section>

              {/* Status (edit only) */}
              {editingId && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-slate-700 py-3 text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 transition"
                >
                  {saving ? "Saving..." : editingId ? "Update Worker" : "Create Worker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  )
}
