import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const isCloudEnabled = Boolean(url && key && !url.includes('your-project'))
export const supabase = isCloudEnabled ? createClient(url!, key!) : null
