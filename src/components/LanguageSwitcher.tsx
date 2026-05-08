'use client'

import { useLanguage } from '@/context/LanguageContext'
import { locales, localeNames, type Locale } from '@/lib/i18n/translations'
import { useState, useRef, useEffect, type FC, type SVGProps } from 'react'

type Svg = SVGProps<SVGSVGElement>

function FlagNo(props: Svg) {
  return (
    <svg viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <rect width="24" height="16" fill="#EF2B2D" />
      <rect x="6" width="4" height="16" fill="white" />
      <rect y="6" width="24" height="4" fill="white" />
      <rect x="7" width="2" height="16" fill="#003087" />
      <rect y="7" width="24" height="2" fill="#003087" />
    </svg>
  )
}

/** Union Jack (simplified, recognizable at small size) */
function FlagEn(props: Svg) {
  return (
    <svg viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <rect width="60" height="30" fill="#012169" />
      <path stroke="white" strokeWidth="8" d="M0,0 L60,30 M60,0 L0,30" />
      <path stroke="#C8102E" strokeWidth="4" d="M0,0 L60,30 M60,0 L0,30" />
      <path stroke="white" strokeWidth="10" d="M30,0 v30 M0,15 h60" />
      <path stroke="#C8102E" strokeWidth="6" d="M30,0 v30 M0,15 h60" />
    </svg>
  )
}

function FlagDa(props: Svg) {
  return (
    <svg viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <rect width="18" height="12" fill="#C8102E" />
      <rect x="6" width="2" height="12" fill="white" />
      <rect y="5" width="18" height="2" fill="white" />
    </svg>
  )
}

function FlagSv(props: Svg) {
  return (
    <svg viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <rect width="18" height="12" fill="#006AA7" />
      <rect x="5.2" width="2.4" height="12" fill="#FECC00" />
      <rect y="4.8" width="18" height="2.4" fill="#FECC00" />
    </svg>
  )
}

const FlagIcon: Record<Locale, FC<Svg>> = {
  en: FlagEn,
  no: FlagNo,
  da: FlagDa,
  sv: FlagSv,
}

function LocaleFlag({ locale, className }: { locale: Locale; className?: string }) {
  const Cmp = FlagIcon[locale]
  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-xs ring-1 ring-black/10 ${className ?? ''}`}>
      <Cmp className="h-3.5 w-5 sm:h-4 sm:w-[1.35rem]" />
    </span>
  )
}

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const n = t.nav

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={localeNames[locale]}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${n.chooseLanguage}: ${localeNames[locale]}`}
        className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <LocaleFlag locale={locale} />
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1.5 min-w-13 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-60 py-1"
          role="listbox"
          aria-label={n.chooseLanguage}
        >
          {locales.map(l => (
            <button
              key={l}
              type="button"
              role="option"
              aria-selected={locale === l}
              title={localeNames[l]}
              onClick={() => { setLocale(l); setOpen(false) }}
              className={`flex w-full items-center justify-center px-3 py-3 transition-colors hover:bg-gray-50 ${locale === l ? 'bg-blue-50' : ''}`}
            >
              <LocaleFlag locale={l} />
              <span className="sr-only">{localeNames[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
