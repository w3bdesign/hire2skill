import ContactForm from './ContactForm'

export const metadata = {
  title: 'Kontakt oss',
  description: 'Ta kontakt med Hire2Skill-teamet. Vi er her for å hjelpe med spørsmål om bestillinger, kontoer eller din opplevelse på plattformen.',
}

const FAQ = [
  { q: 'Hvordan avbestiller jeg en booking?', a: 'Gå til Dashboard, finn bookingen og klikk Avbestill. Avbestillingsregler settes per hjelper — sjekk før booking.' },
  { q: 'Hvordan rapporterer jeg et problem med en hjelper?', a: 'Bruk kontaktskjemaet og velg "Rapporter et problem". Vårt trygghetsteam svarer innen 24 timer.' },
  { q: 'Hvordan tilbakestiller jeg passordet mitt?', a: 'På innloggingssiden, klikk "Glemt passord" så sender vi en tilbakestillingslenke til e-posten din.' },
  { q: 'Når får jeg utbetalt som hjelper?', a: 'Utbetalinger frigis innen 48 timer etter at et oppdrag er markert som fullført. Sjekk kontobalansen din i Innstillinger.' },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Ta kontakt</h1>
          <p className="text-gray-500 text-lg max-w-xl">
            Vi svarer vanligvis innen noen timer på hverdager. For akutt hjelp, inkluder booking-ID.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12 grid lg:grid-cols-2 gap-10">

        {/* Contact form */}
        <ContactForm />

        {/* Info panel */}
        <div className="space-y-8">

          {/* Contact details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Andre måter å nå oss på</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">📧</span>
                <div>
                  <p className="text-sm font-semibold text-gray-700">E-post</p>
                  <p className="text-sm text-gray-500">support@hire2skill.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">⏱️</span>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Svartid</p>
                  <p className="text-sm text-gray-500">Man–Fre, vanligvis innen 4 timer</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Registrert adresse</p>
                  <p className="text-sm text-gray-500">Hire2Skill AS, Oslo, Norge</p>
                </div>
              </div>
            </div>
          </div>

          {/* Common questions */}
          <div>
            <h2 className="font-bold text-gray-900 mb-4">Vanlige spørsmål</h2>
            <div className="space-y-3">
              {FAQ.map(f => (
                <div key={f.q} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-1">{f.q}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
