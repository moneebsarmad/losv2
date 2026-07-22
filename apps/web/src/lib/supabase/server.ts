import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'
import type { Database } from '@/types/database'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => {
        cookieStore.set({ name, value, ...options })
      },
      remove: (name, options) => {
        cookieStore.set({ name, value: '', ...options })
      },
    },
  })
}
