import { redirect } from 'next/navigation'
import { QuarterlyHonoursConfiguration } from '@/components/admin/honours/QuarterlyHonoursConfiguration'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function QuarterlyHonoursConfigurationPage() {
  const supabase = await createSupabaseServerClient()
  const { data: allowed } = await supabase.rpc('current_user_has_permission', {
    permission_to_check: 'honours.configure',
  })
  if (allowed !== true) redirect('/dashboard/admin/quarterly-honours')
  return <QuarterlyHonoursConfiguration />
}
