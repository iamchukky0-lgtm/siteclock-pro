"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { authApi } from "@/lib/api"

const navItems = [
  { label: "Home", path: "/admin", icon: "▦" },
  { label: "Workers", path: "/admin/workers", icon: "👷" },
  { label: "Attend", path: "/admin/attendance", icon: "📋" },
  { label: "Sites", path: "/admin/sites", icon: "📍" },
  { label: "Map", path: "/admin/map", icon: "🗺️" },
  { label: "Team", path: "/admin/team", icon: "🛡️" },
  { label: "Cos", path: "/admin/companies", icon: "🏢" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [admin, setAdmin] = useState<any>(null)

  const isLogin = pathname === "/admin/login"

  useEffect(() => {
    if (isLogin) return
    authApi.me().then(({ admin }) => setAdmin(admin)).catch(() => {})
  }, [isLogin, pathname])

  async function handleLogout() {
    await authApi.logout()
    router.push("/admin/login")
  }

  if (isLogin) {
    return <>{children}</>
  }

  function isActive(path: string) {
    if (path === "/admin") return pathname === "/admin"
    return pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0b1220] text-slate-100 flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-slate-800 bg-[#0f172a] shrink-0 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
              SC
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">SiteClock</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pro</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive(item.path)
                  ? "bg-orange-500/15 text-orange-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label === "Attend" ? "Attendance" : item.label === "Home" ? "Dashboard" : item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800 space-y-3">
          {admin && (
            <div className="px-1">
              <p className="text-sm font-medium text-white truncate">
                {admin.fullName}
              </p>
              <p className="text-xs text-slate-500 truncate">{admin.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-slate-400 hover:text-white px-1 py-1 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Mobile top bar */}
        <header
          className="md:hidden sticky top-0 z-40 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur px-4 flex items-center justify-between"
          style={{
            paddingTop: "max(0.75rem, env(safe-area-inset-top))",
            paddingBottom: "0.75rem",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-orange-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
              SC
            </div>
            <span className="font-bold text-sm truncate">SiteClock Pro</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 shrink-0"
          >
            Logout
          </button>
        </header>

        {/* Page content — extra bottom padding so bottom nav never covers content */}
        <div
          className="flex-1 w-full overflow-x-hidden"
          style={{
            paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>
      </div>

      {/* Mobile bottom nav — fixed, safe area aware */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-slate-800 bg-[#0f172a]/98 backdrop-blur"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-stretch justify-between px-0.5">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 transition ${
                isActive(item.path) ? "text-orange-400" : "text-slate-500"
              }`}
              style={{ minHeight: 56, paddingTop: 8, paddingBottom: 6 }}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[9px] font-semibold truncate max-w-full px-0.5">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
