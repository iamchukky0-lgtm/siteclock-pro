import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs"
import prisma from "@/lib/db"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "siteclock-pro-dev-secret"
)
const COOKIE_NAME = "siteclock_admin_token"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    let assignedSiteIds: string[] | null = null
    try {
      assignedSiteIds = JSON.parse(admin.assignedSiteIds || "[]")
      if (Array.isArray(assignedSiteIds) && assignedSiteIds.length === 0) {
        assignedSiteIds = null
      }
    } catch {
      assignedSiteIds = null
    }

    const session = {
      adminId: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      isGlobalAdmin: admin.isGlobalAdmin,
      isPayrollManager: admin.isPayrollManager || admin.isGlobalAdmin,
      assignedSiteIds: admin.isGlobalAdmin ? null : assignedSiteIds,
      phoneNumber: admin.phoneNumber,
    }

    const token = await new SignJWT({ ...session })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET)

    const response = NextResponse.json({
      success: true,
      admin: {
        id: session.adminId,
        email: session.email,
        fullName: session.fullName,
        isGlobalAdmin: session.isGlobalAdmin,
        isPayrollManager: session.isPayrollManager,
      },
      mustChangePassword: admin.mustChangePassword,
    })

    // Set cookie on the response (reliable in production)
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return response
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
