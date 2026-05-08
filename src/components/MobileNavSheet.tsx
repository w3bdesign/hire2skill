'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/context/LanguageContext'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Bell, LayoutDashboard, LogOut, Menu, MessageCircle, UserRound, X } from 'lucide-react'

type Props = {
  userEmail: string | null
  unreadCount: number
  isAdmin?: boolean
}

export default function MobileNavSheet({ userEmail, unreadCount, isAdmin = false }: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.replace('/login')
    router.refresh()
  }

  const initial = userEmail?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.nav.menu}
      >
        <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-100 sm:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute top-0 right-0 flex h-full w-[min(20rem,92vw)] flex-col border-l border-gray-200 bg-white shadow-2xl"
            style={{ background: 'var(--sl-nav-bg)', borderColor: 'var(--sl-nav-border)' }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}
                >
                  {initial}
                </div>
                <p className="truncate text-sm font-semibold text-gray-900">{userEmail ?? 'Account'}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <LayoutDashboard className="h-5 w-5 text-blue-600 shrink-0" />
                {t.dashboard.tabOverview}
              </Link>
              <Link
                href="/chat"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="relative shrink-0">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1 min-w-4 rounded-full bg-blue-600 px-1 py-px text-center text-[10px] font-bold leading-tight text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                {t.nav.messages}
              </Link>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <Bell className="h-5 w-5 text-blue-600 shrink-0" />
                {t.nav.notifications}
              </Link>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <UserRound className="h-5 w-5 text-blue-600 shrink-0" />
                {t.nav.profile}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/verifications"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Admin
                </Link>
              )}
              <Link
                href="/post"
                onClick={() => setOpen(false)}
                className="mt-2 flex w-full max-w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm"
                style={{ background: 'linear-gradient(90deg,#F59E0B,#FBBF24)' }}
              >
                {t.nav.postJob}
              </Link>
            </nav>

            <div className="border-t border-gray-200 p-3 safe-area-inset-bottom space-y-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {t.nav.preferences}
              </p>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="text-sm font-medium text-gray-600">{t.nav.chooseLanguage}</span>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <LanguageSwitcher />
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {loggingOut ? (t.nav.loggingOut ?? 'Logging out…') : (t.nav.logout ?? 'Log out')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
