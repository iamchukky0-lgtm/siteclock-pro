import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const site = await prisma.site.findUnique({ where: { id } })
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }
    return NextResponse.json(site)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch site" }, { status: 500 })
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
    if (body.siteName !== undefined) data.siteName = body.siteName
    if (body.address !== undefined) data.address = body.address || null
    if (body.latitude !== undefined) data.latitude = body.latitude === "" || body.latitude == null ? null : Number(body.latitude)
    if (body.longitude !== undefined) data.longitude = body.longitude === "" || body.longitude == null ? null : Number(body.longitude)
    if (body.radiusMetres !== undefined) data.radiusMetres = Number(body.radiusMetres) || 250
    if (body.isActive !== undefined) data.isActive = !!body.isActive
    if (body.whatsappNotificationsEnabled !== undefined) data.whatsappNotificationsEnabled = !!body.whatsappNotificationsEnabled

    const site = await prisma.site.update({
      where: { id },
      data,
    })

    return NextResponse.json(site)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update site" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session || !session.isGlobalAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    await prisma.worker.updateMany({
      where: { siteId: id },
      data: { siteId: null },
    })

    await prisma.site.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete site" }, { status: 500 })
  }
}