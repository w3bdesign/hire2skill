import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Hire2Skill — Find Local Helpers in Norway'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 45%, #38BDF8 100%)',
          padding: '72px 80px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background pattern dots */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glowing circle accent */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'rgba(56,189,248,0.15)',
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.5px',
            }}
          >
            Hire2Skill
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.05,
            letterSpacing: '-1.5px',
            marginBottom: 20,
            maxWidth: 740,
          }}
        >
          Find Local Helpers in Norway
        </div>

        {/* Sub-headline */}
        <div
          style={{
            fontSize: 26,
            color: 'rgba(255,255,255,0.75)',
            fontWeight: 500,
            marginBottom: 40,
            maxWidth: 620,
          }}
        >
          Verified cleaners, movers, tutors, handymen and more — booked fast and easy.
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['Cleaning', 'Moving', 'Tutoring', 'Handyman', 'Gardening'].map((cat) => (
            <div
              key={cat}
              style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 100,
                padding: '8px 20px',
                fontSize: 18,
                color: '#ffffff',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              {cat}
            </div>
          ))}
        </div>

        {/* URL badge bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 72,
            fontSize: 20,
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 500,
          }}
        >
          hire2skill.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
