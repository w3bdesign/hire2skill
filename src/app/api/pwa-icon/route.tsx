import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const raw = Number(searchParams.get('size') ?? '192')
  const dim = raw === 512 ? 512 : 192
  const radius = Math.round(dim * 0.22)
  const fontSize = dim === 512 ? 260 : 104

  return new ImageResponse(
    (
      <div
        style={{
          width: dim,
          height: dim,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg,#1E3A8A 0%,#1D4ED8 55%,#38BDF8 100%)',
          borderRadius: radius,
        }}
      >
        <span style={{ fontSize, lineHeight: 1 }}>⚡</span>
      </div>
    ),
    { width: dim, height: dim },
  )
}
