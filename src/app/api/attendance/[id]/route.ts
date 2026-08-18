import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const data: any = {}
    if (body.type !== undefined) data.type = body.type
    if (body.status !== undefined) data.status = body.status
    if (body.absenceReason !== undefined) data.absenceReason = body.absenceReason || null
    if (body.overrideNote !== undefined) data.overrideNote = body.overrideNote || null
    if (body.timestamp !== undefined) {
      const t = new Date(body.timestamp)
      if (isNaN(t.getTime())) {
        return NextResponse.json({ error: "Invalid date/time" }, { status: 400 })
      }
      data.timestamp = t
    }

    // Mark as edited by supervisor
    if (!data.overrideNote) {
      data.overrideNote = "Edited by supervisor"
    }
    if (!data.status || data.status === "verified") {
      data.status = "supervisor_override"
    }

    const record = await prisma.attendanceRecord.update({
      where: { id },
      data,
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await prisma.attendanceRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 })
  }
}
