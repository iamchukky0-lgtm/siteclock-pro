import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession } from "@/lib/auth"
import { companyWhere, resolveCompanyId } from "@/lib/companyScope"

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession()
    const { searchParams } = new URL(req.url)
    const all = searchParams.get("all") === "true"

    const where: any = {
      ...(all ? {} : { isActive: true }),
      ...(session ? companyWhere(session) : {}),
    }

    let sites = await prisma.site.findMany({
      where,
      orderBy: { siteName: "asc" },
    })

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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const companyId = resolveCompanyId(session, body.companyId)

    const site = await prisma.site.create({
      data: {
        siteName: body.siteName,
        address: body.address || null,
        latitude: body.latitude != null ? Number(body.latitude) : null,
        longitude: body.longitude != null ? Number(body.longitude) : null,
        radiusMetres: body.radiusMetres != null ? Number(body.radiusMetres) : 250,
        isActive: body.isActive !== false,
        whatsappNotificationsEnabled: !!body.whatsappNotificationsEnabled,
        createdBy: session.email,
        companyId,
      },
    })

    return NextResponse.json(site, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create site" }, { status: 500 })
  }
}
