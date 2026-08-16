import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession, verifyWorkerPin } from "@/lib/auth"
import { isInsideGeofence } from "@/lib/geofence"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get("limit") || 500)
    const siteId = searchParams.get("siteId")
    const workerId = searchParams.get("workerId")
    const date = searchParams.get("date")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const where: any = {}
    if (siteId) where.siteId = siteId
    if (workerId) where.workerId = workerId

    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.timestamp = { gte: start, lte: end }
    } else if (from || to) {
      where.timestamp = {}
      if (from) {
        const start = new Date(from)
        start.setHours(0, 0, 0, 0)
        where.timestamp.gte = start
      }
      if (to) {
        const end = new Date(to)
        end.setHours(23, 59, 59, 999)
        where.timestamp.lte = end
      }
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      workerId,
      pin,
      type,
      latitude,
      longitude,
      selfieUrl,
      distanceFromSite,
      absenceReason,
      overrideNote,
      status = "verified",
      siteId,
      skipGeofence = false, // admin bulk/override can skip
    } = body

    if (!workerId || !type) {
      return NextResponse.json(
        { error: "workerId and type are required" },
        { status: 400 }
      )
    }

    let isWorkerSelfClock = false

    if (pin) {
      const result = await verifyWorkerPin(workerId, pin)
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 401 })
      }
      isWorkerSelfClock = true
    } else {
      const session = await getAdminSession()
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const worker = await prisma.worker.findUnique({
      where: { workerId },
      include: { site: true },
    })

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 })
    }

    const resolvedSiteId = siteId || worker.siteId
    let site = worker.site

    // Load site if different from worker's assigned site
    if (resolvedSiteId && (!site || site.id !== resolvedSiteId)) {
      site = await prisma.site.findUnique({ where: { id: resolvedSiteId } })
    }

    let computedDistance: number | null =
      distanceFromSite != null ? Number(distanceFromSite) : null
    let finalStatus = status

    // ── Geofence check (worker self clock-in only, not absences) ──
    if (
      isWorkerSelfClock &&
      !skipGeofence &&
      type !== "absent" &&
      site &&
      site.latitude != null &&
      site.longitude != null
    ) {
      if (latitude == null || longitude == null) {
        return NextResponse.json(
          {
            error:
              "Location required for clock-in. Please enable GPS and try again.",
            code: "LOCATION_REQUIRED",
          },
          { status: 400 }
        )
      }

      const { inside, distance } = isInsideGeofence(
        Number(latitude),
        Number(longitude),
        site.latitude,
        site.longitude,
        site.radiusMetres || 250
      )
      computedDistance = distance

      if (!inside) {
        return NextResponse.json(
          {
            error: `You are ${distance}m from the site (allowed: ${site.radiusMetres}m). Move closer and try again.`,
            code: "OUTSIDE_GEOFENCE",
            distance,
            radiusMetres: site.radiusMetres,
            siteName: site.siteName,
          },
          { status: 403 }
        )
      }
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        workerId: worker.workerId,
        workerDbId: worker.id,
        workerName: worker.fullName,
        siteId: resolvedSiteId,
        type,
        timestamp: new Date(),
        selfieUrl: selfieUrl || null,
        latitude: latitude != null ? Number(latitude) : null,
        longitude: longitude != null ? Number(longitude) : null,
        distanceFromSite: computedDistance,
        absenceReason: absenceReason || null,
        overrideNote: overrideNote || null,
        status: finalStatus,
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to create attendance record" },
      { status: 500 }
    )
  }
}
