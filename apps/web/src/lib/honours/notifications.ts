import type { SupabaseClient } from '@supabase/supabase-js'

export type HonoursNotificationType =
  | 'award_review_opening'
  | 'award_period_ending_soon'
  | 'award_period_ended'
  | 'awards_not_finalised'
  | 'score_run_failed'

type NotificationInput = {
  admin: SupabaseClient
  schoolId: string
  periodId: string
  type: HonoursNotificationType
  title: string
  message: string
  deduplicationKey: string
  actionUrl?: string
}

export async function notifyHonoursAdmins(input: NotificationInput) {
  const { data: recipients, error: recipientsError } = await input.admin
    .from('profiles')
    .select('id')
    .eq('school_id', input.schoolId)
    .in('role', ['super_admin', 'admin', 'tarbiyah_leadership'])
  if (recipientsError) throw recipientsError
  if (!recipients?.length) return 0

  const rows = recipients.map((recipient) => ({
    school_id: input.schoolId,
    recipient_user_id: recipient.id,
    award_period_id: input.periodId,
    notification_type: input.type,
    title: input.title,
    message: input.message,
    action_url: input.actionUrl ?? '/dashboard/admin/quarterly-honours',
    deduplication_key: input.deduplicationKey,
  }))
  const { data, error } = await input.admin
    .from('quarterly_award_notifications')
    .upsert(rows, {
      onConflict: 'recipient_user_id,deduplication_key',
      ignoreDuplicates: true,
    })
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}
