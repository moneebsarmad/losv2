import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/server'

export async function GET() {
  const context = await getAuthContext()
  if (isAuthError(context)) return context.error

  const [rValues, domains, pointValues] = await Promise.all([
    context.admin.from('r_values').select('id,key,name,description,sort_order').order('sort_order'),
    context.admin.from('domains').select('id,key,name,description,sort_order').eq('is_active', true).order('sort_order'),
    context.admin.from('point_values').select('value,label,description,sort_order').eq('is_active', true).order('sort_order'),
  ])

  return NextResponse.json({
    rValues: rValues.data ?? [],
    domains: domains.data ?? [],
    pointValues: pointValues.data ?? [],
  })
}
