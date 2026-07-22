import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ADMIN_ROLES, STAFF_ROLES } from './roles'
import type { AppRole } from '@/types'

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  admin: ReturnType<typeof createSupabaseAdminClient>
  user: User
  role: string | null
  schoolId: string | null
}

export async function getAuthContext(): Promise<AuthContext | { error: NextResponse }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const [{ data: role }, { data: schoolId }] = await Promise.all([
    supabase.rpc('get_current_user_role'),
    supabase.rpc('current_user_school_id'),
  ])
  const admin = createSupabaseAdminClient()

  return {
    supabase,
    admin,
    user,
    role: typeof role === 'string' ? role : null,
    schoolId: typeof schoolId === 'string' ? schoolId : null,
  }
}

export function isAuthError(context: AuthContext | { error: NextResponse }): context is { error: NextResponse } {
  return 'error' in context
}

export async function requireAdmin() {
  const context = await getAuthContext()
  if (isAuthError(context)) return context
  if (!context.role || !ADMIN_ROLES.includes(context.role as AppRole)) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }
  return context
}

export async function requireStaff() {
  const context = await getAuthContext()
  if (isAuthError(context)) return context
  if (!context.role || !STAFF_ROLES.includes(context.role as AppRole)) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }
  return context
}

export async function hasPermission(context: AuthContext, permission: string) {
  const { data } = await context.supabase.rpc('current_user_has_permission', {
    permission_to_check: permission,
  })
  return data === true
}

export async function requireHonoursPermission(permission = 'honours.view') {
  const context = await getAuthContext()
  if (isAuthError(context)) return context
  if (!context.schoolId || !(await hasPermission(context, permission))) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }
  return context
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
