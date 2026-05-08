'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { BookingThreadMeta, ChatMessage } from './page'
import { logClientEvent } from '@/lib/telemetry'
import { useLanguage } from '@/context/LanguageContext'
import { explainNotifyFailure, postNotify } from '@/lib/client-notify'
import { formatDateByLocale, formatTimeByLocale } from '@/lib/i18n/date'

function Avatar({ name, avatarUrl, size = 8 }: { name: string | null; avatarUrl: string | null; size?: number }) {
  const initials = (name ?? '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  const safeName = name?.trim() || 'User'
  const colors = ['#2563EB', '#16A34A', '#7C3AED', '#D97706', '#E11D48', '#0284C7']
  const bg = colors[(name ?? '').charCodeAt(0) % colors.length]
  const cls = `h-${size} w-${size} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`
  const px = size * 4
  if (avatarUrl) return <Image src={avatarUrl} alt={`${safeName} avatar`} width={px} height={px} className={`${cls} object-cover`} />
  return <div className={cls} style={{ background: bg }}>{initials}</div>
}

function formatTime(iso: string, locale: 'no' | 'en' | 'da' | 'sv') {
  return formatTimeByLocale(iso, locale, { hour: '2-digit', minute: '2-digit' })
}

function dateSeparatorLabel(iso: string, locale: 'no' | 'en' | 'da' | 'sv', labels: { today: string; yesterday: string }) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return labels.today
  if (d.toDateString() === yesterday.toDateString()) return labels.yesterday
  return formatDateByLocale(d, locale, { day: 'numeric', month: 'long' })
}

function stripJobRefPrefix(text: string): string {
  return text.replace(/^\s*\[JOB:[^\]]+\]\s*/i, '').trim()
}

export default function ChatThread({
  bookingId,
  currentUserId,
  otherName,
  otherAvatar,
  initialMessages,
  initialBooking,
}: {
  bookingId: string
  currentUserId: string
  otherName: string | null
  otherAvatar: string | null
  initialMessages: ChatMessage[]
  initialBooking: BookingThreadMeta
}) {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const c = t.chatPage
  const d = t.dashboard
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [notifyWarn, setNotifyWarn] = useState<string | null>(null)
  const [pendingRetry, setPendingRetry] = useState<string | null>(null)
  const [bookingStatus, setBookingStatus] = useState(initialBooking.status)
  const [proposalActionBusy, setProposalActionBusy] = useState(false)
  const [proposalNotifyWarn, setProposalNotifyWarn] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const isPoster = currentUserId === initialBooking.poster_id
  const isHelper = currentUserId === initialBooking.helper_id
  const otherId = isPoster ? initialBooking.helper_id : initialBooking.poster_id

  const proposalTextNorm = useMemo(() => {
    const raw = initialBooking.message ?? ''
    return stripJobRefPrefix(raw).trim()
  }, [initialBooking.message])

  const displayMessages = useMemo(() => {
    if (bookingStatus !== 'pending' || !isPoster || !proposalTextNorm) return messages
    let hidFirst = false
    return messages.filter((msg) => {
      if (hidFirst) return true
      if (msg.sender_id === otherId && stripJobRefPrefix(msg.body).trim() === proposalTextNorm) {
        hidFirst = true
        return false
      }
      return true
    })
  }, [bookingStatus, isPoster, messages, otherId, proposalTextNorm])

  const headerStatusLine = useMemo(() => {
    if (bookingStatus === 'pending' && isPoster) return c.bookingStatusPending
    if (bookingStatus === 'pending' && isHelper) return c.yourProposalPending
    if (bookingStatus === 'accepted') return c.bookingAccepted
    if (bookingStatus === 'declined') return c.bookingStatusDeclined
    if (bookingStatus === 'cancelled') return c.statusCancelled
    if (bookingStatus === 'completed') return c.statusDone
    return c.bookingStatusOther
  }, [bookingStatus, c, isHelper, isPoster])

  const headerStatusClass = useMemo(() => {
    if (bookingStatus === 'pending' && isPoster) return 'text-amber-600'
    if (bookingStatus === 'pending' && isHelper) return 'text-amber-600'
    if (bookingStatus === 'accepted') return 'text-green-600'
    if (bookingStatus === 'declined') return 'text-red-600'
    if (bookingStatus === 'cancelled') return 'text-slate-600'
    if (bookingStatus === 'completed') return 'text-blue-600'
    return 'text-gray-500'
  }, [bookingStatus, isHelper, isPoster])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!notifyWarn) return
    const id = window.setTimeout(() => setNotifyWarn(null), 4500)
    return () => window.clearTimeout(id)
  }, [notifyWarn])

  useEffect(() => {
    if (!proposalNotifyWarn) return
    const id = window.setTimeout(() => setProposalNotifyWarn(null), 5000)
    return () => window.clearTimeout(id)
  }, [proposalNotifyWarn])

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${bookingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`,
      }, payload => {
        const msg = payload.new as ChatMessage
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        if (msg.sender_id !== currentUserId) {
          supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId, currentUserId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`booking-status:${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const next = payload?.new?.status as string | undefined
          if (next) setBookingStatus(next)
        },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [bookingId, supabase])

  async function updateProposalStatus(status: 'accepted' | 'declined') {
    setProposalActionBusy(true)
    setProposalNotifyWarn(null)
    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId)
    if (error) {
      setProposalNotifyWarn(error.message)
      setProposalActionBusy(false)
      return
    }
    setBookingStatus(status)
    if (status === 'accepted' && initialBooking.post_id) {
      await supabase
        .from('bookings')
        .update({ status: 'declined' })
        .eq('post_id', initialBooking.post_id)
        .eq('status', 'pending')
        .neq('id', bookingId)
      await supabase
        .from('posts')
        .update({ status: 'closed' })
        .eq('id', initialBooking.post_id)
        .eq('user_id', initialBooking.poster_id)
    }
    const notify = await postNotify({
      type: status === 'accepted' ? 'booking-accepted' : 'booking-declined',
      bookingData: { id: bookingId, poster_id: initialBooking.poster_id, helper_id: initialBooking.helper_id },
    })
    if (!notify.ok) {
      setProposalNotifyWarn(`${d.notifyEmailWarn} (${explainNotifyFailure(notify)})`)
      logClientEvent('chat.proposal.notify', 'warn', 'Proposal decision notify failed', { bookingId, reason: notify.reason })
    }
    setProposalActionBusy(false)
    router.refresh()
  }

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return
    setSending(true)
    setSendError(null)

    const optimisticId = `opt-${Date.now()}`
    const optimistic: ChatMessage = {
      id: optimisticId,
      created_at: new Date().toISOString(),
      sender_id: currentUserId,
      body: text,
      read_at: null,
    }
    setMessages(prev => [...prev, optimistic])

    const { data, error } = await supabase
      .from('messages')
      .insert({ booking_id: bookingId, sender_id: currentUserId, body: text })
      .select('id, created_at, sender_id, body, read_at')
      .single()

    if (error || !data) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setSendError(error?.message ?? (c.sendFailed ?? 'Could not send message. Check your connection and try again.'))
      logClientEvent('chat.send', 'warn', 'Message insert failed', { bookingId, error: error?.message ?? 'unknown' })
      setPendingRetry(text)
      setSending(false)
      return
    }

    setMessages(prev => prev.map(m => m.id === optimisticId ? (data as ChatMessage) : m))
    setPendingRetry(null)

    const notify = await postNotify({
      type: 'new-message',
      senderId: currentUserId,
      bookingId,
      preview: text,
    })
    if (!notify.ok) {
      setNotifyWarn(`${c.notifyDelayWarn ?? 'Message delivered, but email/push notification may be delayed.'} (${explainNotifyFailure(notify)})`)
      logClientEvent('chat.notify', 'warn', 'Notify request failed', { bookingId, reason: notify.reason, status: notify.status })
    }

    setSending(false)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text || sending) return
    setBody('')
    await sendMessage(text)
  }

  const grouped: { dateLabel: string; msgs: ChatMessage[] }[] = []
  for (const msg of displayMessages) {
    const label = dateSeparatorLabel(msg.created_at, locale, {
      today: c.today ?? 'Today',
      yesterday: c.yesterday ?? 'Yesterday',
    })
    const last = grouped[grouped.length - 1]
    if (last?.dateLabel === label) {
      last.msgs.push(msg)
    } else {
      grouped.push({ dateLabel: label, msgs: [msg] })
    }
  }

  const showPosterProposalCard = bookingStatus === 'pending' && isPoster
  const showHelperPendingBanner = bookingStatus === 'pending' && isHelper && !isPoster

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 69px)' }}>
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-4 shrink-0">
        <Link href="/chat" aria-label="Back to conversations" className="text-gray-400 hover:text-gray-600 transition-colors mr-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <Avatar name={otherName} avatarUrl={otherAvatar} size={9} />
        <div>
          <p className="text-sm font-bold text-gray-900">{otherName ?? c.unknownUser}</p>
          <p className={`text-xs font-medium ${headerStatusClass}`}>{headerStatusLine}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col bg-gray-50 gap-4">
        {showPosterProposalCard && (
          <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 to-white p-5 shadow-sm shrink-0">
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800 mb-1">{c.proposalCardTitle}</p>
            <h2 className="text-base font-extrabold text-gray-900 mb-3">
              {c.proposalFromHelper(otherName ?? c.unknownUser)}
            </h2>
            <div className="space-y-3 text-sm">
              {(initialBooking.post_title || initialBooking.post_location || initialBooking.post_category) && (
                <div className="rounded-xl border border-amber-100 bg-white/70 px-3 py-2">
                  <p className="text-[11px] font-semibold text-gray-500 mb-0.5">Job</p>
                  {initialBooking.post_title && (
                    <p className="text-sm font-semibold text-gray-900">{initialBooking.post_title}</p>
                  )}
                  {(initialBooking.post_location || initialBooking.post_category) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[initialBooking.post_location, initialBooking.post_category].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-0.5">{c.offeredPrice}</p>
                <p className="text-lg font-extrabold text-green-700">
                  {initialBooking.budget != null && initialBooking.budget > 0
                    ? `${initialBooking.budget.toLocaleString(locale === 'no' ? 'nb-NO' : locale === 'da' ? 'da-DK' : locale === 'sv' ? 'sv-SE' : 'en-GB')} NOK`
                    : c.priceNegotiable}
                </p>
              </div>
              {proposalTextNorm && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">{c.proposalDetails}</p>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap rounded-xl bg-white/80 border border-amber-100 px-3 py-2">
                    {proposalTextNorm}
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-600 leading-relaxed">{c.negotiateHint}</p>
            </div>
            {proposalNotifyWarn && (
              <p className="mt-3 text-xs text-amber-900 bg-amber-100/80 border border-amber-200 rounded-lg px-3 py-2">{proposalNotifyWarn}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={proposalActionBusy}
                onClick={() => void updateProposalStatus('declined')}
                className="rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
              >
                {proposalActionBusy ? d.actionSubmitting : d.actionDecline}
              </button>
              <button
                type="button"
                disabled={proposalActionBusy}
                onClick={() => void updateProposalStatus('accepted')}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:opacity-90"
                style={{ background: 'linear-gradient(90deg,#16A34A,#22C55E)' }}
              >
                {proposalActionBusy ? d.actionSubmitting : d.actionAccept}
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-800 hover:bg-blue-100"
              >
                {d.actionMessage}
              </button>
            </div>
          </div>
        )}

        {showHelperPendingBanner && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shrink-0">
            {c.yourProposalPending}
          </div>
        )}

        {displayMessages.length === 0 && !showPosterProposalCard && !showHelperPendingBanner && (
          <div className="flex-1 flex items-center justify-center min-h-30">
            <p className="text-sm text-gray-400">{c.emptyThread}</p>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.dateLabel}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 shrink-0">{group.dateLabel}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="flex flex-col gap-1.5">
              {group.msgs.map(msg => {
                const isMine = msg.sender_id === currentUserId
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {!isMine && <Avatar name={otherName} avatarUrl={otherAvatar} size={7} />}
                    <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMine
                            ? 'text-white rounded-br-sm'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                        }`}
                        style={isMine ? { background: 'linear-gradient(135deg,#2563EB,#38BDF8)' } : {}}
                      >
                        {stripJobRefPrefix(msg.body)}
                      </div>
                      <span className="text-[11px] text-gray-400 px-1">{formatTime(msg.created_at, locale)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend}
        className="flex flex-col gap-2 border-t border-gray-200 bg-white px-6 py-4 shrink-0">
        {notifyWarn && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-900">{notifyWarn}</p>
          </div>
        )}
        {sendError && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-900">{sendError}</p>
            {pendingRetry && (
              <button
                type="button"
                onClick={() => { void sendMessage(pendingRetry) }}
                disabled={sending}
                className="shrink-0 text-xs font-bold text-amber-900 underline disabled:opacity-40">
                {c.retry ?? 'Retry'}
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={c.inputPlaceholder}
          disabled={sending}
          className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!body.trim() || sending}
          className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#2563EB,#38BDF8)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
        </div>
      </form>
    </div>
  )
}
