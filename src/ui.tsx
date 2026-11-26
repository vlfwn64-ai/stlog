import type { CSSProperties, ReactNode } from 'react'
import type { LiftKey } from './logic/program'
import { TH } from './theme'

export const themeVars = (lift?: LiftKey): CSSProperties =>
  (lift
    ? {
        '--acc': TH[lift].acc,
        '--on': TH[lift].on,
        '--text': TH[lift].text,
        '--tint': TH[lift].tint,
        '--deep': TH[lift].deep,
      }
    : {}) as CSSProperties

export function Icon({ d, size = 22, color = 'currentColor', w = 2 }: { d: string; size?: number; color?: string; w?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export const I = {
  back: 'M15 6l-6 6 6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  check: 'M5 12l5 5 9-10',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  pause: 'M9 6v12M15 6v12',
  play: 'M8 5l11 7-11 7z',
  reset: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  gear: 'M4 10h2v4H4zM18 10h2v4h-2zM6 12h12M8 8v8M16 8v8',
  right: 'M9 6l6 6-6 6',
}

export function Header({ onBack, title, sub, right, color }: { onBack?: () => void; title?: ReactNode; sub?: ReactNode; right?: ReactNode; color?: string }) {
  return (
    <header className="hdr">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          <Icon d={I.back} />
        </button>
      ) : (
        <span style={{ width: 12 }} />
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {title && <h1 style={{ fontSize: 20, fontWeight: 800, color: color ?? 'var(--ink)' }}>{title}</h1>}
        {sub && <span style={{ fontSize: 13, color: 'var(--sub)' }}>{sub}</span>}
      </div>
      {right}
    </header>
  )
}

/** RPE 시트와 같은 레이아웃의 바텀 시트 */
export function Sheet({ onClose, eyebrow, title, children }: { onClose: () => void; eyebrow?: ReactNode; title?: ReactNode; children: ReactNode }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {eyebrow && <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{eyebrow}</div>}
        {title && <h2 className="h-lg" style={{ marginBottom: 16 }}>{title}</h2>}
        {children}
      </div>
    </div>
  )
}

/** 확인 팝업: 요약 표 + 취소 / 실행 */
export function Confirm({
  eyebrow,
  title,
  rows,
  cta,
  onCancel,
  onOk,
}: {
  eyebrow: string
  title: string
  rows: [string, string][]
  cta: string
  onCancel: () => void
  onOk: () => void
}) {
  return (
    <Sheet onClose={onCancel} eyebrow={eyebrow} title={title}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
            <span style={{ color: 'var(--sub)' }}>{k}</span>
            <b className="num">{v}</b>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-gray" style={{ flex: 1 }} onClick={onCancel}>
          취소
        </button>
        <button className="btn btn-acc" style={{ flex: 2 }} onClick={onOk}>
          {cta}
        </button>
      </div>
    </Sheet>
  )
}

/** 간단한 선 그래프 */
export function LineChart({
  series,
  height = 140,
  unit,
}: {
  series: { color: string; label: string; pts: { x: number; y: number }[] }[]
  height?: number
  unit: string
}) {
  const W = 340
  const H = height
  const padL = 36
  const padR = 52
  const padT = 10
  const padB = 22
  const all = series.flatMap((s) => s.pts)
  if (!all.length) {
    return <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', fontSize: 13 }}>기록이 쌓이면 그래프가 보여요</div>
  }
  const xs = all.map((p) => p.x)
  const ys = all.map((p) => p.y)
  let x0 = Math.min(...xs)
  let x1 = Math.max(...xs)
  if (x0 === x1) {
    x0 -= 86400000 * 3
    x1 += 86400000 * 3
  }
  let y0 = Math.min(...ys)
  let y1 = Math.max(...ys)
  const padY = Math.max(5, (y1 - y0) * 0.15)
  y0 = Math.floor((y0 - padY) / 5) * 5
  y1 = Math.ceil((y1 + padY) / 5) * 5
  const X = (x: number) => padL + ((x - x0) / (x1 - x0)) * (W - padL - padR)
  const Y = (y: number) => padT + (1 - (y - y0) / (y1 - y0)) * (H - padT - padB)
  const dfmt = (t: number) => {
    const d = new Date(t)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img" aria-label={`그래프 (${unit})`}>
      {[y0, (y0 + y1) / 2, y1].map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="#E5E8EB" />
          <text x={padL - 6} y={Y(v) + 4} fontSize="10" textAnchor="end" fill="#6B7684">
            {Math.round(v)}
          </text>
        </g>
      ))}
      <text x={padL} y={H - 4} fontSize="10" fill="#6B7684">
        {dfmt(x0)}
      </text>
      <text x={W - padR} y={H - 4} fontSize="10" textAnchor="end" fill="#6B7684">
        {dfmt(x1)}
      </text>
      {series.map((s) => {
        const pts = [...s.pts].sort((a, b) => a.x - b.x)
        if (!pts.length) return null
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')
        const last = pts[pts.length - 1]
        return (
          <g key={s.label}>
            <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={pts.length === 1 ? 4 : 2.5} fill={s.color} />
            ))}
            <text x={X(last.x) + 8} y={Y(last.y) + 4} fontSize="12" fontWeight="800" fill={s.color}>
              {s.label} {Math.round(last.y)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export const ts = (date: string) => new Date(date + 'T12:00:00').getTime()
