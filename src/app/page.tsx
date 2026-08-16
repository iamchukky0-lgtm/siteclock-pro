import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center max-w-md space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            SiteClock Pro
          </h1>
          <p className="text-slate-400 text-lg">
            Construction site attendance &amp; payroll
          </p>
        </div>

        <div className="grid gap-4">
          <Link
            href="/clock"
            className="block w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 px-6 text-lg transition"
          >
            Worker Clock In / Out
          </Link>

          <Link
            href="/admin/login"
            className="block w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-4 px-6 text-lg transition"
          >
            Admin Login
          </Link>
        </div>

        <p className="text-slate-500 text-sm">
          Independent version — no Base44 required
        </p>
      </div>
    </main>
  )
}
