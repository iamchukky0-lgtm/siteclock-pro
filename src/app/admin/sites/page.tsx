"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authApi, sitesApi } from "@/lib/api"

type Site = {
  id: string
  siteName: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  radiusMetres: number
  isActive: boolean
  whatsappNotificationsEnabled: boolean
  createdBy?: string | null
}

const emptyForm = {
  siteName: "",
  address: "",
  latitude: "",
  longitude: "",
  radiusMetres: "250",
  whatsappNotificationsEnabled: false,
  isActive: true,
}

export default function SitesPage() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  async function load() {
    try {
      await authApi.me()
      const s = await sitesApi.list({ all: true })
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

  function openEdit(s: Site) {
    setEditingId(s.id)
    setForm({
      siteName: s.siteName || "",
      address: s.address || "",
      latitude: s.latitude?.toString() || "",
      longitude: s.longitude?.toString() || "",
      radiusMetres: s.radiusMetres?.toString() || "250",
      whatsappNotificationsEnabled: s.whatsappNotificationsEnabled || false,
      isActive: s.isActive,
    })
    setError("")
    setShowForm(true)
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }))
        setGettingLocation(false)
      },
      () => {
        setError("Could not get your location. Please enter coordinates manually.")
        setGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    try {
      if (!form.siteName.trim()) {
        setError("Site name is required")
        setSaving(false)
        return
      }

      const payload = {
        siteName: form.siteName.trim(),
        address: form.address.trim() || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        radiusMetres: Number(form.radiusMetres) || 250,
        whatsappNotificationsEnabled: form.whatsappNotificationsEnabled,
        isActive: form.isActive,
      }

      if (editingId) {
        await sitesApi.update(editingId, payload)
      } else {
        await sitesApi.create(payload)
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
    if (!confirm(`Delete site "${name}"?\nWorkers assigned to this site will be unassigned.`)) return
    try {
      await sitesApi.delete(id)
      await load()
    } catch (err: any) {
      alert(err.message || "Delete failed")
    }
  }

  async function toggleActive(s: Site) {
    try {
      await sitesApi.update(s.id, { isActive: !s.isActive })
      await load()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading sites...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold mt-1">Sites & Geofence</h1>
          </div>
          <button
            onClick={openCreate}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            + Add Site
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {sites.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg mb-2">No sites yet</p>
            <p className="text-sm">Add your first construction site to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((s) => (
              <div
                key={s.id}
                className={`bg-slate-900 border rounded-xl p-5 space-y-3 ${
                  s.isActive ? "border-slate-800" : "border-slate-800 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white text-lg">{s.siteName}</h3>
                    {s.address && (
                      <p className="text-sm text-slate-400 mt-0.5">{s.address}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
                      s.isActive
                        ? "bg-emerald-900/50 text-emerald-300"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="text-sm space-y-1 text-slate-400">
                  <p>
                    <span className="text-slate-500">Geofence:</span>{" "}
                    {s.radiusMetres}m radius
                  </p>
                  {s.latitude != null && s.longitude != null ? (
                    <p className="font-mono text-xs">
                      {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
                    </p>
                  ) : (
                    <p className="text-amber-500/80 text-xs">No GPS coordinates set</p>
                  )}
                  {s.whatsappNotificationsEnabled && (
                    <p className="text-emerald-400/80 text-xs">WhatsApp notifications on</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openEdit(s)}
                    className="flex-1 text-sm text-emerald-400 hover:text-emerald-300 border border-slate-700 rounded-lg py-1.5 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(s)}
                    className="flex-1 text-sm text-amber-400 hover:text-amber-300 border border-slate-700 rounded-lg py-1.5 transition"
                  >
                    {s.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.siteName)}
                    className="text-sm text-red-400 hover:text-red-300 border border-slate-700 rounded-lg px-3 py-1.5 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? "Edit Site" : "Add New Site"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-900/40 border border-red-700 text-red-200 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-1">Site Name *</label>
                <input
                  value={form.siteName}
                  onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                  required
                  placeholder="Main Construction Site"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Building Road, Johannesburg"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* GPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-slate-400">GPS Coordinates (Geofence centre)</label>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={gettingLocation}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    {gettingLocation ? "Getting location..." : "Use my location"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Latitude</label>
                    <input
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      placeholder="-26.2041"
                      className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Longitude</label>
                    <input
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      placeholder="28.0473"
                      className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Geofence Radius (metres)
                </label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  value={form.radiusMetres}
                  onChange={(e) => setForm({ ...form, radiusMetres: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Workers must be within this distance to clock in (default 250m)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="whatsapp"
                  checked={form.whatsappNotificationsEnabled}
                  onChange={(e) =>
                    setForm({ ...form, whatsappNotificationsEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="whatsapp" className="text-sm text-slate-300">
                  Enable WhatsApp notifications for this site
                </label>
              </div>

              {editingId && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-300">
                    Site is active
                  </label>
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
                  className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 transition"
                >
                  {saving ? "Saving..." : editingId ? "Update Site" : "Create Site"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
