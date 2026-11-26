import { L } from './i18n'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import type { LiftKey } from './logic/program'
import { TH } from './theme'

export function Icon({ d, size = 22, color = 'currentColor', w = 2, fill = 'none' }: { d: string; size?: number; color?: string; w?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={fill === 'none' ? color : 'none'} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export const I = {
  back: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  check: 'M5 12l5 5 9-10',
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
}

export const BeltIcon = ({ color = 'var(--ink2)' }: { color?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ stroke: color }} strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="8" width="20" height="8" rx="2" />
    <rect x="9" y="6.5" width="6" height="11" rx="1.5" />
  </svg>
)

/** 목업의 동그란 추정/실제 토글 */
export function PillToggle({ value, onToggle, a, b, label }: { value: 0 | 1; onToggle: () => void; a: string; b: string; label: string }) {
  const pill = (on: boolean): CSSProperties => ({
    height: 32,
    padding: '0 14px',
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    background: on ? 'var(--pill)' : 'transparent',
    color: on ? 'var(--ink)' : 'var(--mute)',
    fontWeight: on ? 700 : 600,
  })
  return (
    <button type="button" onClick={onToggle} aria-label={label} style={{ display: 'flex', gap: 2, padding: 4, borderRadius: 999, background: 'var(--fill)' }}>
      <span style={pill(value === 0)}>{a}</span>
      <span style={pill(value === 1)}>{b}</span>
    </button>
  )
}

/** 네모난 단위 토글 (kg / lb 등) */
export function SegToggle<T extends string>({ options, value, onChange, minWidth = 44, height = 36 }: { options: T[]; value: T; onChange: (v: T) => void; minWidth?: number; height?: number }) {
  return (
    <div role="group" style={{ display: 'flex', background: 'var(--fill)', borderRadius: 10, padding: 3, flexShrink: 0 }}>
      {options.map((o) => {
        const on = o === value
        return (
          <button
            key={o}
            aria-pressed={on}
            onClick={() => onChange(o)}
            style={{
              minWidth,
              height,
              borderRadius: 8,
              fontSize: 14,
              background: on ? 'var(--pill)' : 'transparent',
              fontWeight: on ? 700 : 500,
              color: on ? 'var(--ink)' : 'var(--sub)',
              boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : undefined,
              padding: '0 8px',
            }}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

/** 목업 바텀 시트: 손잡이 · 작은 색 글씨 · 큰 제목. 아래로 끌어내리면 닫힌다 */
export function Sheet({
  onClose,
  eyebrow,
  eyebrowColor,
  title,
  children,
  gap = 16,
  tall,
}: {
  onClose: () => void
  eyebrow?: ReactNode
  eyebrowColor?: string
  title?: ReactNode
  children: ReactNode
  gap?: number
  tall?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const [dy, setDy] = useState(0)
  const [drag, setDrag] = useState(false)
  const [closing, setClosing] = useState(false)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  const close = () => {
    setClosing(true)
    setDrag(false)
    setTimeout(() => closeRef.current(), 200)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let y0 = 0
    let t0 = 0
    let cur = 0
    let active = false
    let down = false
    const begin = (y: number) => {
      y0 = y
      t0 = Date.now()
      cur = 0
      active = false
      down = true
    }
    const move = (y: number, e: Event) => {
      if (!down) return
      const d = y - y0
      if (!active) {
        // 맨 위까지 스크롤된 상태에서 아래로 끌 때만
        if (d > 6 && el.scrollTop <= 0) {
          active = true
          y0 = y
        } else return
      }
      e.preventDefault()
      cur = Math.max(0, y - y0)
      setDrag(true)
      setDy(cur)
    }
    const end = () => {
      down = false
      if (!active) return
      active = false
      const v = cur / Math.max(1, Date.now() - t0)
      if (cur > 110 || v > 0.6) close()
      else {
        setDrag(false)
        setDy(0)
      }
    }
    const ts = (e: TouchEvent) => begin(e.touches[0].clientY)
    const tm = (e: TouchEvent) => move(e.touches[0].clientY, e)
    const md = (e: MouseEvent) => begin(e.clientY)
    const mm = (e: MouseEvent) => move(e.clientY, e)
    el.addEventListener('touchstart', ts, { passive: true })
    el.addEventListener('touchmove', tm, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    el.addEventListener('mousedown', md)
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', end)
    return () => {
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchmove', tm)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
      el.removeEventListener('mousedown', md)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', end)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shift = closing ? '100%' : `${dy}px`
  return (
    <div className="sheet-wrap">
      <button className="sheet-dim" aria-label={L('닫기', 'Close')} onClick={close} style={{ opacity: closing ? 0 : 1 - Math.min(0.6, dy / 500), transition: drag ? 'none' : 'opacity 200ms ease' }} />
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        className="sheet"
        style={{ gap, top: tall ? 'calc(var(--safe-top) + 73px)' : undefined, transform: `translateY(${shift})`, transition: drag ? 'none' : 'transform 200ms cubic-bezier(0.2,0.8,0.2,1)' }}
      >
        <div className="grab" />
        {(eyebrow || title) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>
            {eyebrow && <span style={{ fontSize: 13, fontWeight: 700, color: eyebrowColor ?? 'var(--ink)' }}>{eyebrow}</span>}
            {title && <h2 style={{ fontSize: 22, fontWeight: 800 }}>{title}</h2>}
          </div>
        )}
        {children}
      </section>
    </div>
  )
}

/** 회색 카드 안 요약 표 (줄 사이 구분선) */
export function SummaryRows({ rows, small }: { rows: [string, ReactNode][]; small?: boolean }) {
  return (
    <div style={{ background: 'var(--fill2)', borderRadius: small ? 14 : 16, padding: small ? 16 : '6px 16px', display: 'flex', flexDirection: 'column', gap: small ? 10 : 0 }}>
      {rows.map(([k, v], i) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: small ? undefined : 44, borderTop: !small && i ? '1px solid var(--line)' : undefined, fontSize: 14 }}>
          <span style={{ color: 'var(--sub)' }}>{k}</span>
          <span style={{ fontSize: small ? 14 : 15, fontWeight: small ? 600 : 700, textAlign: 'right' }} className="num">
            {v}
          </span>
        </div>
      ))}
    </div>
  )
}

/** 확인 팝업 (디로드 · 다음 단계 · 1RM 테스트) */
export function Confirm({ lift, eyebrow, title, rows, cta, onCancel, onOk }: { lift?: LiftKey; eyebrow: string; title: string; rows: [string, ReactNode][]; cta: string; onCancel: () => void; onOk: () => void }) {
  const th = lift ? TH[lift] : null
  return (
    <Sheet onClose={onCancel} eyebrow={eyebrow} eyebrowColor={th?.text} title={title}>
      <SummaryRows rows={rows} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ width: 110, flexShrink: 0, height: 56, borderRadius: 14, background: 'var(--fill)', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}>
          {L('취소', 'Cancel')}
        </button>
        <button onClick={onOk} style={{ flex: 1, height: 56, borderRadius: 14, background: th?.acc ?? 'var(--ink)', color: th?.on ?? 'var(--onInk)', fontSize: 17, fontWeight: 700 }}>
          {cta}
        </button>
      </div>
    </Sheet>
  )
}

export interface Pt {
  x: number
  y: number
  date: string
}

const niceRange = (vals: number[]) => {
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  const pad = Math.max(5, (hi - lo) * 0.2)
  lo = Math.floor((lo - pad) / 5) * 5
  hi = Math.ceil((hi + pad) / 5) * 5
  return { lo, hi }
}

/** 종목 화면 1RM 추이 (목업 Lift 그래프와 같은 모양) */
export function LiftChart({ lift, pts }: { lift: LiftKey; pts: Pt[] }) {
  const gid = useId().replace(/:/g, '')
  const color = TH[lift].acc
  const show = pts.slice(-8)
  const x0 = 40
  const x1 = 334
  const top = 14
  const bot = 112
  if (!show.length) return <svg width="100%" viewBox="0 0 350 138" aria-hidden="true" style={{ display: 'block' }} />
  const { lo, hi } = niceRange(show.map((p) => p.y))
  const n = show.length
  const yOf = (v: number) => +(bot - ((v - lo) / (hi - lo)) * (bot - top)).toFixed(1)
  const xy = show.map((p, i) => ({ x: n === 1 ? x1 : +(x0 + ((x1 - x0) * i) / (n - 1)).toFixed(1), y: yOf(p.y) }))
  const line = xy.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${line} ${xy[n - 1].x},${bot} ${xy[0].x},${bot}`
  const mid = Math.round((lo + hi) / 2)
  const last = xy[n - 1]
  return (
    <svg width="100%" viewBox="0 0 350 138" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[hi, mid, lo].map((v) => (
        <g key={v}>
          <line x1="34" x2="344" y1={yOf(v)} y2={yOf(v)} stroke="#F2F4F6" strokeWidth="1" />
          <text x="28" y={yOf(v) + 3} fontSize="10" fill="#6B7684" textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {n > 1 && <polygon points={area} fill={`url(#${gid})`} />}
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {xy.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={i === n - 1 ? 4 : 2.5} style={{ fill: i === n - 1 ? color : 'var(--bg)' }} stroke={color} strokeWidth="2" />
          <text x={p.x} y="132" fontSize="10" fill="#6B7684" textAnchor={n === 1 || i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'}>
            {show[i].date}
          </text>
        </g>
      ))}
      <text x={last.x} y={+(last.y - 10).toFixed(1)} fontSize="12" fontWeight="700" fill="#191F28" textAnchor="end">
        {show[n - 1].y}
      </text>
    </svg>
  )
}

/** 홈 3대 기록 그래프 (S·B·D 세 선) */
export function HomeChart({ series }: { series: { lift: LiftKey; pts: { t: number; y: number }[] }[] }) {
  const gid = useId().replace(/:/g, '')
  const hx0 = 40
  const hx1 = 334
  const htop = 12
  const hbot = 98
  const all = series.flatMap((s) => s.pts)
  if (!all.length) return <svg width="100%" viewBox="0 0 350 120" aria-hidden="true" style={{ display: 'block' }} />
  const { lo, hi } = niceRange(all.map((p) => p.y))
  let t0 = Math.min(...all.map((p) => p.t))
  let t1 = Math.max(...all.map((p) => p.t))
  if (t0 === t1) {
    t0 -= 86400000 * 14
  }
  if (t1 === t0) t1 += 86400000
  const X = (t: number) => +(hx0 + ((hx1 - hx0) * (t - t0)) / (t1 - t0)).toFixed(1)
  const Y = (v: number) => +(hbot - ((v - lo) / (hi - lo)) * (hbot - htop)).toFixed(1)
  const ticks = [hi, Math.round((lo + hi) / 2 / 5) * 5, lo]
  const labels = Array.from({ length: 5 }, (_, i) => t0 + ((t1 - t0) * i) / 4)
  const dl = (t: number) => {
    const d = new Date(t)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return (
    <svg width="100%" viewBox="0 0 350 120" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        {series.map((s) => (
          <linearGradient key={s.lift} id={gid + s.lift} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TH[s.lift].acc} stopOpacity="0.18" />
            <stop offset="100%" stopColor={TH[s.lift].acc} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1="34" x2="344" y1={Y(v)} y2={Y(v)} stroke="#F2F4F6" strokeWidth="1" />
          <text x="28" y={Y(v) + 3} fontSize="10" fill="#6B7684" textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {series.map((s) => {
        const pts = [...s.pts].sort((a, b) => a.t - b.t)
        if (!pts.length) return null
        const xy = pts.map((p) => [X(p.t), Y(p.y)] as const)
        const line = xy.map(([x, y]) => `${x},${y}`).join(' ')
        const last = xy[xy.length - 1]
        return (
          <g key={s.lift}>
            {xy.length > 1 && <polygon points={`${line} ${last[0]},${hbot} ${xy[0][0]},${hbot}`} fill={`url(#${gid + s.lift})`} />}
            <polyline points={line} fill="none" stroke={TH[s.lift].acc} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={last[0]} cy={last[1]} r="4" fill={TH[s.lift].acc} />
            <text x={+(last[0] - 8).toFixed(1)} y={+(last[1] - 7).toFixed(1)} fontSize="11" fontWeight="800" fill={TH[s.lift].label} textAnchor="end">
              {s.lift} {pts[pts.length - 1].y}
            </text>
          </g>
        )
      })}
      {labels.map((t, i) => (
        <text key={i} x={X(t)} y="116" fontSize="10" fill="#6B7684" textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>
          {dl(t)}
        </text>
      ))}
    </svg>
  )
}

export const ts = (date: string) => new Date(date + 'T12:00:00').getTime()
