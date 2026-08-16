import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession, hashPassword } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only global admins can list all admins
    if (!session.isGlobalAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admins = await prisma.admin.findMany({
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isGlobalAdmin: true,
        isPayrollManager: true,
        assignedSiteIds: true,
        mustChangePassword: true,
        isActive: true,
        phoneNumber: true,
        createdAt: true,
      },
    })

    // Parse assignedSiteIds JSON
    const result = admins.map((a) => ({
      ...a,
      assignedSiteIds: (() => {
        try {
          return JSON.parse(a.assignedSiteIds || "[]")
        } catch {
          return []
        }
      })(),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 })
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
      fullName,
      email,
      password,
      role = "supervisor",
      isGlobalAdmin = false,
      isPayrollManager = false,
      assignedSiteIds = [],
      phoneNumber,
    } = body

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "fullName, email and password are required" },
        { status: 400 }
      )
    }

    const existing = await prisma.admin.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const admin = await prisma.admin.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: isGlobalAdmin || isPayrollManager ? "payroll_manager" : role,
        isGlobalAdmin: !!isGlobalAdmin,
        isPayrollManager: !!isPayrollManager || !!isGlobalAdmin,
        assignedSiteIds: JSON.stringify(assignedSiteIds || []),
        phoneNumber: phoneNumber || null,
        isActive: true,
        mustChangePassword: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isGlobalAdmin: true,
        isPayrollManager: true,
        assignedSiteIds: true,
        isActive: true,
        phoneNumber: true,
      },
    })

    return NextResponse.json(
      {
        ...admin,
        assignedSiteIds: JSON.parse(admin.assignedSiteIds || "[]"),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 })
  }
}
