import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create default global admin
  const passwordHash = await bcrypt.hash("admin123", 10)

  const admin = await prisma.admin.upsert({
    where: { email: "admin@siteclock.local" },
    update: {},
    create: {
      fullName: "Main Admin",
      email: "admin@siteclock.local",
      passwordHash,
      role: "payroll_manager",
      isGlobalAdmin: true,
      isPayrollManager: true,
      assignedSiteIds: "[]",
      isActive: true,
    },
  })

  console.log("Created admin:", admin.email, "(password: admin123)")

  // Create a sample site
  const site = await prisma.site.upsert({
    where: { id: "sample-site-1" },
    update: {},
    create: {
      id: "sample-site-1",
      siteName: "Main Construction Site",
      address: "123 Building Road, Johannesburg",
      latitude: -26.2041,
      longitude: 28.0473,
      radiusMetres: 250,
      isActive: true,
      createdBy: admin.email,
    },
  })

  console.log("Created site:", site.siteName)

  // Create a sample worker
  const worker = await prisma.worker.upsert({
    where: { workerId: "W001" },
    update: {},
    create: {
      fullName: "John Molefe",
      workerId: "W001",
      phoneNumber: "0821234567",
      pin: "1234",
      status: "active",
      trade: "Bricklayer",
      siteId: site.id,
      weekdayDailyRate: 450,
      overtimeHourlyRate: 75,
      saturdayDailyRate: 350,
    },
  })

  console.log("Created worker:", worker.fullName, "(PIN: 1234)")

  console.log("Seed complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
