'use client'

import Link from 'next/link'
import { LogoHorizontal } from './SkillLinkLogo'
import { useLanguage } from '@/context/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()
  const f = t.footer

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-7">
        {/* Mobile: 2 columns (shorter scroll); lg: 4 columns */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4 lg:gap-x-9 lg:gap-y-6 items-start text-[11px] sm:text-xs lg:text-sm">
          {/* Brand — full width on mobile 2-col grid */}
          <div className="col-span-2 lg:col-span-1 min-w-0">
            <LogoHorizontal />
            <p className="mt-2 text-[10px] sm:text-[11px] lg:text-xs text-gray-400 leading-snug max-w-sm">
              {f.tagline}
            </p>
          </div>

          {/* Platform */}
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{f.platform}</p>
            <ul className="flex flex-col gap-1">
              <li><Link href="/jobs" className="text-gray-600 hover:text-blue-600 transition-colors wrap-break-word">{f.findJobs}</Link></li>
              <li><Link href="/post" className="text-gray-600 hover:text-blue-600 transition-colors wrap-break-word">{f.postJob}</Link></li>
              <li><Link href="/signup" className="text-gray-600 hover:text-blue-600 transition-colors wrap-break-word">{f.createAccount}</Link></li>
            </ul>
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-2 mb-0.5">{f.citiesHeading}</p>
            <p className="text-gray-600 leading-snug text-[11px] sm:text-xs">
              <Link href="/cities/oslo" className="hover:text-blue-600 transition-colors">Oslo</Link>
              <span className="text-gray-300 mx-1">·</span>
              <Link href="/cities/bergen" className="hover:text-blue-600 transition-colors">Bergen</Link>
              <span className="text-gray-300 mx-1">·</span>
              <Link href="/cities/trondheim" className="hover:text-blue-600 transition-colors">Trondheim</Link>
            </p>
          </div>

          {/* Company */}
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{f.company}</p>
            <ul className="flex flex-col gap-1">
              <li><Link href="/about" className="text-gray-600 hover:text-blue-600 transition-colors wrap-break-word">{f.about}</Link></li>
              <li><Link href="/contact" className="text-gray-600 hover:text-blue-600 transition-colors wrap-break-word">{f.contact}</Link></li>
              <li><Link href="/blog" className="text-gray-600 hover:text-blue-600 transition-colors wrap-break-word">{f.blog}</Link></li>
            </ul>
          </div>

          {/* Legal — two columns of links on mobile; single column on lg */}
          <div className="col-span-2 lg:col-span-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{f.legal}</p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 lg:grid-cols-1 lg:gap-1.5">
              <li><Link href="/personvern" className="text-gray-600 hover:text-blue-600 transition-colors wrap-break-word">{f.privacyLocal}</Link></li>
              <li><Link href="/vilkar" className="text-gray-600 hover:text-blue-600 transition-colors wrap-break-word">{f.termsLocal}</Link></li>
              <li><Link href="/privacy" className="text-gray-600 hover:text-blue-600 transition-colors wrap-break-word">{f.privacyEn}</Link></li>
              <li><Link href="/terms" className="text-gray-600 hover:text-blue-600 transition-colors wrap-break-word">{f.termsEn}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-4 pt-3 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <p className="text-[11px] text-gray-400 text-center sm:text-left">© {new Date().getFullYear()} Hire2Skill. {f.rights}</p>
          <p className="text-[11px] text-gray-400">{f.madeIn}</p>
        </div>
      </div>
    </footer>
  )
}
