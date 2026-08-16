"use client"

import { useMemo } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix default marker icons in Next.js
const iconIn = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const iconOut = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const iconSite = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

type Record = {
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

function FitBounds({
  records,
  sites,
}: {
  records: Record[]
  sites: Site[]
}) {
  const map = useMap()
  useMemo(() => {
    const points: [number, number][] = []
    records.forEach((r) => {
      if (r.latitude != null && r.longitude != null)
        points.push([r.latitude, r.longitude])
    })
    sites.forEach((s) => {
      if (s.latitude != null && s.longitude != null)
        points.push([s.latitude, s.longitude])
    })
    if (points.length === 1) {
      map.setView(points[0], 15)
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] })
    }
  }, [map, records, sites])
  return null
}

export default function AttendanceMapInner({
  records,
  sites,
}: {
  records: Record[]
  sites: Site[]
}) {
  const center: [number, number] = useMemo(() => {
    const first = records[0] || sites.find((s) => s.latitude != null)
    if (first && "latitude" in first && first.latitude != null)
      return [first.latitude, first.longitude!]
    return [-26.2041, 28.0473] // Johannesburg default
  }, [records, sites])

  return (
    <div className="w-full h-[420px] rounded-xl overflow-hidden border border-slate-800">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds records={records} sites={sites} />

        {/* Site centres + geofence circles */}
        {sites.map(
          (s) =>
            s.latitude != null &&
            s.longitude != null && (
              <span key={s.id}>
                <Marker position={[s.latitude, s.longitude]} icon={iconSite}>
                  <Popup>
                    <strong>{s.siteName}</strong>
                    <br />
                    Radius: {s.radiusMetres || 250}m
                  </Popup>
                </Marker>
                <Circle
                  center={[s.latitude, s.longitude]}
                  radius={s.radiusMetres || 250}
                  pathOptions={{
                    color: "#3b82f6",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.1,
                    weight: 2,
                  }}
                />
              </span>
            )
        )}

        {/* Attendance markers */}
        {records.map((r) => (
          <Marker
            key={r.id}
            position={[r.latitude!, r.longitude!]}
            icon={r.type === "in" ? iconIn : iconOut}
          >
            <Popup>
              <strong>{r.workerName}</strong> ({r.workerId})
              <br />
              {r.type.toUpperCase()} —{" "}
              {new Date(r.timestamp).toLocaleString()}
              {r.distanceFromSite != null && (
                <>
                  <br />
                  Distance: {r.distanceFromSite}m
                </>
              )}
              <br />
              Status: {r.status}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
