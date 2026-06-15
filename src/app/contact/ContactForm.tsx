'use client'

import { useState } from 'react'

const SUBJECTS = [
  'Generelt spørsmål',
  'Bookingproblem',
  'Betaling eller fakturering',
  'Rapporter et problem',
  'Kontotilgang',
  'Samarbeidsforespørsel',
  'Annet',
]

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}>
          ✓
        </div>
        <h2 className="font-bold text-gray-900 text-xl">Melding sendt!</h2>
        <p className="text-gray-500 text-sm">Vi kontakter deg på <strong>{form.email}</strong> innen noen timer på hverdager.</p>
        <button onClick={() => { setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' }); setStatus('idle') }}
          className="text-sm text-blue-600 hover:underline mt-2">
          Send en ny melding
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
      <h2 className="font-bold text-gray-900 text-lg">Send oss en melding</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Ditt navn</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-400"
            placeholder="Kari Nordmann" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">E-postadresse</label>
          <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-400"
            placeholder="kari@example.no" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Emne</label>
        <select value={form.subject} onChange={e => set('subject', e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-white">
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Melding</label>
        <textarea required rows={5} value={form.message} onChange={e => set('message', e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-400 resize-none"
          placeholder="Beskriv spørsmålet eller problemet ditt så detaljert som mulig..." />
      </div>

      {status === 'error' && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          Noe gikk galt. Vennligst send e-post direkte til support@hire2skill.com
        </p>
      )}

      <button type="submit" disabled={status === 'sending'}
        className="w-full rounded-xl py-3 font-bold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}>
        {status === 'sending' ? 'Sender…' : 'Send melding'}
      </button>
    </form>
  )
}
