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

export type PortalRole = 'staff' | 'student' | 'parent' | 'admin'

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
  created_at: string
  r_values?: ReferenceRow | null
  domains?: ReferenceRow | null
}
