import Link from 'next/link'
import { Bolt, Globe2, Handshake, ShieldCheck } from 'lucide-react'
import IconBadge from '@/components/IconBadge'
import type { IconBadgeTone } from '@/components/IconBadge'

export const metadata = {
  title: 'Om Hire2Skill',
  description: 'Hire2Skill kobler folk med pålitelige lokale hjelpere over hele Norge. Lær om vår misjon, historie og verdier.',
}

const STATS = [
  { value: '10 000+', label: 'Oppdrag fullført' },
  { value: '2 500+', label: 'Verifiserte hjelpere' },
  { value: '50+', label: 'Byer i Norge' },
  { value: '4,8 ★', label: 'Gjennomsnittlig vurdering' },
]

const VALUES: Array<{
  Icon: typeof ShieldCheck
  iconColor: string
  tone: IconBadgeTone
  title: string
  desc: string
}> = [
  {
    Icon: ShieldCheck,
    iconColor: '#1D4ED8',
    tone: 'blue',
    title: 'Trygghet først',
    desc: 'Alle hjelpere er ID-verifisert før de kan akseptere bestillinger. Vurderinger og anmeldelser er ekte — postet bare av folk som har fullført et oppdrag.',
  },
  {
    Icon: Bolt,
    iconColor: '#D97706',
    tone: 'amber',
    title: 'Raskt og enkelt',
    desc: 'Legg ut et oppdrag på under to minutter. Bli matchet med tilgjengelige hjelpere samme dag. Ingen endeløs frem og tilbake.',
  },
  {
    Icon: Handshake,
    iconColor: '#059669',
    tone: 'emerald',
    title: 'Rettferdig for alle',
    desc: 'Hjelpere beholder mesteparten av det de tjener. Oppdragsgivere betaler transparente priser uten skjulte avgifter.',
  },
  {
    Icon: Globe2,
    iconColor: '#0891B2',
    tone: 'cyan',
    title: 'Lokalt, alltid',
    desc: 'Vi opererer kun i Norge. Våre hjelpere bor i din by og forstår ditt lokalsamfunn.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <div className="text-white" style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}>
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
            Norges pålitelige plattform<br />for lokal hjelp
          </h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Hire2Skill gjør det enkelt å finne dyktige, verifiserte hjelpere for alle typer oppdrag — fra rengjøring og flytting
            til undervisning og teknisk støtte. Vi bygger et mer sammenknyttet Norge, ett oppdrag av gangen.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Story */}
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-5">Vår historie</h2>
        <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed space-y-4">
          <p>
            Hire2Skill startet med en enkel observasjon: å finne pålitelig hjelp til dagligdagse oppgaver var
            overraskende vanskelig. Enten det var en lekkende kran, et møbel som skulle monteres,
            eller en mattelærer til en slitende elev — folk ble stående igjen med å søke gjennom Facebook-grupper
            og jungeltelegrafen, aldri helt sikre på hvem de kunne stole på.
          </p>
          <p>
            Vi bygde Hire2Skill for å endre på det. Vår plattform gjør det enkelt å legge ut ethvert oppdrag, bla gjennom
            verifiserte lokale hjelpere, lese ærlige anmeldelser og bestille med trygghet — alt på få minutter.
          </p>
          <p>
            I dag opererer Hire2Skill over hele Norge, og kobler tusenvis av mennesker med dyktige hjelpere
            hver uke. Vi er stolte av at hjelperne på vår plattform tjener rettferdige priser for sin ekspertise,
            og at folk som bruker tjenesten vår kan komme videre med livene sine i visshet om at jobben er i
            gode hender.
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-10 text-center">Det vi står for</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl border border-gray-200 p-6">
                <IconBadge tone={v.tone} size="md" className="mb-3">
                  <v.Icon size={22} strokeWidth={2.2} color={v.iconColor} />
                </IconBadge>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Klar til å komme i gang?</h2>
        <p className="text-gray-500 mb-8">Legg ut ditt første oppdrag gratis, eller opprett en hjelperprofil og begynn å tjene i dag.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/post"
            className="rounded-xl px-7 py-3 font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg,#1E3A8A,#38BDF8)' }}>
            Legg ut oppdrag
          </Link>
          <Link href="/signup"
            className="rounded-xl px-7 py-3 font-bold text-sm text-gray-700 border border-gray-200 hover:border-blue-300 transition-colors">
            Bli hjelper
          </Link>
        </div>
      </div>

    </div>
  )
}
