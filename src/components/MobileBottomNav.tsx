import { createClient } from '@/lib/supabase/server'
import MobileBottomNavClient from './MobileBottomNavClient'

export default async function MobileBottomNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let unread = 0
  if (user) {
    try {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .is('read_at', null)
      unread = count ?? 0
    } catch {}
  }

  return <MobileBottomNavClient isLoggedIn={Boolean(user)} unread={unread} />
}
