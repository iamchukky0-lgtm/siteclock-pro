import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import prisma from "./db"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "siteclock-pro-dev-secret"
)

const COOKIE_NAME = "siteclock_admin_token"

export type AdminSession = {
  adminId: string
  email: string
  fullName: string
  isGlobalAdmin: boolean
  isPayrollManager: boolean
  assignedSiteIds: string[] | null
  phoneNumber?: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createAdminToken(session: AdminSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)
}

export async function verifyAdminToken(
  token: string
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AdminSession
  } catch {
    return null
  }
}

export async function setAdminCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
}

export async function clearAdminCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyAdminToken(token)
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

/** Login an admin by email + password */
export async function loginAdmin(email: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin || !admin.isActive) {
    return { error: "Invalid email or password" }
  }

  const valid = await verifyPassword(password, admin.passwordHash)
  if (!valid) {
    return { error: "Invalid email or password" }
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

  const session: AdminSession = {
    adminId: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    isGlobalAdmin: admin.isGlobalAdmin,
    isPayrollManager: admin.isPayrollManager || admin.isGlobalAdmin,
    assignedSiteIds: admin.isGlobalAdmin ? null : assignedSiteIds,
    phoneNumber: admin.phoneNumber,
  }

  const token = await createAdminToken(session)
  await setAdminCookie(token)

  return { session, mustChangePassword: admin.mustChangePassword }
}

/** Verify a worker by workerId + PIN */
export async function verifyWorkerPin(workerId: string, pin: string) {
  const worker = await prisma.worker.findUnique({
    where: { workerId },
    include: { site: true },
  })

  if (!worker || worker.status !== "active") {
    return { error: "Worker not found or inactive" }
  }

  if (worker.pin !== pin) {
    return { error: "Incorrect PIN" }
  }

  return { worker }
}
