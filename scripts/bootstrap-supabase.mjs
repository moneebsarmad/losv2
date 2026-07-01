import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

function parseEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith('#'))
      .map((line) => {
        const idx = line.indexOf('=')
        return [line.slice(0, idx), line.slice(idx + 1)]
      })
  )
}

function requireValue(value, label) {
  if (!value) throw new Error(`Missing ${label}`)
  return value
}

function projectRefFromUrl(url) {
  const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co/)
  if (!match) throw new Error('Could not derive Supabase project ref from URL')
  return match[1]
}

function tempPassword() {
  return 'BHA-Temp-2026!'
}

async function getOrCreateUser(admin, user) {
  const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw listError

  const existing = existingUsers.users.find((row) => row.email === user.email)
  if (existing) {
    return existing
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { role: user.role, full_name: user.profile.full_name },
  })
  if (error) throw error
  return data.user
}

const root = process.cwd()
const env = parseEnv(path.join(root, '.env.local'))
const supabaseUrl = requireValue(env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = requireValue(
  env.NEXT_SERVICE_ROLE_SECRET,
  'NEXT_SERVICE_ROLE_SECRET'
)
const dbPassword = requireValue(env.NEXT_DB_PASSWORD, 'NEXT_DB_PASSWORD')
const projectRef = projectRefFromUrl(supabaseUrl)
const dbUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`

const pushResult = spawnSync('supabase', ['db', 'push', '--db-url', dbUrl, '--include-all', '--yes'], {
  stdio: 'inherit',
  env: process.env,
})
if (pushResult.status !== 0) {
  throw new Error('supabase db push failed')
}

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket },
})

const users = [
  {
    email: 'admin@bha.test',
    password: tempPassword(),
    role: 'admin',
    profile: { full_name: 'BHA Admin', email: 'admin@bha.test' },
  },
  {
    email: 'teacher.nadia@bha.test',
    password: tempPassword(),
    role: 'staff',
    profile: { full_name: 'Nadia Rahman', staff_name: 'Nadia Rahman', email: 'teacher.nadia@bha.test' },
  },
  {
    email: 'mentor.yusuf@bha.test',
    password: tempPassword(),
    role: 'staff',
    profile: { full_name: 'Yusuf Khan', staff_name: 'Yusuf Khan', email: 'mentor.yusuf@bha.test' },
  },
  {
    email: 'student.amina@bha.test',
    password: tempPassword(),
    role: 'student',
    profile: { full_name: 'Amina Ali', student_name: 'Amina Ali', email: 'student.amina@bha.test' },
  },
  {
    email: 'student.faris@bha.test',
    password: tempPassword(),
    role: 'student',
    profile: { full_name: 'Faris Ahmed', student_name: 'Faris Ahmed', email: 'student.faris@bha.test' },
  },
  {
    email: 'parent.zainab@bha.test',
    password: tempPassword(),
    role: 'parent',
    profile: { full_name: 'Zainab Ali', email: 'parent.zainab@bha.test' },
  },
]

const houseCycle = ['House of Abu Bakr', 'House of Khadijah', 'House of Umar', 'House of Aishah']

const created = []

for (const user of users) {
  const authUser = await getOrCreateUser(admin, user)
  created.push({ ...user, id: authUser.id })
}

for (const [index, user] of created.entries()) {
  const { error } = await admin.from('profiles').upsert({
    id: user.id,
    role: user.role,
    email: user.email,
    ...user.profile,
    assigned_house: user.role === 'student' ? houseCycle[index % houseCycle.length] : null,
  })
  if (error) throw error
}

const students = created.filter((row) => row.role === 'student')
const staff = created.filter((row) => row.role === 'staff')
const parent = created.find((row) => row.role === 'parent')

const roster = [
  {
    student_name: 'Amina Ali',
    grade: 5,
    section: 'A',
    house: 'House of Abu Bakr',
    user_id: students[0].id,
  },
  {
    student_name: 'Faris Ahmed',
    grade: 6,
    section: 'B',
    house: 'House of Khadijah',
    user_id: students[1].id,
  },
  {
    student_name: 'Maryam Khan',
    grade: 4,
    section: 'A',
    house: 'House of Umar',
  },
  {
    student_name: 'Ibrahim Omar',
    grade: 7,
    section: 'C',
    house: 'House of Aishah',
  },
]

const insertedStudents = []
for (const row of roster) {
  const { data: existingStudent, error: lookupError } = await admin
    .from('students')
    .select('id, student_name')
    .eq('student_name', row.student_name)
    .maybeSingle()
  if (lookupError) throw lookupError

  const studentRecord =
    existingStudent ??
    (await (async () => {
      const { data, error } = await admin
        .from('students')
        .insert({
          student_name: row.student_name,
          grade: row.grade,
          section: row.section,
          house: row.house,
          is_active: true,
        })
        .select('id, student_name')
        .single()
      if (error) throw error
      return data
    })())

  insertedStudents.push(studentRecord)

  if (row.user_id) {
    const { error: linkError } = await admin.from('student_user_links').upsert({
      user_id: row.user_id,
      student_id: studentRecord.id,
    })
    if (linkError) throw linkError
  }
}

const childLookup = Object.fromEntries(insertedStudents.map((row) => [row.student_name, row]))

if (parent) {
  const { error } = await admin.from('parent_student_links').upsert([
    {
      parent_user_id: parent.id,
      student_id: childLookup['Amina Ali'].id,
      relationship: 'Mother',
      is_primary: true,
    },
    {
      parent_user_id: parent.id,
      student_id: childLookup['Faris Ahmed'].id,
      relationship: 'Mother',
      is_primary: false,
    },
  ])
  if (error) throw error
}

const { data: rValues } = await admin.from('r_values').select('id, key, name').order('sort_order')
const { data: domains } = await admin.from('domains').select('id, key, name').order('sort_order')

const rMap = Object.fromEntries((rValues ?? []).map((row) => [row.key, row.id]))
const dMap = Object.fromEntries((domains ?? []).map((row) => [row.key, row.id]))
const pointValues = [5, 10, 20, 50]

const recognitionSeed = [
  {
    student_name: 'Amina Ali',
    staff_name: 'Nadia Rahman',
    r: 'respect',
    domain: 'classrooms',
    points: 10,
    note: 'Helped reset materials quickly and spoke respectfully to a peer.',
    visibility: 'student_parent',
  },
  {
    student_name: 'Amina Ali',
    staff_name: 'Yusuf Khan',
    r: 'responsibility',
    domain: 'hallways_transition',
    points: 5,
    note: 'Moved calmly and stayed ready for the next class transition.',
    visibility: 'student',
  },
  {
    student_name: 'Faris Ahmed',
    staff_name: 'Nadia Rahman',
    r: 'righteousness',
    domain: 'prayer_space',
    points: 20,
    note: 'Protected the prayer space and reminded others to keep it respectful.',
    visibility: 'student_parent',
  },
  {
    student_name: 'Maryam Khan',
    staff_name: 'Yusuf Khan',
    r: 'respect',
    domain: 'lunch_recess',
    points: 10,
    note: 'Included a classmate who was standing alone at lunch.',
    visibility: 'parent',
  },
  {
    student_name: 'Ibrahim Omar',
    staff_name: 'Nadia Rahman',
    r: 'responsibility',
    domain: 'washrooms',
    points: 5,
    note: 'Used the washroom space with care and left it better than found.',
    visibility: 'staff_only',
  },
]

for (const seed of recognitionSeed) {
  const student = childLookup[seed.student_name]
  const staffUser = created.find((row) => row.profile.staff_name === seed.staff_name)
  if (!student || !staffUser) continue
  const { data: existingRecognition, error: existingError } = await admin
    .from('recognition_logs')
    .select('id')
    .eq('student_name_snapshot', seed.student_name)
    .eq('staff_name_snapshot', seed.staff_name)
    .eq('behaviour_note', seed.note)
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError
  if (existingRecognition) continue

  const rosterRow = roster.find((row) => row.student_name === seed.student_name)
  const { error } = await admin.from('recognition_logs').insert({
    student_id: student.id,
    staff_user_id: staffUser.id,
    staff_name_snapshot: seed.staff_name,
    student_name_snapshot: seed.student_name,
    grade_snapshot: rosterRow?.grade ?? null,
    section_snapshot: rosterRow?.section ?? null,
    house_snapshot: rosterRow?.house ?? 'House of Abu Bakr',
    r_value_id: rMap[seed.r],
    domain_id: dMap[seed.domain],
    point_value: seed.points,
    behaviour_note: seed.note,
    visibility: seed.visibility,
    student_visible: seed.visibility === 'student' || seed.visibility === 'student_parent',
    parent_visible: seed.visibility === 'parent' || seed.visibility === 'student_parent',
    admin_review_status: 'approved',
    source: 'bootstrap',
  })
  if (error) throw error
}

console.log(JSON.stringify({
  createdUsers: created.map((row) => ({ email: row.email, role: row.role })),
  tempPassword: tempPassword(),
  students: insertedStudents.map((row) => row.student_name),
}, null, 2))
