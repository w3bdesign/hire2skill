'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PUBLIC_ENV } from '@/lib/env/public'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/context/LanguageContext'

const VAPID_PUBLIC_KEY = PUBLIC_ENV.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const SW_SEEN_KEY = 'h2s.sw.controllerSeen'
const INSTALL_DISMISSED_KEY = 'h2s.pwa.installDismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY')
  }
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
}

export default function PWARegister() {
  const { t } = useLanguage()
  const P = t.pwa
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const regRef = useRef<ServiceWorkerRegistration | null>(null)

  const checkForSwUpdate = useCallback(() => {
    const reg = regRef.current
    if (reg) void reg.update().catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const alreadyDismissed = localStorage.getItem(INSTALL_DISMISSED_KEY)

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      installPromptRef.current = e as BeforeInstallPromptEvent
      // Expose globally so MobileNavSheet can trigger install from the menu
      ;(window as Window & { __h2sPwaPrompt?: Event }).__h2sPwaPrompt = e
      window.dispatchEvent(new CustomEvent('pwa:installable'))
      if (!alreadyDismissed) setShowInstall(true)
    }
    const onAppInstalled = () => {
      setShowInstall(false)
      installPromptRef.current = null
      ;(window as Window & { __h2sPwaPrompt?: Event }).__h2sPwaPrompt = undefined
      window.dispatchEvent(new CustomEvent('pwa:installed'))
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let pushTimer: ReturnType<typeof setTimeout> | undefined

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkForSwUpdate()
    }

    const onControllerChange = () => {
      try {
        if (!navigator.serviceWorker.controller) return
        if (typeof window === 'undefined') return
        if (!window.sessionStorage.getItem(SW_SEEN_KEY)) {
          window.sessionStorage.setItem(SW_SEEN_KEY, '1')
          return
        }
      } catch {
        return
      }
      setShowUpdate(true)
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    document.addEventListener('visibilitychange', onVisibility)

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        regRef.current = reg
        void reg.update().catch(() => {})
        if (Notification.permission === 'default') {
          pushTimer = setTimeout(() => setShowPrompt(true), 10_000)
          return
        }
        if (Notification.permission === 'granted') {
          void syncPushIfGranted()
        }
      })
      .catch(() => {})

    return () => {
      if (pushTimer !== undefined) clearTimeout(pushTimer)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [checkForSwUpdate])

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void syncPushIfGranted()
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleInstall() {
    const prompt = installPromptRef.current
    if (!prompt) return
    setShowInstall(false)
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'dismissed') {
      localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
    }
    installPromptRef.current = null
  }

  function dismissInstall() {
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
    setShowInstall(false)
  }

  async function enableNotifications() {
    setShowPrompt(false)
    const reg = await navigator.serviceWorker.ready
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    try {
      const sub = await subscribeToPush(reg)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await saveSubscription(sub)
    } catch {}
  }

  if (showInstall) {
    return (
      <div
        className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-60
                    bg-white border border-blue-200 rounded-2xl shadow-xl p-4 flex gap-3 items-start"
        role="status"
      >
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
          style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}
        >
          📲
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{P.installTitle}</p>
          <p className="text-xs text-gray-500 mt-0.5">{P.installBody}</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}
            >
              {P.installAdd}
            </button>
            <button
              type="button"
              onClick={dismissInstall}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200"
            >
              {P.installDismiss}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showUpdate) {
    return (
      <div
        className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-60
                    bg-white border border-blue-200 rounded-2xl shadow-xl p-4 flex gap-3 items-start"
        role="status"
      >
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
          style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}
        >
          ↻
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{P.updateTitle}</p>
          <p className="text-xs text-gray-500 mt-0.5">{P.updateBody}</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}
            >
              {P.updateReload}
            </button>
            <button
              type="button"
              onClick={() => setShowUpdate(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200"
            >
              {P.updateLater}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!showPrompt || dismissed) return null

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50
                    bg-white border border-gray-200 rounded-2xl shadow-xl p-4 flex gap-3 items-start">
      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
        style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}>
        🔔
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm">{P.notifyTitle}</p>
        <p className="text-xs text-gray-500 mt-0.5">{P.notifyBody}</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={enableNotifications}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}>
            {P.notifyEnable}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200">
            {P.notifyLater}
          </button>
        </div>
      </div>
    </div>
  )
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON()
  const res = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }),
  })
  if (!res.ok && res.status !== 401) {
    console.warn('[push] save subscription failed', res.status)
  }
}

async function syncPushIfGranted() {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await subscribeToPush(reg)
    await saveSubscription(sub)
  } catch {
    // Missing VAPID, SW not ready, or network — ignore
  }
}
