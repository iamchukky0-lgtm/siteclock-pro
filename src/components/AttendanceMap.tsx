"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

type AttRecord = {
  id: string
  workerName: string
  workerId: string
  type: string
  timestamp: string
  latitude?: number | null
  longitude?: number | null
  distanceFromSite?: number | null
  status?: string
}

type Site = {
  id: string
  siteName: string
  latitude?: number | null
  longitude?: number | null
  radiusMetres?: number
}

type Props = {
  records: AttRecord[]
  sites: Site[]
}

// Dynamically import the actual map (leaflet needs window)
const MapInner = dynamic(() => import("./AttendanceMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
      Loading map...
    </div>
  ),
})

export default function AttendanceMap({ records, sites }: Props) {
  const withGps = records.filter(
    (r) => r.latitude != null && r.longitude != null
  )

  if (withGps.length === 0 && sites.every((s) => s.latitude == null)) {
    return (
      <div className="w-full h-[320px] rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-sm text-center px-4">
        No GPS coordinates yet.
        <br />
        Clock-ins with location will appear here.
      </div>
    )
  }

  return <MapInner records={withGps} sites={sites} />
}
