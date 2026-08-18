/**
 * One-time: assign existing sites/workers/admins to default company
 * Run: node prisma/backfill-company.js
 */
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  let company = await prisma.company.findFirst({ where: { id: "default-company" } })
  if (!company) {
    company = await prisma.company.create({
      data: { id: "default-company", name: "Main Company", isActive: true },
    })
    console.log("Created default company")
  }

  const id = company.id
  const a = await prisma.admin.updateMany({
    where: { companyId: null },
    data: { companyId: id },
  })
  const s = await prisma.site.updateMany({
    where: { companyId: null },
    data: { companyId: id },
  })
  const w = await prisma.worker.updateMany({
    where: { companyId: null },
    data: { companyId: id },
  })
  console.log(`Backfilled admins=${a.count} sites=${s.count} workers=${w.count}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
