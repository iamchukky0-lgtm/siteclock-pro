"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authApi, companiesApi } from "@/lib/api"

type Company = {
  id: string
  name: string
  isActive: boolean
  _count?: { sites: number; workers: number; admins: number }
}

export default function CompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [name, setName] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const { admin } = await authApi.me()
      if (!admin.isGlobalAdmin) {
        router.push("/admin")
        return
      }
      const list = await companiesApi.list()
      setCompanies(list)
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
    setEditing(null)
    setName("")
    setIsActive(true)
    setError("")
    setShowForm(true)
  }

  function openEdit(c: Company) {
    setEditing(c)
    setName(c.name)
    setIsActive(c.isActive)
    setError("")
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    setSaving(true)
    setError("")
    try {
      if (editing) {
        await companiesApi.update(editing.id, { name, isActive })
      } else {
        await companiesApi.create({ name, isActive })
      }
      setShowForm(false)
      await load()
    } catch (err: any) {
      setError(err.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: Company) {
    if (!confirm(`Delete company "${c.name}"?`)) return
    try {
      await companiesApi.delete(c.id)
      await load()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        Loading companies...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white mt-1">Companies</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Separate organisations on this app (global admin only)
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg"
        >
          + Add Company
        </button>
      </div>

      <div className="space-y-3">
        {companies.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
            No companies yet
          </div>
        ) : (
          companies.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{c.name}</p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      c.isActive
                        ? "bg-emerald-900/50 text-emerald-300"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {c.isActive ? "active" : "inactive"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {c._count?.sites ?? 0} sites · {c._count?.workers ?? 0} workers ·{" "}
                  {c._count?.admins ?? 0} admins
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(c)}
                  className="text-sm text-orange-400 hover:text-orange-300 px-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="text-sm text-red-400 hover:text-red-300 px-2"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">
              {editing ? "Edit Company" : "Add Company"}
            </h2>
            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-200 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white"
                  placeholder="e.g. B-Cubed Developments"
                />
              </div>
              {editing && (
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Active
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-slate-700 py-2.5 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
