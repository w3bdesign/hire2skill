'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusCircle, MessageCircle, UserCircle } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

type Props = {
  isLoggedIn: boolean
  unread: number
}

export default function MobileBottomNavClient({ isLoggedIn, unread }: Props) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const n = t.nav

  const msgHref  = isLoggedIn ? '/chat'    : '/login'
  const profHref = isLoggedIn ? '/profile' : '/login'

  function itemClass(href: string) {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href))
    return `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
      active ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'
    }`
  }

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 flex items-stretch h-16 safe-area-inset-bottom"
      style={{ background: 'var(--sl-nav-bg)', borderColor: 'var(--sl-nav-border)' }}
    >
      <Link href="/" className={itemClass('/')}>
        <Home size={22} strokeWidth={1.8} />
        <span className="text-[10px] font-medium">{n.home}</span>
      </Link>

      <Link href="/taskers" className={itemClass('/taskers')}>
        <Search size={22} strokeWidth={1.8} />
        <span className="text-[10px] font-medium">{n.browse}</span>
      </Link>

      <div className="flex-1 flex items-center justify-center">
        <Link
          href="/post"
          className="flex flex-col items-center justify-center gap-0.5 h-13 w-13 rounded-2xl text-white shadow-lg active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)', padding: '10px 12px' }}
        >
          <PlusCircle size={24} strokeWidth={1.8} />
          <span className="text-[10px] font-bold">{n.postShort}</span>
        </Link>
      </div>

      <Link href={msgHref} className={itemClass('/chat')}>
        <div className="relative">
          <MessageCircle size={22} strokeWidth={1.8} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white px-0.5">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium">{n.messages}</span>
      </Link>

      <Link href={profHref} className={itemClass('/profile')}>
        <UserCircle size={22} strokeWidth={1.8} />
        <span className="text-[10px] font-medium">{isLoggedIn ? n.profile : n.signIn}</span>
      </Link>
    </nav>
  )
}
