export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'tarbiyah_leadership'
  | 'house_mentor'
  | 'teacher'
  | 'support_staff'
  | 'staff'
  | 'student'
  | 'parent'

export type PortalRole = 'super_admin' | 'admin' | 'house_mentor' | 'staff' | 'student' | 'parent'

export type ReferenceRow = {
  id: string
  key: string
  name: string
  description?: string | null
  sort_order?: number | null
}

export type PointValueRow = {
  value: number
  label: string
  description: string
  sort_order?: number | null
}

export type GraduateValue = {
  id: string
  code: string
  display_label: string
  islamic_term: string
  parent_r_value_id: string
  relationship?: 'primary' | 'secondary'
}

export type RecognitionDefinition = {
  id: string
  code: string
  r_value_id: string
  r_value_code: 'righteousness' | 'responsibility' | 'respect'
  r_value_name: string
  label: string
  description: string
  fixed_points: 5 | 10 | 20 | 50
  award_mode: 'direct' | 'nomination'
  requires_note: boolean
  is_active: boolean
  sort_order: number
  framework_version: string
  graduate_values: GraduateValue[]
}

export type RecognitionReferencePayload = {
  rValues: ReferenceRow[]
  domains: ReferenceRow[]
  definitions: RecognitionDefinition[]
  graduateValues: GraduateValue[]
}

export type StudentSummary = {
  id: string
  student_id?: string | null
  student_name: string
  grade?: number | null
  section?: string | null
  house: string
}

export type RecognitionLog = {
  id: string
  student_id: string
  staff_user_id: string
  staff_name_snapshot: string
  student_name_snapshot: string
  grade_snapshot: number | null
  section_snapshot: string | null
  house_snapshot: string
  r_value_id: string
  domain_id: string
  point_value: number
  behaviour_note: string
  visibility: string
  student_visible: boolean
  parent_visible: boolean
  admin_review_status: string
  award_status?: 'approved' | 'reversed'
  recognition_definition_id?: string | null
  points_snapshot?: number
  r_value_snapshot?: string | null
  behaviour_label_snapshot?: string | null
  behaviour_description_snapshot?: string | null
  graduate_values_snapshot?: unknown
  award_mode_snapshot?: 'direct' | 'nomination' | null
  framework_version?: string
  observed_at?: string
  record_status?: string
  created_at: string
  r_values?: ReferenceRow | null
  domains?: ReferenceRow | null
}

export type RecognitionNomination = {
  id: string
  student_id: string
  recognition_definition_id: string
  domain_id: string
  nominated_by_profile_id: string
  explanation: string
  witness_information: string | null
  observed_at: string
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  reviewed_by_profile_id: string | null
  review_note: string | null
  reviewed_at: string | null
  approved_award_id: string | null
  created_at: string
}
