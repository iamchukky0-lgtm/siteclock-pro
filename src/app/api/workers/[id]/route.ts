import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const worker = await prisma.worker.findUnique({
      where: { id },
      include: { site: true },
    })
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 })
    }
    return NextResponse.json(worker)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch worker" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const data: any = {}
    const fields = [
      "fullName", "workerId", "phoneNumber", "pin", "trade", "siteId",
      "idNumber", "residentialAddress", "nextOfKinName", "nextOfKinPhone",
      "nextOfKinRelationship", "hasWorkPermit", "status",
      "weekdayDailyRate", "overtimeHourlyRate", "saturdayDailyRate",
      "profilePhotoUrl", "workPermitPhotoUrl", "idDocumentUrl",
    ]

    for (const f of fields) {
      if (body[f] !== undefined) {
        if (["weekdayDailyRate", "overtimeHourlyRate", "saturdayDailyRate"].includes(f)) {
          data[f] = body[f] === "" || body[f] == null ? null : Number(body[f])
        } else if (f === "hasWorkPermit") {
          data[f] = !!body[f]
        } else if (f === "siteId") {
          data[f] = body[f] || null
        } else {
          data[f] = body[f]
        }
      }
    }

    // Check unique workerId if changing
    if (data.workerId) {
      const existing = await prisma.worker.findFirst({
        where: { workerId: data.workerId, NOT: { id } },
      })
      if (existing) {
        return NextResponse.json({ error: "Worker ID already exists" }, { status: 409 })
      }
    }

    const worker = await prisma.worker.update({
      where: { id },
      data,
      include: { site: true },
    })

    return NextResponse.json(worker)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update worker" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await prisma.worker.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete worker" }, { status: 500 })
  }
}
