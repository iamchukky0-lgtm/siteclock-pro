"use client"

import { useEffect, useRef, useState } from "react"
import { workerQrValue } from "@/lib/qr"

type Props = {
  workerId: string
  workerName: string
  size?: number
}

export default function WorkerQR({ workerId, workerName, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    async function generate() {
      try {
        const QRCode = (await import("qrcode")).default
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, workerQrValue(workerId), {
            width: size,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          })
        }
      } catch (err) {
        console.error(err)
        setError("Failed to generate QR")
      }
    }
    generate()
  }, [workerId, size])

  function download() {
    if (!canvasRef.current) return
    const link = document.createElement("a")
    link.download = `QR-${workerId}-${workerName.replace(/\s+/g, "_")}.png`
    link.href = canvasRef.current.toDataURL("image/png")
    link.click()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <canvas ref={canvasRef} className="rounded-lg bg-white p-2" />
      )}
      <div className="text-center">
        <p className="font-semibold text-white">{workerName}</p>
        <p className="text-sm text-slate-400 font-mono">{workerId}</p>
      </div>
      <button
        onClick={download}
        className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
      >
        Download QR
      </button>
    </div>
  )
}
