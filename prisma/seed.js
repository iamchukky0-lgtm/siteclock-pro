const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const company = await prisma.company.upsert({
    where: { id: "default-company" },
    update: {},
    create: {
      id: "default-company",
      name: "Main Company",
      isActive: true,
    },
  })
  console.log("Company:", company.name)

  const passwordHash = await bcrypt.hash("admin123", 10)

  const admin = await prisma.admin.upsert({
    where: { email: "admin@siteclock.local" },
    update: { companyId: company.id },
    create: {
      fullName: "Main Admin",
      email: "admin@siteclock.local",
      passwordHash,
      role: "payroll_manager",
      isGlobalAdmin: true,
      isPayrollManager: true,
      assignedSiteIds: "[]",
      isActive: true,
      companyId: company.id,
    },
  })
  console.log("Admin:", admin.email)

  const site = await prisma.site.upsert({
    where: { id: "sample-site-1" },
    update: { companyId: company.id },
    create: {
      id: "sample-site-1",
      siteName: "Main Construction Site",
      address: "123 Building Road, Johannesburg",
      latitude: -26.2041,
      longitude: 28.0473,
      radiusMetres: 250,
      isActive: true,
      createdBy: admin.email,
      companyId: company.id,
    },
  })
  console.log("Site:", site.siteName)

  const worker = await prisma.worker.upsert({
    where: { workerId: "W001" },
    update: { companyId: company.id },
    create: {
      fullName: "John Molefe",
      workerId: "W001",
      phoneNumber: "0821234567",
      pin: "1234",
      status: "active",
      trade: "Bricklayer",
      siteId: site.id,
      companyId: company.id,
      weekdayDailyRate: 450,
      overtimeHourlyRate: 75,
      saturdayDailyRate: 350,
    },
  })
  console.log("Worker:", worker.workerId, "PIN 1234")
  console.log("Seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
