export const HONOURS_ALGORITHM_VERSION = 'quarterly-star-honours-v1'

export const AWARD_CODES = [
  'north_star',
  'righteousness_beacon',
  'responsibility_anchor',
  'respect_ambassador',
  'rising_star',
  'steadfast_star',
] as const

export type AwardCode = (typeof AWARD_CODES)[number]

export const R_KEYS = ['righteousness', 'responsibility', 'respect'] as const
export type RKey = (typeof R_KEYS)[number]

export const ADMIN_HONOURS_ROLES = ['super_admin', 'admin', 'tarbiyah_leadership'] as const

export const DEFAULT_AWARD_CONFIG = {
  north_star: {
    weights: {
      balanced_three_r: 0.45,
      domain_breadth: 0.2,
      weekly_consistency: 0.15,
      staff_breadth: 0.1,
      significant_evidence: 0.1,
    },
    minimums: {
      events: 8,
      eligible_days: 20,
      eligible_week_percentage: 70,
      distinct_rs: 3,
      distinct_domains: 4,
      distinct_staff: 4,
      significant_events: 2,
      maximum_staff_concentration: 0.4,
      maximum_r_share: 0.55,
      minimum_r_share: 0.15,
    },
  },
  righteousness_beacon: {
    r_key: 'righteousness',
    weights: {
      recognition_rate: 0.45,
      weekly_consistency: 0.2,
      domain_breadth: 0.15,
      staff_breadth: 0.1,
      significant_evidence: 0.1,
    },
    minimums: {
      events: 6,
      eligible_days: 20,
      eligible_week_percentage: 50,
      distinct_domains: 3,
      distinct_staff: 3,
      significant_events: 1,
      maximum_staff_concentration: 0.4,
    },
  },
  responsibility_anchor: {
    r_key: 'responsibility',
    weights: {
      recognition_rate: 0.45,
      weekly_consistency: 0.2,
      domain_breadth: 0.15,
      staff_breadth: 0.1,
      significant_evidence: 0.1,
    },
    minimums: {
      events: 6,
      eligible_days: 20,
      eligible_week_percentage: 50,
      distinct_domains: 3,
      distinct_staff: 3,
      significant_events: 1,
      maximum_staff_concentration: 0.4,
    },
  },
  respect_ambassador: {
    r_key: 'respect',
    weights: {
      recognition_rate: 0.45,
      weekly_consistency: 0.2,
      domain_breadth: 0.15,
      staff_breadth: 0.1,
      significant_evidence: 0.1,
    },
    minimums: {
      events: 6,
      eligible_days: 20,
      eligible_week_percentage: 50,
      distinct_domains: 3,
      distinct_staff: 3,
      significant_events: 1,
      maximum_staff_concentration: 0.4,
    },
  },
  rising_star: {
    weights: {
      recognition_rate_improvement: 0.45,
      consistency_improvement: 0.25,
      r_breadth_improvement: 0.15,
      domain_breadth_improvement: 0.15,
    },
    minimums: {
      events: 6,
      eligible_days: 20,
      active_weeks: 3,
      consistency_percentage: 50,
      positive_components: 3,
      maximum_staff_concentration: 0.5,
      minimum_elapsed_weeks_for_split: 6,
    },
  },
  steadfast_star: {
    weights: {
      weekly_consistency: 0.65,
      distribution_gap: 0.2,
      staff_breadth: 0.1,
      framework_breadth: 0.05,
    },
    minimums: {
      events: 8,
      eligible_days: 20,
      eligible_week_percentage: 80,
      maximum_gap_weeks: 2,
      distinct_rs: 2,
      distinct_domains: 3,
      distinct_staff: 3,
      maximum_staff_concentration: 0.4,
    },
  },
} as const
