import { NextResponse } from 'next/server'
import { isAuthError, requireStaff } from '@/lib/auth/server'

export async function GET() {
  const context = await requireStaff()
  if (isAuthError(context)) return context.error

  const { data, error } = await context.admin
    .from('recognition_logs')
    .select('*, r_values(id,key,name), domains(id,key,name)')
    .eq('school_id', context.schoolId!)
    .eq('staff_user_id', context.user.id)
    .eq('record_status', 'active')
    .is('deleted_at', null)
    .eq('award_status', 'approved')
    .in('admin_review_status', ['approved', 'not_required'])
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ recognitions: data ?? [] })
}
