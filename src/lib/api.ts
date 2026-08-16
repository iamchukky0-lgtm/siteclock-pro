/**
 * Frontend API client — replaces the old Base44 `db` object.
 */

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`)
  }
  return data as T
}

// ─── Auth ───────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ success: boolean; admin: any; mustChangePassword?: boolean }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  logout: () => request("/api/auth/logout", { method: "POST" }),

  me: () => request<{ admin: any }>("/api/auth/me"),
}

// ─── Workers ────────────────────────────────────────────
export const workersApi = {
  list: (params?: { status?: string; siteId?: string }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set("status", params.status)
    if (params?.siteId) q.set("siteId", params.siteId)
    const qs = q.toString()
    return request<any[]>(`/api/workers${qs ? `?${qs}` : ""}`)
  },

  get: (id: string) => request<any>(`/api/workers/${id}`),

  create: (data: any) =>
    request("/api/workers", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    request(`/api/workers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request(`/api/workers/${id}`, { method: "DELETE" }),
}

// ─── Sites ──────────────────────────────────────────────
export const sitesApi = {
  list: (params?: { all?: boolean }) => {
    const q = params?.all ? "?all=true" : ""
    return request<any[]>(`/api/sites${q}`)
  },

  get: (id: string) => request<any>(`/api/sites/${id}`),

  create: (data: any) =>
    request("/api/sites", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    request(`/api/sites/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request(`/api/sites/${id}`, { method: "DELETE" }),
}

// ─── Attendance ─────────────────────────────────────────
export const attendanceApi = {
  list: (params?: {
    limit?: number
    siteId?: string
    workerId?: string
    date?: string
    from?: string
    to?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.limit) q.set("limit", String(params.limit))
    if (params?.siteId) q.set("siteId", params.siteId)
    if (params?.workerId) q.set("workerId", params.workerId)
    if (params?.date) q.set("date", params.date)
    if (params?.from) q.set("from", params.from)
    if (params?.to) q.set("to", params.to)
    const qs = q.toString()
    return request<any[]>(`/api/attendance${qs ? `?${qs}` : ""}`)
  },

  create: (data: any) =>
    request("/api/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

// ─── Admins ─────────────────────────────────────────────
export const adminsApi = {
  list: () => request<any[]>("/api/admins"),

  create: (data: any) =>
    request("/api/admins", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    request(`/api/admins/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request(`/api/admins/${id}`, { method: "DELETE" }),
}
