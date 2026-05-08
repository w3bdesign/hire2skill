import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileContent from './ProfileContent'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'View and edit your Hire2Skill profile — update your bio, skills, avatar and contact details.',
  robots: { index: false, follow: false },
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/profile')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, category, status, created_at')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  // Reviews left for this user (as a helper). Table may not exist yet — degrade gracefully.
  const { data: rawReviews } = await supabase
    .from('reviews')
    .select('id, rating, text, created_at, reviewer_id')
    .eq('tasker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch reviewer profiles if we have reviews
  const reviewerIds = (rawReviews ?? []).map(r => r.reviewer_id).filter(Boolean)
  const { data: reviewerProfiles } = reviewerIds.length
    ? await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', reviewerIds)
    : { data: [] }

  const profileMap = Object.fromEntries((reviewerProfiles ?? []).map(p => [p.id, p]))

  const reviews = (rawReviews ?? []).map(r => ({
    id: r.id,
    rating: r.rating,
    text: r.text,
    created_at: r.created_at,
    reviewer_name: profileMap[r.reviewer_id]?.display_name ?? null,
    reviewer_avatar: profileMap[r.reviewer_id]?.avatar_url ?? null,
  }))

  const { tab } = await searchParams
  const tabFromUrl = typeof tab === 'string' ? tab : null

  return (
    <ProfileContent
      user={{ id: user.id, email: user.email ?? '', created_at: user.created_at }}
      profile={profile ?? null}
      posts={posts ?? []}
      reviews={reviews}
      initialTab={tabFromUrl}
    />
  )
}
