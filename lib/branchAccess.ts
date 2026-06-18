import { getSession } from './auth'

/**
 * Validates that the current user has access to the specified branch.
 * INPUTTER and VIEWER users can only access their own branch.
 * ADMIN users can access any branch.
 * Returns the session if authorized, or null if not.
 */
export async function validateBranchAccess(targetBranchId?: string) {
  const session = await getSession()
  if (!session) return null

  // Admin can access any branch
  if (session.role === 'ADMIN') return session

  // INPUTTER and VIEWER can only access their own branch
  if (!session.branchId) return null

  if (targetBranchId && targetBranchId !== session.branchId) {
    return null // trying to access another branch's data
  }

  return session
}

/**
 * Returns the branchId the current user is scoped to.
 * For ADMIN, returns the provided targetBranchId or null (meaning all branches).
 * For INPUTTER/VIEWER, returns their assigned branchId.
 */
export function getBranchScope(
  session: { role: string; branchId: string | null },
  targetBranchId?: string | null
): string | null {
  if (session.role === 'ADMIN') {
    return targetBranchId || null // null means all branches
  }
  return session.branchId
}