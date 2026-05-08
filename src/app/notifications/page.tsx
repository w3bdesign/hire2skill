import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotificationsPageClient from './NotificationsPageClient'

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Your Hire2Skill notifications — booking updates, messages and alerts.',
  robots: { index: false, follow: false },
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-10 text-sm text-gray-500">…</div>}>
      <NotificationsPageClient userId={user.id} />
    </Suspense>
  )
}
