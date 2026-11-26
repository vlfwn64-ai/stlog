import { useState } from 'react'
import type { LiftKey } from '../logic/program'
import { STAGES } from '../logic/program'
import type { AppState } from '../store'
import { useApp } from '../store'
import { CARD_ORDER, TH, fmt } from '../theme'
import { I, Icon, LineChart, ts } from '../ui'
import type { Go } from '../App'

export const CHART_COLOR: Record<LiftKey, string> = { S: '#0B8048', B: '#D92B3A', D: '#C99700' }

/** 종목별 추정(세션 e1RM) / 실제(1RM 기록) 점 */
export function liftPoints(s: AppState, lift: LiftKey, mode: 'est' | 'act') {
  if (mode === 'est') return s.sessions.filter((x) => x.lift === lift && x.e1rm).map((x) => ({ x: ts(x.date), y: x.e1rm as number }))
  return s.rmHistory.filter((x) => x.lift === lift).map((x) => ({ x: ts(x.date), y: x.rm }))
}

export function latestEst(s: AppState, lift: LiftKey): number | null {
  const l = s.sessions.filter((x) => x.lift === lift && x.e1rm)
  return l.length ? (l[l.length - 1].e1rm as number) : null
}

function Calendar({ s }: { s: AppState }) {
  const [off, setOff] = useState(0)
  const base = new Date()
  const d0 = new Date(base.getFullYear(), base.getMonth() + off, 1)
  const y = d0.getFullYear()
  const m = d0.getMonth()
  const days = new Date(y, m + 1, 0).getDate()
  const lead = d0.getDay()
  const byDate = new Map<string, LiftKey[]>()
  const add = (date: string, k: LiftKey) => byDate.set(date, [...new Set([...(byDate.get(date) ?? []), k])])
  s.sessions.forEach((x) => add(x.date, x.lift))
  s.tests.forEach((x) => add(x.date, x.lift))
  const key = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const todayKey = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 className="h-md num">
          {y}년 {m + 1}월
        </h2>
        <div style={{ display: 'flex' }}>
          <button className="icon-btn" aria-label="이전 달" onClick={() => setOff(off - 1)}>
            <Icon d={I.back} size={20} />
          </button>
          <button className="icon-btn" aria-label="다음 달" onClick={() => setOff(off + 1)}>
            <Icon d={I.right} size={20} />
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
          <span key={w} style={{ fontSize: 12, color: 'var(--mute)', paddingBottom: 2 }}>
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={'e' + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const k = key(i + 1)
          const lifts = byDate.get(k) ?? []
          const bg =
            lifts.length === 0
              ? 'transparent'
              : lifts.length === 1
                ? TH[lifts[0]].acc
                : `linear-gradient(135deg, ${lifts.map((l, j) => `${TH[l].acc} ${(j / lifts.length) * 100}% ${((j + 1) / lifts.length) * 100}%`).join(', ')})`
          const fg = lifts.length === 1 ? TH[lifts[0]].on : lifts.length ? '#fff' : '#191F28'
          return (
            <span
              key={k}
              className="num"
              style={{
                height: 36,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: k === todayKey || lifts.length ? 800 : 500,
                background: bg,
                color: fg,
                boxShadow: k === todayKey && !lifts.length ? 'inset 0 0 0 2px #191F28' : undefined,
              }}
            >
              {i + 1}
            </span>
          )
        })}
      </div>
    </section>
  )
}

export default function Home({ go }: { go: Go }) {
  const s = useApp()
  const [mode, setMode] = useState<'est' | 'act'>('act')
  const u = s.settings.unit
  const series = (['S', 'B', 'D'] as LiftKey[]).map((k) => ({ color: CHART_COLOR[k], label: k, pts: liftPoints(s, k, mode) }))
  const val = (k: LiftKey) => (mode === 'est' ? (latestEst(s, k) ?? s.lifts[k].oneRM) : s.lifts[k].oneRM)
  const total = CARD_ORDER.reduce((a, k) => a + val(k), 0)

  return (
    <div className="screen">
      <header className="hdr" style={{ paddingLeft: 20 }}>
        <h1 style={{ flex: 1, fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>ST LOG</h1>
        <button className="icon-btn" aria-label="메뉴" onClick={() => go({ name: 'menu' })}>
          <Icon d={I.menu} />
        </button>
      </header>
      <div className="scroll pad" style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 'var(--safe-bot)' }}>
        <Calendar s={s} />

        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 className="h-md">3대 기록</h2>
            <div className="seg">
              <button aria-pressed={mode === 'est'} onClick={() => setMode('est')}>
                추정
              </button>
              <button aria-pressed={mode === 'act'} onClick={() => setMode('act')}>
                실제
              </button>
            </div>
          </div>
          <div className="num" style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
            {fmt(total)}
            <span style={{ fontSize: 15, marginLeft: 2 }}>{u}</span>
          </div>
          <LineChart series={series} unit={u} height={130} />
        </section>

        <section>
          <h2 className="h-md" style={{ marginBottom: 12 }}>
            훈련 기록하기
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CARD_ORDER.map((k) => {
              const p = s.lifts[k]
              const live = s.active?.lift === k
              return (
                <button
                  key={k}
                  onClick={() => (live ? go({ name: 'workout' }) : go({ name: 'lift', lift: k }))}
                  style={{ borderRadius: 16, background: TH[k].acc, color: TH[k].on, padding: 14, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 148 }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 900 }}>{k}</span>
                    <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>
                      {fmt(p.oneRM)}
                    </span>
                  </div>
                  <span style={{ height: 1, background: 'currentColor', opacity: 0.35 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{live ? '기록 중' : '이번 훈련'}</span>
                  {p.stage === 4 ? (
                    <span style={{ fontSize: 17, fontWeight: 800 }}>1RM 테스트</span>
                  ) : (
                    <span className="num" style={{ fontSize: 17, fontWeight: 800 }}>
                      {fmt(p.top)} × {STAGES[p.stage].topReps}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
