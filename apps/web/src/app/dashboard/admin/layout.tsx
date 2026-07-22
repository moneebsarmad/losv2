import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')
  const { data: allowed } = await supabase.rpc('has_admin_portal_access')
  if (allowed !== true) redirect('/dashboard')

  return children
}
