"use client"

import { useState, useRef, useEffect } from "react"
import { attendanceApi } from "@/lib/api"
import { parseWorkerQr } from "@/lib/qr"
import { addToQueue, isOnline } from "@/lib/offlineQueue"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import Link from "next/link"

type Mode = "manual" | "scan" | "selfie"

export default function WorkerClockPage() {
  const [mode, setMode] = useState<Mode>("manual")
  const [workerId, setWorkerId] = useState("")
  const [pin, setPin] = useState("")
  const [type, setType] = useState<"in" | "out">("in")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null)

  const { pendingCount, isSyncing, isOnline: online, syncNow, refreshCount } =
    useOfflineSync()

  // QR scanner
  const scannerRef = useRef<any>(null)
  const scanRegionId = "qr-reader"

  // Selfie
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraActive, setCameraActive] = useState(false)

  // ─── QR Scanner ───────────────────────────────────────
  useEffect(() => {
    if (mode !== "scan") {
      stopScanner()
      return
    }

    let cancelled = false

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        if (cancelled) return

        const scanner = new Html5Qrcode(scanRegionId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            const id = parseWorkerQr(decoded)
            if (id) {
              setWorkerId(id)
              setMessage(`Scanned: ${id}`)
              stopScanner()
              setMode("manual")
            }
          },
          () => {}
        )
      } catch (err: any) {
        console.error(err)
        setMessage("Camera permission denied or not available")
        setStatus("error")
        setMode("manual")
      }
    }

    startScanner()
    return () => {
      cancelled = true
      stopScanner()
    }
  }, [mode])

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
  }

  // ─── Selfie camera ────────────────────────────────────
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
      }
    } catch {
      setMessage("Could not access camera for selfie")
      setStatus("error")
    }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  function captureSelfie() {
    if (!videoRef.current) return
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      setSelfieDataUrl(canvas.toDataURL("image/jpeg", 0.7))
      stopCamera()
    }
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  // ─── Location + Clock ─────────────────────────────────
  async function getLocation() {
    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  async function handleClock() {
    if (!workerId || pin.length !== 4) {
      setMessage("Enter Worker ID and 4-digit PIN")
      setStatus("error")
      return
    }

    setStatus("loading")
    setMessage("")

    const location = await getLocation()
    const payload = {
      workerId: workerId.trim().toUpperCase(),
      pin,
      type,
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
      selfieUrl: selfieDataUrl || null,
    }

    // Offline: queue locally
    if (!isOnline()) {
      addToQueue(payload)
      refreshCount()
      setStatus("success")
      setMessage(
        `Saved offline — will sync when internet is back (${getPendingLabel()})`
      )
      setPin("")
      setSelfieDataUrl(null)
      return
    }

    // Online: try server, fall back to queue on network error
    try {
      const record = await attendanceApi.create(payload)
      setStatus("success")
      setMessage(
        `Successfully clocked ${type.toUpperCase()} at ${new Date(
          record.timestamp
        ).toLocaleTimeString()}`
      )
      setPin("")
      setSelfieDataUrl(null)
    } catch (err: any) {
      // Network failure → queue
      if (!navigator.onLine || err.message?.includes("Failed to fetch")) {
        addToQueue(payload)
        refreshCount()
        setStatus("success")
        setMessage("Saved offline — will sync when internet is back")
        setPin("")
        setSelfieDataUrl(null)
      } else {
        setStatus("error")
        setMessage(err.message || "Clock failed")
      }
    }
  }

  function getPendingLabel() {
    const n = pendingCount + 1
    return `${n} pending`
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0b1220]">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Clock In / Out</h1>
          <p className="text-slate-400 text-sm mt-1">SiteClock Pro</p>
        </div>

        {/* Online / Offline banner */}
        <div
          className={`rounded-xl px-4 py-2.5 text-sm text-center font-medium ${
            online
              ? "bg-emerald-900/30 border border-emerald-800 text-emerald-300"
              : "bg-amber-900/40 border border-amber-700 text-amber-200"
          }`}
        >
          {online ? (
            isSyncing ? (
              "Syncing offline records..."
            ) : pendingCount > 0 ? (
              <button onClick={() => syncNow()} className="underline">
                Online — {pendingCount} pending, tap to sync
              </button>
            ) : (
              "Online"
            )
          ) : (
            `Offline — clock-ins will be saved locally${
              pendingCount > 0 ? ` (${pendingCount} pending)` : ""
            }`
          )}
        </div>

        {/* Mode tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900 rounded-xl p-1">
          {([
            ["manual", "Manual"],
            ["scan", "Scan QR"],
            ["selfie", "Selfie"],
          ] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                stopScanner()
                stopCamera()
                setMode(m)
                setStatus("idle")
                setMessage("")
              }}
              className={`py-2 rounded-lg text-sm font-medium transition ${
                mode === m
                  ? "bg-orange-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("in")}
              className={`py-3 rounded-lg font-semibold transition ${
                type === "in"
                  ? "bg-orange-500 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Clock In
            </button>
            <button
              type="button"
              onClick={() => setType("out")}
              className={`py-3 rounded-lg font-semibold transition ${
                type === "out"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Clock Out
            </button>
          </div>

          {/* SCAN MODE */}
          {mode === "scan" && (
            <div className="space-y-3">
              <div
                id={scanRegionId}
                className="rounded-xl overflow-hidden bg-black min-h-[260px]"
              />
              <p className="text-center text-xs text-slate-500">
                Point camera at worker QR code
              </p>
              {workerId && (
                <p className="text-center text-orange-400 text-sm font-mono">
                  Detected: {workerId}
                </p>
              )}
            </div>
          )}

          {/* SELFIE MODE */}
          {mode === "selfie" && (
            <div className="space-y-3">
              {!selfieDataUrl ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full rounded-xl bg-black aspect-[4/3] object-cover"
                  />
                  <div className="flex gap-2">
                    {!cameraActive ? (
                      <button
                        onClick={startCamera}
                        className="flex-1 py-2 rounded-lg bg-slate-700 text-white text-sm"
                      >
                        Start Camera
                      </button>
                    ) : (
                      <button
                        onClick={captureSelfie}
                        className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold"
                      >
                        Capture Selfie
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <img
                    src={selfieDataUrl}
                    alt="Selfie"
                    className="w-full rounded-xl"
                  />
                  <button
                    onClick={() => {
                      setSelfieDataUrl(null)
                      startCamera()
                    }}
                    className="w-full py-2 rounded-lg bg-slate-700 text-white text-sm"
                  >
                    Retake
                  </button>
                </div>
              )}
              <p className="text-center text-xs text-slate-500">
                Selfie is optional but recommended
              </p>
            </div>
          )}

          {/* MANUAL / shared fields */}
          {(mode === "manual" || mode === "selfie" || workerId) && mode !== "scan" && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Worker ID
                </label>
                <input
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white text-center text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="W001"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="••••"
                />
              </div>

              {selfieDataUrl && mode === "manual" && (
                <div className="flex items-center gap-3">
                  <img
                    src={selfieDataUrl}
                    alt="Selfie"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <span className="text-xs text-orange-400">Selfie attached</span>
                </div>
              )}

              {message && (
                <div
                  className={`text-sm rounded-lg px-4 py-3 ${
                    status === "success"
                      ? "bg-emerald-900/40 border border-emerald-700 text-emerald-200"
                      : "bg-red-900/40 border border-red-700 text-red-200"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                onClick={handleClock}
                disabled={status === "loading"}
                className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 text-lg transition"
              >
                {status === "loading"
                  ? "Processing..."
                  : `Confirm Clock ${type.toUpperCase()}`}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          Works offline — records sync when internet returns.
          <br />
          Demo worker: W001 / PIN 1234
        </p>

        <div className="text-center">
          <Link href="/" className="text-slate-500 hover:text-white text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
