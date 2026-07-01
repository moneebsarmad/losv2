export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return value
}

export function getSupabaseAnonKey() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_ANON_PUBLIC
  if (!value) {
    throw new Error('Missing Supabase public/anon key')
  }
  return value
}

export function getSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_SERVICE_ROLE_SECRET
  if (!value) throw new Error('Missing Supabase service role key')
  return value
}
