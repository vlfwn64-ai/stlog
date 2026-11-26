import { useState } from 'react'
import type { LiftKey } from '../logic/program'
import { STAGES } from '../logic/program'
import type { AppState } from '../store'
import { useApp } from '../store'
import { CARD_ORDER, TH, fmt, md } from '../theme'
import { HomeChart, PillToggle, ts } from '../ui'
import type { Pt } from '../ui'
import type { Go } from '../App'

/** 종목별 추정(세션 e1RM) / 실제(1RM 기록) 점 */
export function liftPoints(s: AppState, lift: LiftKey, mode: 'est' | 'act'): Pt[] {
  if (mode === 'est') {
    const e = s.sessions.filter((x) => x.lift === lift && x.e1rm).map((x) => ({ x: ts(x.date), y: x.e1rm as number, date: md(x.date) }))
    // 추정 기록이 아직 없으면 실제 1RM으로 보여준다
    if (e.length) return e
  }
  return s.rmHistory.filter((x) => x.lift === lift).map((x) => ({ x: ts(x.date), y: x.rm, date: md(x.date) }))
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
  const byDate = new Map<string, LiftKey>()
  // 같은 날 여러 종목이면 마지막 기록 종목 색
  s.sessions.forEach((x) => byDate.set(x.date, x.lift))
  s.tests.forEach((x) => byDate.set(x.date, x.lift))
  const key = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const todayKey = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
  const arrow = (d: string, label: string, fn: () => void) => (
    <button aria-label={label} onClick={fn} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  )
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>이번 달</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {arrow('M15 6l-6 6 6 6', '이전 달', () => setOff(off - 1))}
          <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>
            {y}년 {m + 1}월
          </span>
          {arrow('M9 6l6 6-6 6', '다음 달', () => setOff(off + 1))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, textAlign: 'center' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
          <span key={w} style={{ fontSize: 12, color: '#6B7684', paddingBottom: 4 }}>
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={'e' + i} style={{ height: 36 }} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const k = key(i + 1)
          const lift = byDate.get(k)
          const isToday = k === todayKey
          if (lift)
            return (
              <div key={k} style={{ height: 36, borderRadius: 10, background: TH[lift].acc, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isToday ? 'inset 0 0 0 2px #191F28' : undefined }}>
                <span className="num" style={{ fontSize: 13, fontWeight: 700, color: TH[lift].on }}>
                  {i + 1}
                </span>
              </div>
            )
          if (isToday)
            return (
              <div key={k} style={{ height: 36, borderRadius: 10, border: '2px solid #191F28', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="num" style={{ fontSize: 13, fontWeight: 800 }}>
                  {i + 1}
                </span>
              </div>
            )
          return (
            <div key={k} style={{ height: 36, borderRadius: 10, background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="num" style={{ fontSize: 13, color: '#333D4B' }}>
                {i + 1}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function Home({ go }: { go: Go }) {
  const s = useApp()
  const [mode, setMode] = useState<'est' | 'act'>('est')
  const u = s.settings.unit
  const toggle = () => setMode(mode === 'est' ? 'act' : 'est')
  const series = (['S', 'B', 'D'] as LiftKey[]).map((k) => ({ lift: k, pts: liftPoints(s, k, mode).map((p) => ({ t: p.x, y: p.y })) }))
  // 추정 기록이 없는 종목은 1RM으로 합계
  const val = (k: LiftKey) => (mode === 'est' ? (latestEst(s, k) ?? s.lifts[k].oneRM) : s.lifts[k].oneRM)
  const sum = CARD_ORDER.reduce((a, k) => a + val(k), 0)

  return (
    <div className="screen">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 12px 4px 20px' }}>
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>ST LOG</span>
        <button aria-label="메뉴 열기" onClick={() => go({ name: 'menu' })} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>
      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 20px var(--safe-bot)' }}>
        <Calendar s={s} />

        <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              3대 기록
              <span className="num" style={{ fontSize: 13, fontWeight: 500, color: '#6B7684' }}>
                합계 {fmt(sum)}
                {u}
              </span>
            </h2>
            <PillToggle value={mode === 'est' ? 0 : 1} onToggle={toggle} a="추정" b="실제" label={`그래프 기준 바꾸기, 지금 ${mode === 'est' ? '추정' : '실제'} 1RM`} />
          </div>
          <button type="button" onClick={toggle} aria-label="눌러서 추정과 실제 전환" style={{ display: 'block', width: '100%' }}>
            <HomeChart series={series} unit={u} />
          </button>
        </section>

        <h2 style={{ margin: '0 0 -8px', fontSize: 17, fontWeight: 700 }}>훈련 기록하기</h2>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {CARD_ORDER.map((k) => {
            const p = s.lifts[k]
            const th = TH[k]
            return (
              <button key={k} onClick={() => go({ name: 'lift', lift: k })} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 16, background: th.tint, textAlign: 'left' }}>
                <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, width: '100%' }}>
                  <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1, color: th.letter }}>{k}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: 2 }}>
                    <span style={{ fontSize: 11, color: '#4E5968' }}>1RM</span>
                    <span className="num" style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>
                      {fmt(p.oneRM)}
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{u}</span>
                    </span>
                  </span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 10, width: '100%' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4E5968' }}>{s.active?.lift === k ? '기록 중' : '이번 훈련'}</span>
                  {p.stage === 4 ? (
                    <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>TEST</span>
                  ) : (
                    <span style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', justifyContent: 'start', columnGap: 6, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 10, color: '#4E5968' }}>{u}</span>
                      <span />
                      <span style={{ fontSize: 10, color: '#4E5968' }}>reps</span>
                      <span className="num" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
                        {fmt(p.top)}
                      </span>
                      <span style={{ fontSize: 14, color: '#4E5968' }}>×</span>
                      <span className="num" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
                        {STAGES[p.stage].topReps}
                      </span>
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </section>
      </main>
    </div>
  )
}
