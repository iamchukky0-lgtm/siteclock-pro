import { NextRequest, NextResponse } from "next/server"
import { loginAdmin } from "@/lib/auth"

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

    const result = await loginAdmin(email, password)

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: result.session.adminId,
        email: result.session.email,
        fullName: result.session.fullName,
        isGlobalAdmin: result.session.isGlobalAdmin,
        isPayrollManager: result.session.isPayrollManager,
      },
      mustChangePassword: result.mustChangePassword,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
