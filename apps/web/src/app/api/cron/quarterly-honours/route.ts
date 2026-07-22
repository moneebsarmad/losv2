import { NextResponse } from 'next/server'
import { runQuarterlyHonoursMaintenance } from '@/lib/honours/maintenance'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const outcomes = await runQuarterlyHonoursMaintenance(createSupabaseAdminClient())
    return NextResponse.json({ ok: true, outcomes })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quarterly honours maintenance failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
