import type { AdminSession } from "./auth"

/** Prisma where fragment to scope by company for non-global admins */
export function companyWhere(session: AdminSession): { companyId?: string } {
  if (session.isGlobalAdmin) return {}
  if (session.companyId) return { companyId: session.companyId }
  return { companyId: "__none__" }
}

export function resolveCompanyId(
  session: AdminSession,
  requestedCompanyId?: string | null
): string | null {
  if (session.isGlobalAdmin) {
    return requestedCompanyId || session.companyId || null
  }
  return session.companyId || null
}
