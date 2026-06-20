import { getSession } from './auth'

type BranchAccessType = 'all' | 'custom' | 'single'

interface BranchAccess {
  type: BranchAccessType
  branchIds?: string[]
}

/**
 * Checks if the current user has access to the specified branch.
 * - ADMIN users can access any branch
 * - INPUTTER/VIEWER with branchAccess.type = 'all' can access all branches
 * - INPUTTER/VIEWER with branchAccess.type = 'custom' can access specific branches
 * - INPUTTER/VIEWER with branchAccess.type = 'single' can access their own branch only
 */
export function hasBranchAccess(session: {
  role: string
  branchId: string | null
  branchAccess?: BranchAccess | null
}, targetBranchId?: string): boolean {
  if (session.role === 'ADMIN') return true
  if (!targetBranchId) return true

  const branchAccess = session.branchAccess

  if (branchAccess?.type === 'all') {
    return true
  }

  if (branchAccess?.type === 'custom') {
    return branchAccess.branchIds?.includes(targetBranchId) || false
  }

  // single branch or no branchAccess - use old behavior
  if (!session.branchId) return false
  return session.branchId === targetBranchId
}

/**
 * Validates that the current user has access to the specified branch.
 * Returns the session if authorized, or null if not.
 */
export async function validateBranchAccess(targetBranchId?: string) {
  const session = await getSession()
  if (!session) return null

  if (!hasBranchAccess(session, targetBranchId)) {
    return null
  }

  return session
}

/**
 * Returns the branch filter for Prisma queries.
 * - ADMIN: all branches or specific targetBranchId
 * - INPUTTER/VIEWER with all access: all branches
 * - INPUTTER/VIEWER with custom access: specific branches
 * - INPUTTER/VIEWER with single access: their own branch
 */
export function getBranchFilter(session: {
  role: string
  branchId: string | null
  branchAccess?: BranchAccess | null
}, targetBranchId?: string | null) {
  if (session.role === 'ADMIN') {
    return targetBranchId ? { branchId: targetBranchId } : {}
  }

  const branchAccess = session.branchAccess

  if (branchAccess?.type === 'all') {
    return {}
  }

  if (branchAccess?.type === 'custom' && branchAccess.branchIds && branchAccess.branchIds.length > 0) {
    return { branchId: { in: branchAccess.branchIds } }
  }

  if (!session.branchId) {
    return { branchId: null }
  }

  return { branchId: session.branchId }
}