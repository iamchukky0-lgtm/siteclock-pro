import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAdminSession } from "@/lib/auth"

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
    if (body.name !== undefined) data.name = body.name.trim()
    if (body.isActive !== undefined) data.isActive = !!body.isActive

    const company = await prisma.company.update({ where: { id }, data })
    return NextResponse.json(company)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession()
    if (!session || !session.isGlobalAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const [sites, workers, admins] = await Promise.all([
      prisma.site.count({ where: { companyId: id } }),
      prisma.worker.count({ where: { companyId: id } }),
      prisma.admin.count({ where: { companyId: id } }),
    ])

    if (sites + workers + admins > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${sites} site(s), ${workers} worker(s), ${admins} admin(s) still assigned. Reassign or deactivate instead.`,
        },
        { status: 400 }
      )
    }

    await prisma.company.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 })
  }
}
