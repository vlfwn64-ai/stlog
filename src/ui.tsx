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
  locked,
}: {
  onClose: () => void
  /** 꼭 골라야 하는 시트: 바깥 누르기·끌어내리기로 안 닫힘 */
  locked?: boolean
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

  const lockedRef = useRef(locked)
  lockedRef.current = locked
  const close = () => {
    if (lockedRef.current) {
      setDrag(false)
      setDy(0)
      return
    }
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
    // 다이얼처럼 스스로 끄는 요소(data-nodrag) 위에서 시작한 끌기는 시트를 닫지 않는다
    const free = (e: Event) => !(e.target instanceof Element && e.target.closest('[data-nodrag]'))
    const ts = (e: TouchEvent) => free(e) && begin(e.touches[0].clientY)
    const tm = (e: TouchEvent) => move(e.touches[0].clientY, e)
    const md = (e: MouseEvent) => free(e) && begin(e.clientY)
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
export function Confirm({
  lift,
  eyebrow,
  title,
  desc,
  rows,
  cta,
  onCancel,
  onOk,
}: {
  lift?: LiftKey
  eyebrow: string
  title: string
  /** 제목 아래 작은 빨간 경고 */
  desc?: string
  rows: [string, ReactNode][]
  cta: string
  onCancel: () => void
  onOk: () => void
}) {
  const th = lift ? TH[lift] : null
  return (
    <Sheet onClose={onCancel} eyebrow={eyebrow} eyebrowColor={th?.text} title={title}>
      {desc && <p style={{ marginTop: -8, padding: '0 4px', fontSize: 13, lineHeight: 1.6, fontWeight: 600, color: '#D92B3A' }}>{desc}</p>}
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

export type Range = 'cycle' | '1m' | '3m' | '6m' | '1y' | 'all'
const DAY = 86400000
const RANGE_DAYS: Record<Exclude<Range, 'cycle' | 'all'>, number> = { '1m': 30, '3m': 91, '6m': 182, '1y': 365 }
export const rangeName = (r: Range) =>
  ({ cycle: L('사이클', 'Cycle'), '1m': L('1개월', '1M'), '3m': L('3개월', '3M'), '6m': L('6개월', '6M'), '1y': L('1년', '1Y'), all: L('전체', 'All') })[r]

/** 그래프 기간 버튼 */
export function RangeTabs({ value, options, onChange, compact }: { value: Range; options: Range[]; onChange: (r: Range) => void; compact?: boolean }) {
  return (
    <div role="group" aria-label={L('그래프 기간', 'Chart range')} style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 2, padding: 3, borderRadius: 10, background: 'var(--fill)' }}>
      {options.map((r) => {
        const on = r === value
        return (
          <button key={r} aria-pressed={on} onClick={() => onChange(r)} style={{ height: compact ? 26 : 30, borderRadius: 8, fontSize: 12, fontWeight: on ? 700 : 500, background: on ? 'var(--pill)' : 'transparent', color: on ? 'var(--ink)' : 'var(--mute)', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
            {rangeName(r)}
          </button>
        )
      })}
    </div>
  )
}

/** 기간 [시작, 끝]: 끝은 오늘, 시작은 기간만큼 전 (전체는 첫 기록, 사이클은 사이클 시작일). 첫 기록보다 앞으로는 안 간다 */
function rangeOf(range: Range, all: { t: number }[], cycleStart?: string): [number, number] {
  const end = ts(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10))
  const first = all.length ? Math.min(...all.map((p) => p.t)) : end - 30 * DAY
  let t0 = range === 'all' ? first : range === 'cycle' ? (cycleStart ? ts(cycleStart) : first) : end - RANGE_DAYS[range] * DAY
  // 기간이 아직 안 찼으면 첫 기록부터
  t0 = Math.max(t0, first)
  const t1 = Math.max(end, ...all.map((p) => p.t))
  if (t1 - t0 < 7 * DAY) t0 = t1 - 7 * DAY
  return [t0, t1]
}

/** 하루에 하나(그날 마지막), 날짜순 */
function perDay(pts: { t: number; y: number }[]) {
  const sorted = [...pts].sort((a, b) => a.t - b.t)
  return sorted.filter((p, i) => i === sorted.length - 1 || Math.floor(sorted[i + 1].t / DAY) !== Math.floor(p.t / DAY))
}

/** 단조 3차 곡선 경로 (Fritsch–Carlson): 점 사이를 부드럽게, 넘치지 않게 */
function monotonePath(p: { x: number; y: number }[]) {
  const n = p.length
  if (n === 1) return `M${p[0].x},${p[0].y}`
  const dx: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(p[i + 1].x - p[i].x)
    m.push((p[i + 1].y - p[i].y) / (p[i + 1].x - p[i].x))
  }
  const tg = p.map((_, i) => (i === 0 ? m[0] : i === n - 1 ? m[n - 2] : m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2))
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      tg[i] = 0
      tg[i + 1] = 0
      continue
    }
    const a = tg[i] / m[i]
    const b = tg[i + 1] / m[i]
    const h = a * a + b * b
    if (h > 9) {
      const t = 3 / Math.sqrt(h)
      tg[i] = t * a * m[i]
      tg[i + 1] = t * b * m[i]
    }
  }
  const f = (v: number) => +v.toFixed(1)
  let d = `M${f(p[0].x)},${f(p[0].y)}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C${f(p[i].x + h)},${f(p[i].y + tg[i] * h)} ${f(p[i + 1].x - h)},${f(p[i + 1].y - tg[i + 1] * h)} ${f(p[i + 1].x)},${f(p[i + 1].y)}`
  }
  return d
}

/**
 * 기록 사이는 부드러운 곡선, 마지막 기록 뒤로는 오늘까지 그대로,
 * 첫 기록 앞으로는 첫 기록 값을 왼쪽 끝까지 쭉.
 * 기간 밖 점도 곡선에 넣고 그래프 칸으로 잘라 보인다(clipPath).
 */
function smoothLine(pts: { t: number; y: number }[], t0: number, t1: number, X: (t: number) => number, Y: (v: number) => number) {
  const upto = pts.filter((p) => p.t <= t1)
  if (!upto.length) return null
  const before = upto.filter((p) => p.t < t0)
  const inside = upto.filter((p) => p.t >= t0)
  // 기간 바로 앞 기록 하나만 곡선에 넣는다 (그보다 앞은 안 보이니까)
  const seq = [...before.slice(-1), ...inside]
  const first = seq[0]
  const last = seq[seq.length - 1]
  if (first.t > t0) seq.unshift({ t: t0, y: first.y })
  if (last.t < t1) seq.push({ t: t1, y: last.y })
  const px = seq.map((p) => ({ x: X(p.t), y: Y(p.y) })).filter((p, i, arr) => i === 0 || p.x > arr[i - 1].x)
  const d = monotonePath(px)
  return { d, x0: px[0].x, x1: px[px.length - 1].x, last: { x: X(t1), y: Y(last.y), v: last.y }, inside, vals: seq.map((p) => p.y) }
}

/** x축 날짜 글자: 짧은 기간은 월/일, 긴 기간은 월 */
function xLabels(t0: number, t1: number) {
  const long = t1 - t0 > 120 * DAY
  const f = (t: number) => {
    const d = new Date(t)
    return long ? L(`${d.getFullYear() % 100}.${d.getMonth() + 1}월`, `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${String(d.getFullYear() % 100).padStart(2, '0')}`) : `${d.getMonth() + 1}/${d.getDate()}`
  }
  const raw = Array.from({ length: 5 }, (_, i) => t0 + ((t1 - t0) * i) / 4)
  return raw.map((t) => ({ t, s: f(t) })).filter((x, i, arr) => arr.findIndex((y) => y.s === x.s) === i)
}

/** 종목 화면 1RM 추이 */
export function LiftChart({ lift, pts, range, cycleStart }: { lift: LiftKey; pts: Pt[]; range: Range; cycleStart?: string }) {
  const gid = useId().replace(/:/g, '')
  const color = TH[lift].acc
  const x0 = 40
  const x1 = 334
  const top = 16
  const bot = 86
  const all = perDay(pts.map((p) => ({ t: p.x, y: p.y })))
  if (!all.length) return <svg width="100%" viewBox="0 0 350 108" aria-hidden="true" style={{ display: 'block' }} />
  const [t0, t1] = rangeOf(range, all, cycleStart)
  const X = (t: number) => +(x0 + ((x1 - x0) * (t - t0)) / (t1 - t0)).toFixed(1)
  const probe = smoothLine(all, t0, t1, X, () => 0)
  const { lo, hi } = niceRange(probe ? probe.vals : all.map((p) => p.y))
  const Y = (v: number) => +(bot - ((v - lo) / (hi - lo)) * (bot - top)).toFixed(1)
  const sl = smoothLine(all, t0, t1, X, Y)
  const mid = Math.round((lo + hi) / 2)
  const labels = xLabels(t0, t1)
  return (
    <svg width="100%" viewBox="0 0 350 108" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${gid}c`}>
          <rect x={x0} y="0" width={x1 - x0 + 6} height={bot + 1} />
        </clipPath>
      </defs>
      {[hi, mid, lo].map((v) => (
        <g key={v}>
          <line x1="34" x2="344" y1={Y(v)} y2={Y(v)} stroke="#F2F4F6" strokeWidth="1" />
          <text x="28" y={Y(v) + 3} fontSize="10" fill="#6B7684" textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {sl && (
        <>
          <g clipPath={`url(#${gid}c)`}>
            <path d={`${sl.d} L${sl.x1},${bot} L${sl.x0},${bot} Z`} fill={`url(#${gid})`} />
            <path d={sl.d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {sl.inside.map((p, i) => (
            <circle key={i} cx={X(p.t)} cy={Y(p.y)} r={2.5} style={{ fill: 'var(--bg)' }} stroke={color} strokeWidth="2" />
          ))}
          <circle cx={sl.last.x} cy={sl.last.y} r={4} fill={color} />
          <text x={sl.last.x} y={Math.max(10, +(sl.last.y - 10).toFixed(1))} fontSize="12" fontWeight="700" fill="#191F28" textAnchor="end" style={{ stroke: 'var(--bg)', strokeWidth: 3, paintOrder: 'stroke', strokeLinejoin: 'round' }}>
            {sl.last.v}
          </text>
        </>
      )}
      {labels.map((l, i) => (
        <text key={i} x={X(l.t)} y="104" fontSize="10" fill="#6B7684" textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}>
          {l.s}
        </text>
      ))}
    </svg>
  )
}

/** 홈(성장 탭) 3대 그래프: 종목 세 줄 */
export function HomeChart({ series, range }: { series: { lift: LiftKey; pts: { t: number; y: number }[] }[]; range: Range }) {
  const gid = useId().replace(/:/g, '')
  const hx0 = 40
  const hx1 = 334
  const htop = 14
  const hbot = 98
  const flat = series.flatMap((sr) => sr.pts)
  if (!flat.length) return <svg width="100%" viewBox="0 0 350 120" aria-hidden="true" style={{ display: 'block' }} />
  const [t0, t1] = rangeOf(range, flat)
  const X = (t: number) => +(hx0 + ((hx1 - hx0) * (t - t0)) / (t1 - t0)).toFixed(1)
  const per = series.map((sr) => ({ lift: sr.lift, pts: perDay(sr.pts) }))
  const vals = per.flatMap((sr) => smoothLine(sr.pts, t0, t1, X, () => 0)?.vals ?? [])
  const { lo, hi } = niceRange(vals.length ? vals : flat.map((p) => p.y))
  const Y = (v: number) => +(hbot - ((v - lo) / (hi - lo)) * (hbot - htop)).toFixed(1)
  const ticks = [hi, Math.round((lo + hi) / 2 / 5) * 5, lo]
  // 값 글자는 서로 겹치지 않게 띄운다
  const lines = per
    .map((sr) => {
      const sl = smoothLine(sr.pts, t0, t1, X, Y)
      return sl ? { lift: sr.lift, ...sl, ly: Math.max(10, +(sl.last.y - 7).toFixed(1)) } : null
    })
    .filter((l): l is NonNullable<typeof l> => !!l)
  ;[...lines]
    .sort((a, b) => a.ly - b.ly)
    .forEach((l, i, arr) => {
      if (i > 0 && l.ly - arr[i - 1].ly < 12) l.ly = +(arr[i - 1].ly + 12).toFixed(1)
    })
  const labels = xLabels(t0, t1)
  return (
    <svg width="100%" viewBox="0 0 350 120" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        {series.map((sr) => (
          <linearGradient key={sr.lift} id={gid + sr.lift} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TH[sr.lift].acc} stopOpacity="0.18" />
            <stop offset="100%" stopColor={TH[sr.lift].acc} stopOpacity="0" />
          </linearGradient>
        ))}
        <clipPath id={`${gid}c`}>
          <rect x={hx0} y="0" width={hx1 - hx0 + 6} height={hbot + 1} />
        </clipPath>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1="34" x2="344" y1={Y(v)} y2={Y(v)} stroke="#F2F4F6" strokeWidth="1" />
          <text x="28" y={Y(v) + 3} fontSize="10" fill="#6B7684" textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {lines.map((l) => (
        <g key={l.lift}>
          <g clipPath={`url(#${gid}c)`}>
            <path d={`${l.d} L${l.x1},${hbot} L${l.x0},${hbot} Z`} fill={`url(#${gid + l.lift})`} />
            <path d={l.d} fill="none" stroke={TH[l.lift].acc} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </g>
          <circle cx={l.last.x} cy={l.last.y} r="4" fill={TH[l.lift].acc} />
          <text x={+(l.last.x - 8).toFixed(1)} y={l.ly} fontSize="11" fontWeight="800" fill={TH[l.lift].label} textAnchor="end" style={{ stroke: 'var(--bg)', strokeWidth: 3, paintOrder: 'stroke', strokeLinejoin: 'round' }}>
            {l.lift} {l.last.v}
          </text>
        </g>
      ))}
      {labels.map((lb, i) => (
        <text key={i} x={X(lb.t)} y="116" fontSize="10" fill="#6B7684" textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}>
          {lb.s}
        </text>
      ))}
    </svg>
  )
}

export const ts = (date: string) => new Date(date + 'T12:00:00').getTime()
