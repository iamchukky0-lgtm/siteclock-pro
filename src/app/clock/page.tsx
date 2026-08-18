"use client"

import { useState, useRef, useEffect } from "react"
import { attendanceApi } from "@/lib/api"
import { parseWorkerQr } from "@/lib/qr"
import { addToQueue, isOnline } from "@/lib/offlineQueue"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import Link from "next/link"

export default function WorkerClockPage() {
  const [workerId, setWorkerId] = useState("")
  const [pin, setPin] = useState("")
  const [type, setType] = useState<"in" | "out">("in")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null)
  const [step, setStep] = useState<"details" | "scan" | "selfie">("details")

  const { pendingCount, isSyncing, isOnline: online, syncNow, refreshCount } =
    useOfflineSync()

  const scannerRef = useRef<any>(null)
  const scanRegionId = "qr-reader"
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraActive, setCameraActive] = useState(false)

  // QR Scanner
  useEffect(() => {
    if (step !== "scan") {
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
              setStep("details")
            }
          },
          () => {}
        )
      } catch {
        setMessage("Camera not available for QR scan")
        setStatus("error")
        setStep("details")
      }
    }
    startScanner()
    return () => {
      cancelled = true
      stopScanner()
    }
  }, [step])

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
  }

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
      setMessage("Could not access camera")
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
      setStep("details")
      setMessage("Selfie captured — enter PIN and confirm")
      setStatus("idle")
    }
  }

  useEffect(() => () => stopCamera(), [])

  async function getLocation() {
    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  async function handleClock() {
    if (!workerId.trim() || pin.length !== 4) {
      setMessage("Enter Worker ID and 4-digit PIN")
      setStatus("error")
      return
    }
    if (!selfieDataUrl) {
      setMessage("Selfie required — take a photo for verification")
      setStatus("error")
      setStep("selfie")
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
      selfieUrl: selfieDataUrl,
    }

    if (!isOnline()) {
      addToQueue(payload)
      refreshCount()
      setStatus("success")
      setMessage("Saved offline — will sync when internet is back")
      setPin("")
      setSelfieDataUrl(null)
      return
    }

    try {
      const record = (await attendanceApi.create(payload)) as {
        timestamp: string
      }
      setStatus("success")
      setMessage(
        `Clocked ${type.toUpperCase()} at ${new Date(
          record.timestamp
        ).toLocaleTimeString()}`
      )
      setPin("")
      setSelfieDataUrl(null)
    } catch (err: any) {
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

  return (
    <main className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-4 pb-10 bg-[#0b1220] overflow-x-hidden">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-xl bg-orange-500 text-white font-bold text-lg items-center justify-center mb-3">
            SC
          </div>
          <h1 className="text-2xl font-bold text-white">Clock In / Out</h1>
          <p className="text-slate-500 text-sm mt-1">SiteClock Pro</p>
        </div>

        {/* Online status */}
        <div
          className={`rounded-xl px-4 py-2 text-sm text-center font-medium ${
            online
              ? "bg-emerald-900/30 border border-emerald-800 text-emerald-300"
              : "bg-amber-900/40 border border-amber-700 text-amber-200"
          }`}
        >
          {online
            ? isSyncing
              ? "Syncing offline records..."
              : pendingCount > 0
              ? `${pendingCount} pending — tap to sync`
              : "● Online"
            : "○ Offline — saves on device"}
          {online && pendingCount > 0 && !isSyncing && (
            <button onClick={() => syncNow()} className="ml-2 underline">
              Sync
            </button>
          )}
        </div>

        {/* Clock in / out */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("in")}
            className={`py-3.5 rounded-xl font-bold text-base transition ${
              type === "in"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            Clock In
          </button>
          <button
            type="button"
            onClick={() => setType("out")}
            className={`py-3.5 rounded-xl font-bold text-base transition ${
              type === "out"
                ? "bg-amber-600 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            Clock Out
          </button>
        </div>

        {/* Main card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          {/* Step tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950 rounded-xl p-1">
            {(
              [
                ["details", "Details"],
                ["scan", "Scan QR"],
                ["selfie", "Selfie"],
              ] as const
            ).map(([s, label]) => (
              <button
                key={s}
                onClick={() => {
                  stopScanner()
                  stopCamera()
                  setStep(s)
                  setStatus("idle")
                  if (s !== "details") setMessage("")
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition ${
                  step === s
                    ? "bg-orange-500 text-white"
                    : "text-slate-500"
                }`}
              >
                {label}
                {s === "selfie" && selfieDataUrl ? " ✓" : ""}
              </button>
            ))}
          </div>

          {step === "scan" && (
            <div className="space-y-2">
              <div
                id={scanRegionId}
                className="rounded-xl overflow-hidden bg-black min-h-[240px]"
              />
              <p className="text-center text-xs text-slate-500">
                Point camera at your worker QR code
              </p>
            </div>
          )}

          {step === "selfie" && (
            <div className="space-y-3">
              {!selfieDataUrl ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full rounded-xl bg-black aspect-[4/3] object-cover"
                  />
                  {!cameraActive ? (
                    <button
                      onClick={startCamera}
                      className="w-full py-3 rounded-xl bg-slate-700 text-white font-semibold"
                    >
                      Open Camera
                    </button>
                  ) : (
                    <button
                      onClick={captureSelfie}
                      className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold"
                    >
                      Capture Selfie
                    </button>
                  )}
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
                    className="w-full py-2 rounded-xl bg-slate-700 text-white text-sm"
                  >
                    Retake photo
                  </button>
                </div>
              )}
              <p className="text-center text-xs text-orange-400/80">
                Required for verification on every clock in/out
              </p>
            </div>
          )}

          {step === "details" && (
            <>
              {/* Selfie status chip */}
              <button
                type="button"
                onClick={() => setStep("selfie")}
                className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  selfieDataUrl
                    ? "border-emerald-700 bg-emerald-900/20"
                    : "border-orange-700/50 bg-orange-900/10"
                }`}
              >
                {selfieDataUrl ? (
                  <img
                    src={selfieDataUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-lg">
                    📷
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {selfieDataUrl ? "Selfie ready" : "Take verification selfie"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selfieDataUrl ? "Tap to retake" : "Required before confirm"}
                  </p>
                </div>
              </button>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Worker ID
                </label>
                <input
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  name="worker-id"
                  inputMode="text"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3.5 text-white text-center text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. W001"
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
                  autoComplete="one-time-code"
                  name="worker-pin"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3.5 text-white text-center text-2xl tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="••••"
                />
              </div>

              {message && (
                <div
                  className={`text-sm rounded-xl px-4 py-3 ${
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
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 text-lg transition shadow-lg shadow-orange-500/20"
              >
                {status === "loading"
                  ? "Processing..."
                  : `Confirm Clock ${type.toUpperCase()}`}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 leading-relaxed">
          Selfie + PIN required · Location used for geofence
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
