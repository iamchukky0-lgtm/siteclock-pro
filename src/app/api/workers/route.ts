import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "active"
    const siteId = searchParams.get("siteId")

    const where: any = {}
    if (status !== "all") where.status = status
    if (siteId) where.siteId = siteId

    // If admin is site-restricted, filter
    if (session && !session.isGlobalAdmin && session.assignedSiteIds) {
      where.siteId = { in: session.assignedSiteIds }
    }

    const workers = await prisma.worker.findMany({
      where,
      include: { site: true },
      orderBy: { fullName: "asc" },
    })

    return NextResponse.json(workers)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch workers" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      fullName,
      workerId,
      phoneNumber,
      pin,
      trade,
      siteId,
      idNumber,
      residentialAddress,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinRelationship,
      hasWorkPermit,
      weekdayDailyRate,
      overtimeHourlyRate,
      saturdayDailyRate,
    } = body

    if (!fullName || !workerId || !pin) {
      return NextResponse.json(
        { error: "fullName, workerId and pin are required" },
        { status: 400 }
      )
    }

    const existing = await prisma.worker.findUnique({ where: { workerId } })
    if (existing) {
      return NextResponse.json(
        { error: "Worker ID already exists" },
        { status: 409 }
      )
    }

    const worker = await prisma.worker.create({
      data: {
        fullName,
        workerId,
        phoneNumber,
        pin,
        trade,
        siteId: siteId || null,
        idNumber,
        residentialAddress,
        nextOfKinName,
        nextOfKinPhone,
        nextOfKinRelationship,
        hasWorkPermit: !!hasWorkPermit,
        weekdayDailyRate: weekdayDailyRate ? Number(weekdayDailyRate) : null,
        overtimeHourlyRate: overtimeHourlyRate ? Number(overtimeHourlyRate) : null,
        saturdayDailyRate: saturdayDailyRate ? Number(saturdayDailyRate) : null,
        status: "active",
      },
    })

    return NextResponse.json(worker, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create worker" }, { status: 500 })
  }
}
