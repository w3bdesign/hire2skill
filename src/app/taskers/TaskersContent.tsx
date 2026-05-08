'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { Search, X, LayoutGrid, Map, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { CATEGORY_BY_KEY, CATEGORY_LABEL_BY_KEY, CATEGORY_LABELS, toCategoryKey } from '@/lib/categories'
import { categoryIconProps } from '@/lib/category-icon'
import { helperCityKey } from '@/lib/helper-city-key'
import { centroidLatLng, cityCenterLatLng, latLngForTasker } from '@/lib/geo/norway-city-centers'
import { TaskersLeafletMap } from '@/components/maps/TaskersLeafletMap'
import { UI_TOKENS } from '@/lib/ui/tokens'

type Tasker = {
  id: string
  display_name: string
  bio: string
  hourly_rate: number
  categories: string[]
  location: string
  latitude: number | null
  longitude: number | null
  verified: boolean
  tasks_done: number
  rating: number
  review_count?: number
  response_hours: number
  avatar_url?: string | null
  languages?: string[] | null
  brings_tools?: boolean | null
  can_invoice?: boolean | null
}

function isElite(t: Tasker) {
  return t.verified && t.rating >= 4.8 && (t.tasks_done ?? 0) >= 10
}

const CATEGORIES = ['All', ...CATEGORY_LABELS]
const CATEGORY_GROUPS: Record<string, string[]> = {
  home: ['cleaning', 'windowcleaning', 'snowremoval', 'gardening', 'painting'],
  handyman: ['handyman', 'furnitureassembly'],
  moving: ['moving', 'delivery'],
  tech: ['it'],
  care: ['tutoring', 'drivinglessons', 'kidscare', 'eldercare', 'petcare', 'dogwalking', 'personaltraining', 'musiclessons'],
  events: ['events', 'photography', 'cooking', 'baking', 'makeup', 'hairdresser', 'shopping', 'carwash', 'knitting', 'sewing'],
}

const AVATAR_COLORS = ['#2563EB', '#16A34A', '#7C3AED', '#D97706', '#E11D48', '#0284C7', '#EA580C', '#0F766E']

// City bounding boxes (rough, for pin placement)
const CITY_ZONES: Record<string, { x: number; y: number; label: string }> = {
  'oslo':         { x: 52, y: 34, label: 'Oslo' },
  'bergen':       { x: 18, y: 44, label: 'Bergen' },
  'trondheim':    { x: 45, y: 18, label: 'Trondheim' },
  'stavanger':    { x: 15, y: 58, label: 'Stavanger' },
  'tromsø':       { x: 55, y: 5,  label: 'Tromsø' },
  'kristiansand': { x: 30, y: 70, label: 'Kristiansand' },
  'drammen':      { x: 49, y: 38, label: 'Drammen' },
  'fredrikstad':  { x: 55, y: 42, label: 'Fredrikstad' },
  'bodø':         { x: 42, y: 12, label: 'Bodø' },
  'ålesund':      { x: 24, y: 32, label: 'Ålesund' },
}

const MAP_CLUSTER_MIN = 13

function MapView({
  taskers,
  bookLabel,
  ui,
  categoryLabel,
  categoryAccentHex,
}: {
  taskers: Tasker[]
  bookLabel: string
  categoryLabel: string
  categoryAccentHex: string | null
  ui: {
    mapAriaShowHelpersInCity: (count: number, city: string) => string
    mapClosePreview: string
    mapHelpersAcrossNorway: (count: number) => string
    mapSearchPlaceholder: string
    mapFooterHint: string
    mapNoHelpersOnMap: string
    mapCategoryBadge: (label: string) => string
    mapClusterAria: (count: number, city: string) => string
    perHourShort: string
  }
}) {
  const [activePinKey, setActivePinKey] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [focusedTaskerId, setFocusedTaskerId] = useState<string | null>(null)

  const pins = useMemo(
    () =>
      taskers.reduce<{ key: string; zone: { x: number; y: number; label: string }; items: Tasker[] }[]>((acc, t) => {
        const key = helperCityKey(t.location)
        const zone = CITY_ZONES[key] ?? CITY_ZONES['oslo']
        const existing = acc.find(p => p.key === key)
        if (existing) {
          existing.items.push(t)
          return acc
        }
        return [...acc, { key, zone, items: [t] }]
      }, []),
    [taskers],
  )

  const preview = useMemo(() => {
    if (focusedTaskerId) {
      return taskers.find(t => t.id === focusedTaskerId) ?? null
    }
    if (!activePinKey) return null
    const pin = pins.find(p => p.key === activePinKey)
    const items = pin?.items ?? []
    return items[activeIndex] ?? items[0] ?? null
  }, [focusedTaskerId, activePinKey, activeIndex, pins, taskers])

  const ringColor = categoryAccentHex ?? '#ffffff'

  function closePreview() {
    setActivePinKey(null)
    setActiveIndex(0)
    setFocusedTaskerId(null)
  }

  const leafletPins = useMemo(
    () =>
      pins.map(pin => {
        const positions = pin.items.map((t, i) => ({
          tasker: t,
          latlng: latLngForTasker(pin.key, t.latitude, t.longitude, t.id, i),
        }))
        const coords = positions.map(p => p.latlng)
        const center =
          coords.length > 0 ? centroidLatLng(coords, pin.key) : cityCenterLatLng(pin.key)
        return {
          key: pin.key,
          label: pin.zone.label,
          items: pin.items,
          center,
          positions,
        }
      }),
    [pins],
  )

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-gray-200/90 bg-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
      style={{ minHeight: 440, height: 'min(56vh, 520px)' }}
    >
      <div className="absolute inset-0 z-0">
        <TaskersLeafletMap
          pins={leafletPins}
          clusterMin={MAP_CLUSTER_MIN}
          ringColor={ringColor}
          activePinKey={activePinKey}
          focusedTaskerId={focusedTaskerId}
          onClusterClick={key => {
            setFocusedTaskerId(null)
            if (activePinKey === key) {
              closePreview()
              return
            }
            setActivePinKey(key)
            setActiveIndex(0)
          }}
          onTaskerClick={id => {
            setActivePinKey(null)
            setActiveIndex(0)
            setFocusedTaskerId(prev => (prev === id ? null : id))
          }}
        />
      </div>

      {/* FINN-style top bar */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-1700 flex flex-col items-center gap-2 px-3 pt-3 sm:pt-4">
        <div
          className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border border-gray-200/90 bg-white/95 px-4 py-2.5 shadow-md backdrop-blur-sm"
          style={{ boxShadow: '0 8px 30px rgba(15,23,42,0.08)' }}
        >
          <Search size={16} className="shrink-0 text-gray-400" aria-hidden />
          <span className="truncate text-sm text-gray-400">{ui.mapSearchPlaceholder}</span>
        </div>
        {categoryLabel !== 'All' && (
          <span className="pointer-events-auto rounded-full border border-gray-200 bg-white/95 px-3 py-1 text-[11px] font-bold text-gray-800 shadow-sm">
            {ui.mapCategoryBadge(categoryLabel)}
          </span>
        )}
      </div>

      {taskers.length === 0 && (
        <div className="absolute inset-0 z-1500 flex items-center justify-center bg-white/55 px-6 backdrop-blur-[1px]">
          <p className="max-w-sm text-center text-sm font-semibold text-gray-700">{ui.mapNoHelpersOnMap}</p>
        </div>
      )}

      {preview && (
        <div className="absolute bottom-3 left-3 right-3 z-1800 rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-2xl sm:bottom-4 sm:left-4 sm:right-4 sm:p-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: AVATAR_COLORS[preview.display_name.charCodeAt(0) % AVATAR_COLORS.length] }}
            >
              {preview.display_name
                .split(' ')
                .map(w => w[0]?.toUpperCase())
                .join('')
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">{preview.display_name}</p>
              <p className="text-xs text-gray-500">
                {preview.location} ·{' '}
                {preview.hourly_rate > 0 ? `${preview.hourly_rate} ${ui.perHourShort}` : ui.perHourShort}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/taskers/${preview.id}`}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(90deg,#171717,#404040)' }}
              >
                {bookLabel}
              </Link>
              <button type="button" onClick={closePreview} aria-label={ui.mapClosePreview} className="px-1 text-gray-400 hover:text-gray-600">
                ✕
              </button>
              {activePinKey && !focusedTaskerId && (pins.find(p => p.key === activePinKey)?.items.length ?? 0) > 1 && (
                <div className="ml-1 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const n = pins.find(p => p.key === activePinKey)?.items.length ?? 1
                      setActiveIndex(i => (i - 1 + n) % n)
                    }}
                    className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  <span className="px-1 text-[11px] text-gray-400">
                    {activeIndex + 1}/{pins.find(p => p.key === activePinKey)?.items.length ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const n = pins.find(p => p.key === activePinKey)?.items.length ?? 1
                      setActiveIndex(i => (i + 1) % n)
                    }}
                    className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="absolute left-3 top-18 z-1600 max-w-[min(100%-1.5rem,280px)] rounded-xl border border-gray-200/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-sm sm:top-21">
        {ui.mapHelpersAcrossNorway(taskers.length)}
      </div>

      {taskers.length > 0 && !preview && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-1650 flex justify-center pb-1 sm:bottom-4">
          <p className="rounded-full border border-sky-100 bg-sky-50/95 px-3 py-1.5 text-center text-[10px] font-medium text-sky-900 shadow-sm sm:text-[11px]">
            {ui.mapFooterHint}
          </p>
        </div>
      )}
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#F59E0B' : '#E5E7EB'} className="sm:w-3.25 sm:h-3.25">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="ml-0.5 text-[11px] sm:text-xs font-bold text-gray-700">{rating.toFixed(1)}</span>
    </span>
  )
}

function TaskerCard({
  tasker,
  index,
  bookLabel,
  ui,
}: {
  tasker: Tasker
  index: number
  bookLabel: string
  ui: {
    availableToday: string
    instantBook: string
    verified: string
    elite: string
    reviews: (count: number) => string
    perHour: string
    tasksCount: (count: number) => string
    responseWithinHours: (hours: number) => string
    viewProfile: string
    trustSignalsTitle: string
    trustVerifiedId: string
    trustFastResponse: string
    trustTopRated: string
    trustCompletedJobs: (count: number) => string
  }
}) {
  const initials = tasker.display_name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const instantBook = tasker.verified && tasker.rating >= 4.8

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/90 shadow-sm p-3 sm:p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col relative overflow-hidden">
      <div className="flex items-start gap-2.5 sm:gap-3 mb-2 sm:mb-2.5">
        {tasker.avatar_url ? (
          <Image src={tasker.avatar_url} alt={tasker.display_name} width={56} height={56} className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl object-cover shrink-0" />
        ) : (
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 text-white font-bold text-sm sm:text-base shadow-sm"
            style={{ background: color }}>
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0 pr-1 sm:pr-2">
          <div className="flex items-center gap-1 flex-wrap">
            <h3 className="font-extrabold text-gray-900 text-sm sm:text-[15px] leading-tight">{tasker.display_name}</h3>
            {isElite(tasker) && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] sm:text-[10px] font-bold border shrink-0"
                style={{ background: 'linear-gradient(135deg,#fef9c3,#fde68a)', color: '#92400e', borderColor: '#fcd34d' }}>
                ★ {ui.elite}
              </span>
            )}
          </div>
          {/* One compact row: badges · location · rating (scrolls horizontally on very narrow screens) */}
          <div className="mt-1 flex min-w-0 items-center gap-x-1.5 gap-y-0 overflow-x-auto sm:flex-wrap sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {instantBook && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-blue-50 px-1 py-px text-[9px] sm:text-[10px] font-bold text-blue-700 border border-blue-100">
                <svg width="7" height="7" className="sm:w-2 sm:h-2" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                {ui.instantBook}
              </span>
            )}
            {tasker.verified && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-green-50 px-1 py-px text-[9px] sm:text-[10px] font-semibold text-green-700 border border-green-100">
                <svg width="7" height="7" className="sm:w-2 sm:h-2" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {ui.verified}
              </span>
            )}
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[9px] sm:text-[10px] text-gray-400">
              <svg width="10" height="10" className="shrink-0 sm:w-2.5 sm:h-2.5" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span className="max-w-18 truncate sm:max-w-28">{tasker.location}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 border-l border-gray-200 pl-1.5">
              <Stars rating={tasker.rating} />
              {(tasker.review_count ?? 0) > 0 && (
                <span className="text-[9px] sm:text-[10px] text-gray-400 whitespace-nowrap">({ui.reviews(tasker.review_count ?? 0)})</span>
              )}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0 pl-1 min-w-18 sm:min-w-21 self-start pt-0 sm:pt-0.5">
          <p className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none tabular-nums">{tasker.hourly_rate} NOK</p>
          <p className="text-[10px] sm:text-xs text-gray-400">{ui.perHour}</p>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-gray-600 leading-snug mb-2 line-clamp-2 sm:line-clamp-3">{tasker.bio}</p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] sm:text-xs text-gray-400 mb-2 rounded-lg sm:rounded-xl bg-gray-50 px-2 py-1.5 sm:py-2">
        <span className="flex items-center gap-1 shrink-0">
          <svg width="12" height="12" className="sm:w-3.25 sm:h-3.25 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          {ui.tasksCount(tasker.tasks_done)}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <svg width="12" height="12" className="sm:w-3.25 sm:h-3.25 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {ui.responseWithinHours(tasker.response_hours)}
        </span>
        <div className="flex flex-wrap gap-1 w-full sm:w-auto sm:ml-auto sm:justify-end">
          {tasker.categories.slice(0, 2).map(c => {
            const meta = CATEGORY_BY_KEY[toCategoryKey(c)]
            const ChipIcon = meta?.Icon
            return (
              <span key={c} className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px sm:px-2 sm:py-0.5 text-[10px] sm:text-xs font-semibold"
                style={{ background: meta?.bg ?? '#EFF6FF', color: meta?.color ?? '#2563EB' }}>
                {ChipIcon && <ChipIcon {...categoryIconProps(11, meta?.color ?? '#2563EB')} />}
                {CATEGORY_LABEL_BY_KEY[toCategoryKey(c)] ?? c}
              </span>
            )
          })}
        </div>
      </div>

      {/* Compact trust row: hide titled box on narrow screens, show chips only */}
      <div className="mb-2 sm:mb-2.5 rounded-lg sm:rounded-xl border border-blue-100 bg-blue-50/70 px-2 py-1.5 sm:px-2.5 sm:py-2">
        <p className="hidden sm:block text-[10px] font-bold text-blue-900 mb-1">{ui.trustSignalsTitle}</p>
        <div className="flex flex-wrap gap-1">
          {tasker.verified && (
            <span className="rounded-full bg-white border border-green-200 px-1.5 py-px sm:px-2 sm:py-0.5 text-[9px] sm:text-[10px] font-semibold text-green-700">
              {ui.trustVerifiedId}
            </span>
          )}
          {tasker.response_hours <= 2 && (
            <span className="rounded-full bg-white border border-blue-200 px-1.5 py-px sm:px-2 sm:py-0.5 text-[9px] sm:text-[10px] font-semibold text-blue-700">
              {ui.trustFastResponse}
            </span>
          )}
          {tasker.rating >= 4.8 && (
            <span className="rounded-full bg-white border border-amber-200 px-1.5 py-px sm:px-2 sm:py-0.5 text-[9px] sm:text-[10px] font-semibold text-amber-700">
              {ui.trustTopRated}
            </span>
          )}
          <span className="rounded-full bg-white border border-slate-200 px-1.5 py-px sm:px-2 sm:py-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-700">
            {ui.trustCompletedJobs(tasker.tasks_done)}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
        <Link href={`/taskers/${tasker.id}`}
          className="flex-1 rounded-lg sm:rounded-xl py-2 text-xs sm:text-sm font-bold text-blue-600 border border-blue-200 text-center hover:bg-blue-50 transition-all">
          {ui.viewProfile}
        </Link>
        <Link href={`/taskers/${tasker.id}`}
          className="flex-1 rounded-lg sm:rounded-xl py-2 text-xs sm:text-sm font-bold text-white text-center transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(90deg,#2563EB,#38BDF8)' }}>
          {bookLabel}
        </Link>
      </div>
    </div>
  )
}

export default function TaskersContent({
  taskers,
  activeCategory,
  citySlug,
  isSignedIn,
}: {
  taskers: Tasker[]
  activeCategory: string | null
  citySlug: string | null
  isSignedIn?: boolean
}) {
  const { t } = useLanguage()
  const tt = t.taskers
  const ui = {
    bannerPosted: tt.bannerPosted ?? 'Your task is posted! Browse helpers below and send a request.',
    title: tt.title ?? 'Find a helper near you',
    subtitle: tt.subtitle ?? 'Verified locals ready to help — book in minutes',
    searchPlaceholder: tt.searchPlaceholder ?? 'Search by name, service, or location…',
    statsHelpers: tt.statsHelpers ?? '2,400+ helpers',
    statsTasksCompleted: tt.statsTasksCompleted ?? '8,000+ tasks completed',
    statsResponse: tt.statsResponse ?? 'Avg. response < 2 hours',
    helpersFound: (count: number) => tt.helpersFound?.(count) ?? `${count} helper${count === 1 ? '' : 's'} found`,
    clearFilters: tt.clearFilters ?? 'clear filters',
    popularThisSpring: tt.popularThisSpring ?? 'Popular this spring',
    grid: tt.grid ?? 'Grid',
    map: tt.map ?? 'Map',
    noMatchTitle: tt.noMatchTitle ?? 'No helpers match your search',
    noMatchHint: tt.noMatchHint ?? 'Try adjusting your filters or search terms',
    clearAllFilters: tt.clearAllFilters ?? 'Clear all filters',
    ctaTitle: tt.ctaTitle ?? 'Are you a skilled professional?',
    ctaBody: tt.ctaBody ?? 'Join Hire2Skill as a helper and start earning on your own schedule.',
    ctaButton: tt.ctaButton ?? 'Sign up as a helper',
    availableToday: tt.availableToday ?? 'Available today',
    instantBook: tt.instantBook ?? 'Instant Book',
    verified: tt.verified ?? 'Verified',
    elite: tt.elite ?? 'Elite',
    reviews: (count: number) => tt.reviews?.(count) ?? `${count} reviews`,
    perHour: tt.perHour ?? 'per hour',
    perHourShort: tt.perHourShort ?? 'NOK/hr',
    tasksCount: (count: number) => tt.tasksCount?.(count) ?? `${count} tasks`,
    responseWithinHours: (hours: number) => tt.responseWithinHours?.(hours) ?? `< ${hours}h reply`,
    viewProfile: tt.viewProfile ?? 'View profile',
    mapAriaShowHelpersInCity: (count: number, city: string) =>
      tt.mapAriaShowHelpersInCity?.(count, city) ?? `Show ${count} helper${count === 1 ? '' : 's'} in ${city}`,
    mapClosePreview: tt.mapClosePreview ?? 'Close map preview',
    mapHelpersAcrossNorway: (count: number) =>
      tt.mapHelpersAcrossNorway?.(count) ?? `${count} helper${count === 1 ? '' : 's'} across Norway`,
    mapSearchPlaceholder: tt.mapSearchPlaceholder ?? 'Search for an area on the map',
    mapFooterHint: tt.mapFooterHint ?? 'Use the category row above to filter by service. Tap a dot to preview.',
    mapNoHelpersOnMap: tt.mapNoHelpersOnMap ?? 'No helpers match your filters — try another category or clear filters.',
    mapCategoryBadge: (label: string) => tt.mapCategoryBadge?.(label) ?? `Service: ${label}`,
    mapClusterAria: (count: number, city: string) =>
      tt.mapClusterAria?.(count, city) ?? `${count} helpers in ${city}, show list`,
    trustSignalsTitle: tt.trustSignalsTitle ?? 'Trust signals',
    trustVerifiedId: tt.trustVerifiedId ?? 'Verified ID',
    trustFastResponse: tt.trustFastResponse ?? 'Fast response',
    trustTopRated: tt.trustTopRated ?? 'Top rated',
    trustCompletedJobs: (count: number) => tt.trustCompletedJobs?.(count) ?? `${count} completed jobs`,
    filterTitle: tt.filterTitle ?? 'Filters',
    priceRange: tt.priceRange ?? 'Price (NOK/hr)',
    minPricePlaceholder: tt.minPricePlaceholder ?? 'Min',
    maxPricePlaceholder: tt.maxPricePlaceholder ?? 'Max',
    minRatingLabel: tt.minRatingLabel ?? 'Min. rating',
    filtersActive: (n: number) => tt.filtersActive?.(n) ?? `${n} filter${n === 1 ? '' : 's'}`,
    bringTools: tt.bringTools ?? 'Brings tools',
    canInvoice: tt.canInvoice ?? 'Can invoice',
    sortLabel: tt.sortLabel ?? 'Sort:',
    sortOptions: {
      recommended: tt.sortOptions?.recommended ?? 'Recommended',
      price_asc:   tt.sortOptions?.price_asc   ?? 'Price: Low → High',
      price_desc:  tt.sortOptions?.price_desc  ?? 'Price: High → Low',
      most_reviews: tt.sortOptions?.most_reviews ?? 'Most reviews',
      top_rated:   tt.sortOptions?.top_rated   ?? 'Highest rated',
    },
    anyRating: tt.anyRating ?? 'Any rating',
  }

  const cityKeyNorm = citySlug?.toLowerCase() ?? ''
  const cityBlock =
    cityKeyNorm === 'oslo' || cityKeyNorm === 'bergen' || cityKeyNorm === 'trondheim'
      ? tt.cityLanding?.[cityKeyNorm as 'oslo' | 'bergen' | 'trondheim']
      : undefined
  const pageTitle = cityBlock?.title ?? ui.title
  const pageSubtitle = cityBlock?.subtitle ?? ui.subtitle

  const searchParams = useSearchParams()
  const posted = searchParams.get('posted') === '1'

  const [showBanner, setShowBanner] = useState(posted)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState(activeCategory ?? 'All')
  const groupParam = searchParams.get('group')?.toLowerCase() ?? null

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false)
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [filterBringTools, setFilterBringTools] = useState(false)
  const [filterCanInvoice, setFilterCanInvoice] = useState(false)
  type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'most_reviews' | 'top_rated'
  const [sortBy, setSortBy] = useState<SortKey>('recommended')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortDropdown(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 280)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => {
    if (posted) {
      const id = setTimeout(() => setShowBanner(false), 5000)
      return () => clearTimeout(id)
    }
  }, [posted])

  const priceMinNum = priceMin === '' ? null : Number(priceMin)
  const priceMaxNum = priceMax === '' ? null : Number(priceMax)

  const hasActiveFilters = !!(
    debouncedQuery || category !== 'All' ||
    priceMinNum !== null || priceMaxNum !== null ||
    minRating > 0 || filterBringTools || filterCanInvoice
  )

  const activeAdvancedFilterCount = [
    priceMinNum !== null || priceMaxNum !== null,
    minRating > 0,
    filterBringTools,
    filterCanInvoice,
  ].filter(Boolean).length

  const filtered = useMemo(() => {
    let list = [...taskers]

    if (citySlug) {
      const key = citySlug.toLowerCase()
      list = list.filter(t => helperCityKey(t.location) === key)
    }

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      list = list.filter(t =>
        t.display_name.toLowerCase().includes(q) ||
        t.bio.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.categories.some(c => c.toLowerCase().includes(q))
      )
    }

    if (category !== 'All') {
      const activeKey = toCategoryKey(category)
      list = list.filter(t => t.categories.some(c => toCategoryKey(c) === activeKey))
    } else if (groupParam && CATEGORY_GROUPS[groupParam]) {
      const groupKeys = CATEGORY_GROUPS[groupParam]
      list = list.filter(t => t.categories.some(c => groupKeys.includes(toCategoryKey(c))))
    }

    if (priceMinNum !== null) list = list.filter(t => t.hourly_rate >= priceMinNum)
    if (priceMaxNum !== null) list = list.filter(t => t.hourly_rate <= priceMaxNum)
    if (minRating > 0) list = list.filter(t => t.rating >= minRating)
    if (filterBringTools) list = list.filter(t => t.brings_tools === true)
    if (filterCanInvoice) list = list.filter(t => t.can_invoice === true)

    switch (sortBy) {
      case 'price_asc':   list.sort((a, b) => a.hourly_rate - b.hourly_rate); break
      case 'price_desc':  list.sort((a, b) => b.hourly_rate - a.hourly_rate); break
      case 'most_reviews': list.sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0)); break
      case 'top_rated':   list.sort((a, b) => b.rating - a.rating); break
      default:            list.sort((a, b) => (b.rating * 20 + b.tasks_done) - (a.rating * 20 + a.tasks_done))
    }

    return list
  }, [taskers, citySlug, debouncedQuery, category, groupParam, priceMinNum, priceMaxNum, minRating, filterBringTools, filterCanInvoice, sortBy])

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: 'query' | 'category' | 'price' | 'rating' | 'tools' | 'invoice'; label: string }> = []
    if (debouncedQuery.trim()) chips.push({ key: 'query', label: `"${debouncedQuery.trim()}"` })
    if (category !== 'All') chips.push({ key: 'category', label: category })
    if (priceMinNum !== null && priceMaxNum !== null) chips.push({ key: 'price', label: `${priceMinNum}–${priceMaxNum} NOK/hr` })
    else if (priceMinNum !== null) chips.push({ key: 'price', label: `≥ ${priceMinNum} NOK/hr` })
    else if (priceMaxNum !== null) chips.push({ key: 'price', label: `≤ ${priceMaxNum} NOK/hr` })
    if (minRating > 0) chips.push({ key: 'rating', label: `${'★'.repeat(minRating)}${minRating < 5 ? '☆'.repeat(5 - minRating) : ''}` })
    if (filterBringTools) chips.push({ key: 'tools', label: ui.bringTools })
    if (filterCanInvoice) chips.push({ key: 'invoice', label: ui.canInvoice })
    return chips
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, category, priceMinNum, priceMaxNum, minRating, filterBringTools, filterCanInvoice])

  function removeChip(key: 'query' | 'category' | 'price' | 'rating' | 'tools' | 'invoice') {
    if (key === 'query') { setQuery(''); setDebouncedQuery('') }
    else if (key === 'category') setCategory('All')
    else if (key === 'price') { setPriceMin(''); setPriceMax('') }
    else if (key === 'rating') setMinRating(0)
    else if (key === 'tools') setFilterBringTools(false)
    else if (key === 'invoice') setFilterCanInvoice(false)
  }

  function clearAll() {
    setQuery('')
    setDebouncedQuery('')
    setCategory('All')
    setPriceMin('')
    setPriceMax('')
    setMinRating(0)
    setFilterBringTools(false)
    setFilterCanInvoice(false)
    setSortBy('recommended')
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {showBanner && (
        <div className="bg-green-600 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span className="text-sm font-semibold">{ui.bannerPosted}</span>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-white/80 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header + Search */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl sm:text-3xl leading-tight font-extrabold text-gray-900 mb-2">{pageTitle}</h1>
          <p className="text-gray-500 text-sm sm:text-[15px]">{pageSubtitle}</p>
          {citySlug && tt.cityLanding?.browseAllNorway && (
            <p className="mt-2">
              <Link href="/taskers" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                {tt.cityLanding.browseAllNorway}
              </Link>
            </p>
          )}
          {/* Search bar */}
          <div className="relative mt-6 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{ zIndex: 1 }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={ui.searchPlaceholder}
              style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: query ? '2.5rem' : '1rem' }}
              className={`${UI_TOKENS.input} block shadow-sm transition`}
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter + Sort row */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                showFilters || activeAdvancedFilterCount > 0
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
              }`}
            >
              <SlidersHorizontal size={15} strokeWidth={2} />
              {ui.filterTitle}
              {activeAdvancedFilterCount > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button>

            {/* Sort dropdown */}
            <div ref={sortRef} className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowSortDropdown(v => !v)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:border-blue-300 transition-colors"
              >
                <span className="hidden sm:inline text-gray-400 font-normal">{ui.sortLabel}</span>
                {ui.sortOptions[sortBy]}
                <ChevronDown size={14} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-1.5 z-30 min-w-44 rounded-xl border border-gray-200 bg-white shadow-lg py-1 overflow-hidden">
                  {(Object.keys(ui.sortOptions) as SortKey[]).map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setSortBy(key); setShowSortDropdown(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        sortBy === key
                          ? 'bg-blue-50 font-semibold text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {ui.sortOptions[key]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible filter panel */}
          {showFilters && (
            <div className="mt-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Price range */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{ui.priceRange}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={priceMin}
                    onChange={e => setPriceMin(e.target.value)}
                    placeholder={ui.minPricePlaceholder}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <span className="text-gray-400 shrink-0">–</span>
                  <input
                    type="number"
                    min={0}
                    value={priceMax}
                    onChange={e => setPriceMax(e.target.value)}
                    placeholder={ui.maxPricePlaceholder}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              {/* Minimum rating */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{ui.minRatingLabel}</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setMinRating(minRating === star ? 0 : star)}
                      className="transition-transform hover:scale-110"
                      aria-label={`${star} star minimum`}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill={(hoverRating || minRating) >= star ? '#F59E0B' : '#E5E7EB'} className="transition-colors duration-100">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </button>
                  ))}
                  {minRating > 0 && (
                    <button type="button" onClick={() => setMinRating(0)} className="ml-1 text-gray-400 hover:text-gray-600 text-xs">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Boolean toggles */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Options</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: ui.bringTools, value: filterBringTools, set: setFilterBringTools },
                    { label: ui.canInvoice, value: filterCanInvoice, set: setFilterCanInvoice },
                  ].map(({ label, value, set }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => set(!value)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left ${
                        value
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200'
                      }`}
                    >
                      <span className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        value ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {value && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><polyline points="1,4 3,6 7,2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 hidden sm:flex flex-wrap gap-6 text-sm text-gray-500">
            {[
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: ui.statsHelpers },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, label: ui.statsTasksCompleted },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, label: ui.statsResponse },
            ].map(s => (
              <span key={s.label} className="flex items-center gap-2">{s.icon}{s.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="min-w-0">
        {/* Category chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all border"
              style={category === cat
                ? { background: 'linear-gradient(90deg,#2563EB,#38BDF8)', color: '#fff', borderColor: 'transparent' }
                : { background: '#fff', color: '#374151', borderColor: '#E5E7EB' }}>
              {cat}
            </button>
          ))}
        </div>

        {activeFilterChips.length > 0 && (
          <div className={`${UI_TOKENS.panel} mb-5 flex flex-wrap items-center gap-2 rounded-xl p-2.5`}>
            {activeFilterChips.map((chip) => (
              <button key={chip.key} type="button" onClick={() => removeChip(chip.key)} className={UI_TOKENS.chipButton}>
                <span>{chip.label}</span>
                <span>×</span>
              </button>
            ))}
            <button onClick={clearAll} className={`ml-auto ${UI_TOKENS.clearAllLink}`}>
              {ui.clearAllFilters}
            </button>
          </div>
        )}

        {/* Results count + seasonal tag + view toggle */}
        <div className="flex items-center justify-between gap-2 mb-5">
          <p className="text-sm font-medium text-gray-600">
            {ui.helpersFound(filtered.length)}
            {hasActiveFilters && (
              <button onClick={clearAll} className="ml-2 text-xs text-blue-600 hover:underline">
                {ui.clearFilters}
              </button>
            )}
          </p>
          <div className="flex items-center gap-3">
            {!hasActiveFilters && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                {ui.popularThisSpring}
              </span>
            )}
            {/* Grid / Map toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
              <button onClick={() => setViewMode('grid')}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={viewMode === 'grid'
                  ? { background: 'linear-gradient(90deg,#2563EB,#38BDF8)', color: '#fff' }
                  : { color: '#6B7280' }}>
                <LayoutGrid size={13} strokeWidth={2} />
                {ui.grid}
              </button>
              <button onClick={() => setViewMode('map')}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={viewMode === 'map'
                  ? { background: 'linear-gradient(90deg,#2563EB,#38BDF8)', color: '#fff' }
                  : { color: '#6B7280' }}>
                <Map size={13} strokeWidth={2} />
                {ui.map}
              </button>
            </div>
          </div>
        </div>

        {/* Grid / Map */}
        {viewMode === 'map' ? (
          <MapView
            taskers={filtered}
            bookLabel={t.home?.bookNow ?? 'Book now'}
            ui={ui}
            categoryLabel={category}
            categoryAccentHex={category !== 'All' ? CATEGORY_BY_KEY[toCategoryKey(category)]?.color ?? null : null}
          />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-700 font-semibold mb-1">{ui.noMatchTitle}</p>
            <p className="text-gray-400 text-sm mb-4">{ui.noMatchHint}</p>
            <button onClick={clearAll}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(90deg,#2563EB,#38BDF8)' }}>
              {ui.clearAllFilters}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((tasker, i) => (
              <TaskerCard key={tasker.id} tasker={tasker} index={i} bookLabel={t.home?.bookNow ?? 'Book now'} ui={ui} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-14 rounded-2xl border border-blue-100 bg-blue-50 px-8 py-10 text-center">
          <h3 className="text-lg font-extrabold text-gray-900 mb-2">{ui.ctaTitle}</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{ui.ctaBody}</p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(90deg,#2563EB,#38BDF8)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            {ui.ctaButton}
          </Link>
        </div>
        </div>
      </div>
    </div>
  )
}
