import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyHonoursAdmins } from './notifications'
import { refreshQuarterlyHonoursScores } from './refresh'

const DAY_MS = 86_400_000

type MaintenancePeriod = {
  id: string
  school_id: string
  code: string
  name: string
  starts_on: string
  ends_on: string
  review_opens_at: string | null
  status: string
  schools: { timezone: string } | Array<{ timezone: string }> | null
}

function localDateParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
  }
}

function dateDifference(left: string, right: string) {
  return Math.round(
    (Date.parse(`${left}T00:00:00.000Z`) - Date.parse(`${right}T00:00:00.000Z`)) / DAY_MS
  )
}

async function notificationForPeriod(
  admin: SupabaseClient,
  period: MaintenancePeriod,
  daysUntilEnd: number
) {
  const common = {
    admin,
    schoolId: period.school_id,
    periodId: period.id,
  }
  if (daysUntilEnd === 14) {
    return notifyHonoursAdmins({
      ...common,
      type: 'award_review_opening',
      title: 'Quarterly Star Honours review is approaching',
      message: `${period.name} ends in 14 days. Review score health and emerging candidates.`,
      deduplicationKey: `${period.id}:review-opening:14`,
    })
  }
  if (daysUntilEnd === 7) {
    return notifyHonoursAdmins({
      ...common,
      type: 'award_period_ending_soon',
      title: 'Review leading Quarterly Star Honours candidates',
      message: `${period.name} ends in 7 days. Candidate evidence is ready for administrative review.`,
      deduplicationKey: `${period.id}:ending-soon:7`,
    })
  }
  if (daysUntilEnd === -1) {
    return notifyHonoursAdmins({
      ...common,
      type: 'award_period_ended',
      title: 'Final candidate snapshot is ready',
      message: `${period.name} has ended. Review and finalise each honour using the frozen evidence snapshot.`,
      deduplicationKey: `${period.id}:period-ended`,
    })
  }
  if (daysUntilEnd === -3 && period.status !== 'finalised') {
    return notifyHonoursAdmins({
      ...common,
      type: 'awards_not_finalised',
      title: 'Quarterly Star Honours require finalisation',
      message: `${period.name} still has honours requiring an administrative decision.`,
      deduplicationKey: `${period.id}:not-finalised:3`,
    })
  }
  return 0
}

export async function runQuarterlyHonoursMaintenance(admin: SupabaseClient, now = new Date()) {
  const { data, error } = await admin
    .from('quarterly_award_periods')
    .select('id,school_id,code,name,starts_on,ends_on,review_opens_at,status,schools(timezone)')
    .in('status', ['upcoming', 'active', 'review_open'])
    .order('starts_on')
  if (error) throw error

  const outcomes: Array<Record<string, unknown>> = []
  for (const rawPeriod of data ?? []) {
    const period = rawPeriod as unknown as MaintenancePeriod
    const schoolRelation = Array.isArray(period.schools) ? period.schools[0] : period.schools
    const timezone = schoolRelation?.timezone ?? 'UTC'
    const local = localDateParts(now, timezone)
    const daysUntilEnd = dateDifference(period.ends_on, local.date)
    const started = local.date >= period.starts_on
    const ended = daysUntilEnd < 0
    let status = period.status

    if (started && status === 'upcoming') status = 'active'
    if (ended && status !== 'review_open') status = 'review_open'
    if (period.review_opens_at && now >= new Date(period.review_opens_at) && status === 'active') {
      status = 'review_open'
    }
    if (status !== period.status) {
      const { error: statusError } = await admin
        .from('quarterly_award_periods')
        .update({ status })
        .eq('id', period.id)
        .eq('school_id', period.school_id)
      if (statusError) throw statusError
      period.status = status
    }

    const notificationCount = await notificationForPeriod(admin, period, daysUntilEnd)
    const withinFinalWindow = started && daysUntilEnd >= 0 && daysUntilEnd <= 14
    const periodEndRun = daysUntilEnd === -1
    const nightlyWindow = started && !ended && local.hour === 1

    let refreshed = false
    if (withinFinalWindow || periodEndRun || nightlyWindow) {
      const minimumHours = withinFinalWindow ? 5 : 20
      const since = new Date(now.getTime() - minimumHours * 60 * 60 * 1000).toISOString()
      const { data: recentRun, error: recentError } = await admin
        .from('quarterly_award_score_runs')
        .select('id')
        .eq('award_period_id', period.id)
        .eq('status', 'completed')
        .gte('completed_at', since)
        .limit(1)
        .maybeSingle()
      if (recentError) throw recentError
      if (!recentRun) {
        await refreshQuarterlyHonoursScores({
          admin,
          periodId: period.id,
          triggerType: periodEndRun ? 'period_end' : status === 'review_open' ? 'review_open' : 'scheduled',
          now,
        })
        refreshed = true
      }
    }

    outcomes.push({
      periodId: period.id,
      status,
      daysUntilEnd,
      notificationCount,
      refreshed,
    })
  }
  return outcomes
}
