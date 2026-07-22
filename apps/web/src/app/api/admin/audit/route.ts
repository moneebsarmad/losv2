import { NextResponse } from 'next/server'
import { isAuthError, requireAdmin } from '@/lib/auth/server'

export async function GET() {
  const context = await requireAdmin()
  if (isAuthError(context)) return context.error

  const { data, error } = await context.admin
    .from('audit_logs')
    .select('id, user_id, action, table_name, record_id, created_at')
    .eq('school_id', context.schoolId!)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ auditLogs: data ?? [] })
}
