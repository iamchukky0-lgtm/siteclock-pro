import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Global admins see all; others only their company
    const where = session.isGlobalAdmin
      ? {}
      : session.companyId
      ? { id: session.companyId }
      : { id: "__none__" }

    const companies = await prisma.company.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { sites: true, workers: true, admins: true },
        },
      },
    })

    return NextResponse.json(companies)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session || !session.isGlobalAdmin) {
      return NextResponse.json({ error: "Only global admins can create companies" }, { status: 403 })
    }

    const body = await req.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 })
    }

    const company = await prisma.company.create({
      data: {
        name: body.name.trim(),
        isActive: body.isActive !== false,
      },
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 })
  }
}
