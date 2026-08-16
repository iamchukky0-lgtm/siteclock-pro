import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getAdminSession()

    let sites = await prisma.site.findMany({
      where: { isActive: true },
      orderBy: { siteName: "asc" },
    })

    // Restrict non-global admins
    if (session && !session.isGlobalAdmin && session.assignedSiteIds) {
      sites = sites.filter((s) => session.assignedSiteIds!.includes(s.id))
    }

    return NextResponse.json(sites)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch sites" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session || !session.isGlobalAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      siteName,
      address,
      latitude,
      longitude,
      radiusMetres = 250,
      whatsappNotificationsEnabled = false,
    } = body

    if (!siteName) {
      return NextResponse.json({ error: "siteName is required" }, { status: 400 })
    }

    const site = await prisma.site.create({
      data: {
        siteName,
        address,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        radiusMetres: Number(radiusMetres) || 250,
        whatsappNotificationsEnabled: !!whatsappNotificationsEnabled,
        createdBy: session.email,
        isActive: true,
      },
    })

    return NextResponse.json(site, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create site" }, { status: 500 })
  }
}
