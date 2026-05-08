import { createClient } from '@/lib/supabase/server'
import NavbarClient from './NavbarClient'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let unreadCount = 0
  if (user) {
    try {
      // Count messages from active conversations (pending/accepted/completed),
      // so pending request chats also surface unread badges in the navbar.
      const { data: acceptedBookings } = await supabase
        .from('bookings')
        .select('id')
        .or(`helper_id.eq.${user.id},poster_id.eq.${user.id}`)

      const bookingIds = (acceptedBookings ?? []).map(b => b.id)

      if (bookingIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('booking_id', bookingIds)
          .neq('sender_id', user.id)
          .is('read_at', null)
        unreadCount = count ?? 0
      }
    } catch {
      // messages or bookings table not yet created
    }
  }

  let isAdmin = false
  if (user) {
    try {
      const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      isAdmin = Boolean(prof?.is_admin)
    } catch {}
  }

  return <NavbarClient userId={user?.id ?? null} userEmail={user?.email ?? null} unreadCount={unreadCount} isAdmin={isAdmin} />
}
