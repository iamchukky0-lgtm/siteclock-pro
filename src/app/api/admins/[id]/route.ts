import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession, hashPassword } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session || !session.isGlobalAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const data: any = {}
    if (body.fullName !== undefined) data.fullName = body.fullName
    if (body.email !== undefined) data.email = body.email
    if (body.role !== undefined) data.role = body.role
    if (body.isGlobalAdmin !== undefined) data.isGlobalAdmin = !!body.isGlobalAdmin
    if (body.isPayrollManager !== undefined) data.isPayrollManager = !!body.isPayrollManager
    if (body.assignedSiteIds !== undefined) {
      data.assignedSiteIds = JSON.stringify(body.assignedSiteIds || [])
    }
    if (body.phoneNumber !== undefined) data.phoneNumber = body.phoneNumber || null
    if (body.isActive !== undefined) data.isActive = !!body.isActive
    if (body.mustChangePassword !== undefined) data.mustChangePassword = !!body.mustChangePassword

    // Optional password change
    if (body.password && body.password.length >= 4) {
      data.passwordHash = await hashPassword(body.password)
      data.mustChangePassword = false
    }

    // Keep role consistent
    if (data.isGlobalAdmin || data.isPayrollManager) {
      data.role = "payroll_manager"
      data.isPayrollManager = true
    }

    const admin = await prisma.admin.update({
      where: { id },
      data,
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
        mustChangePassword: true,
      },
    })

    return NextResponse.json({
      ...admin,
      assignedSiteIds: JSON.parse(admin.assignedSiteIds || "[]"),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update admin" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session || !session.isGlobalAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Prevent deleting yourself
    if (id === session.adminId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    await prisma.admin.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 })
  }
}
