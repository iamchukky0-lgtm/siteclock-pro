"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authApi, adminsApi, sitesApi } from "@/lib/api"

type Admin = {
  id: string
  fullName: string
  email: string
  role: string
  isGlobalAdmin: boolean
  isPayrollManager: boolean
  assignedSiteIds: string[]
  isActive: boolean
  phoneNumber?: string | null
  mustChangePassword?: boolean
}

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  phoneNumber: "",
  isGlobalAdmin: false,
  isPayrollManager: false,
  assignedSiteIds: [] as string[],
  isActive: true,
}

export default function TeamPage() {
  const router = useRouter()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)

  async function load() {
    try {
      const { admin: me } = await authApi.me()
      setCurrentAdminId(me.adminId || me.id)
      if (!me.isGlobalAdmin) {
        router.push("/admin")
        return
      }
      const [a, s] = await Promise.all([adminsApi.list(), sitesApi.list({ all: true })])
      setAdmins(a)
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

  function openEdit(a: Admin) {
    setEditingId(a.id)
    setForm({
      fullName: a.fullName || "",
      email: a.email || "",
      password: "",
      phoneNumber: a.phoneNumber || "",
      isGlobalAdmin: a.isGlobalAdmin,
      isPayrollManager: a.isPayrollManager,
      assignedSiteIds: a.assignedSiteIds || [],
      isActive: a.isActive,
    })
    setError("")
    setShowForm(true)
  }

  function toggleSite(siteId: string) {
    setForm((f) => {
      const ids = f.assignedSiteIds.includes(siteId)
        ? f.assignedSiteIds.filter((id) => id !== siteId)
        : [...f.assignedSiteIds, siteId]
      return { ...f, assignedSiteIds: ids }
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)

    try {
      if (!form.fullName || !form.email) {
        setError("Name and email are required")
        setSaving(false)
        return
      }

      if (!editingId && !form.password) {
        setError("Password is required for new admins")
        setSaving(false)
        return
      }

      const payload: any = {
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber || null,
        isGlobalAdmin: form.isGlobalAdmin,
        isPayrollManager: form.isPayrollManager || form.isGlobalAdmin,
        assignedSiteIds: form.isGlobalAdmin ? [] : form.assignedSiteIds,
        isActive: form.isActive,
      }

      if (form.password) {
        payload.password = form.password
      }

      if (editingId) {
        await adminsApi.update(editingId, payload)
      } else {
        await adminsApi.create(payload)
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
    if (!confirm(`Delete admin "${name}"?`)) return
    try {
      await adminsApi.delete(id)
      await load()
    } catch (err: any) {
      alert(err.message || "Delete failed")
    }
  }

  async function toggleActive(a: Admin) {
    try {
      await adminsApi.update(a.id, { isActive: !a.isActive })
      await load()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading team...
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
            <h1 className="text-xl font-bold mt-1">Team / Admins</h1>
          </div>
          <button
            onClick={openCreate}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            + Add Admin
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Sites</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No admins found
                  </td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium">
                      {a.fullName}
                      {a.id === currentAdminId && (
                        <span className="ml-2 text-xs text-slate-500">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{a.email}</td>
                    <td className="px-4 py-3">
                      {a.isGlobalAdmin ? (
                        <span className="text-emerald-400 text-xs font-medium">
                          Global Admin
                        </span>
                      ) : a.isPayrollManager ? (
                        <span className="text-sky-400 text-xs font-medium">
                          Payroll Manager
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Supervisor</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {a.isGlobalAdmin
                        ? "All sites"
                        : a.assignedSiteIds?.length
                        ? `${a.assignedSiteIds.length} site(s)`
                        : "None"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          a.isActive
                            ? "bg-emerald-900/50 text-emerald-300"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {a.isActive ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openEdit(a)}
                        className="text-emerald-400 hover:text-emerald-300 text-sm"
                      >
                        Edit
                      </button>
                      {a.id !== currentAdminId && (
                        <>
                          <button
                            onClick={() => toggleActive(a)}
                            className="text-amber-400 hover:text-amber-300 text-sm"
                          >
                            {a.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDelete(a.id, a.fullName)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? "Edit Admin" : "Add Admin"}
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
                <label className="block text-sm text-slate-400 mb-1">Full Name *</label>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {editingId ? "New Password (leave blank to keep)" : "Password *"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingId}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Phone</label>
                <input
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="0821234567"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Roles */}
              <div className="space-y-2">
                <label className="block text-sm text-slate-400">Access Level</label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isGlobalAdmin}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isGlobalAdmin: e.target.checked,
                        isPayrollManager: e.target.checked || form.isPayrollManager,
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-300">
                    Global Admin (full access to all sites & team)
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPayrollManager}
                    disabled={form.isGlobalAdmin}
                    onChange={(e) =>
                      setForm({ ...form, isPayrollManager: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-300">
                    Payroll Manager
                  </span>
                </label>
              </div>

              {/* Site assignment (for supervisors) */}
              {!form.isGlobalAdmin && (
                <div className="space-y-2">
                  <label className="block text-sm text-slate-400">
                    Assigned Sites
                  </label>
                  {sites.length === 0 ? (
                    <p className="text-xs text-slate-500">No sites available</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sites.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-3 cursor-pointer py-1"
                        >
                          <input
                            type="checkbox"
                            checked={form.assignedSiteIds.includes(s.id)}
                            onChange={() => toggleSite(s.id)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-slate-300">{s.siteName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editingId && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-300">Active</span>
                </label>
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
                  {saving ? "Saving..." : editingId ? "Update" : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
