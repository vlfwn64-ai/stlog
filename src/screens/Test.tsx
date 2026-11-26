import { useState } from 'react'
import type { LiftKey } from '../logic/program'
import { STAGES, firstAttempt, testResult, warmups } from '../logic/program'
import { finishTest } from '../actions'
import { step as stepOf, useApp } from '../store'
import { CARD_ORDER, TH, fmt } from '../theme'
import type { Go } from '../App'

export default function Test({ lift, go }: { lift: LiftKey; go: Go }) {
  const s = useApp()
  const th = TH[lift]
  const u = s.settings.unit
  const S = stepOf(s)
  const p = s.lifts[lift]
  const [first] = useState(() => firstAttempt(p.oneRM, S))
  const [warm] = useState(() => warmups(first, { lift, step: S, bar: s.settings.bar, unit: u, heavy: true }))
  const [i, setI] = useState(0)
  const [attempts, setAttempts] = useState<{ weight: number; ok: boolean }[]>([])
  const [done, setDone] = useState(false)

  const fg = th.testFg
  const ghost = fg === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(25,31,40,0.1)'
  const inWarm = !done && i < warm.length
  const n = attempts.length
  const okList = attempts.filter((a) => a.ok)
  const lastOk = okList.length ? okList[okList.length - 1].weight : null
  const cur = lastOk === null ? first : +(lastOk + S).toFixed(2)
  const w = warm[Math.min(i, warm.length - 1)]
  const nextW = warm[i + 1]

  const step = (ok: boolean) => {
    if (inWarm) return setI(i + 1)
    const next = [...attempts, { weight: cur, ok }]
    setAttempts(next)
    if (!ok) setDone(true)
  }

  const best = testResult(p.oneRM, attempts)
  const others = CARD_ORDER.filter((k) => k !== lift).reduce((a, k) => a + s.lifts[k].oneRM, 0)
  const stage3 = Math.min(3, p.stage) as 1 | 2 | 3
  const midCycle = p.stage < 4

  const commit = (mode: 'new' | 'keep') => {
    finishTest(lift, attempts, mode)
    go({ name: 'lift', lift })
  }

  return (
    <div className="screen" style={{ background: th.testBg, color: fg }}>
      <header style={{ display: 'grid', gridTemplateColumns: '44px 1fr 72px', alignItems: 'center', padding: '12px 16px 0 8px' }}>
        <button aria-label="테스트 그만하기" onClick={() => go({ name: 'lift', lift })} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span style={{ textAlign: 'center', fontSize: 17, fontWeight: 800, letterSpacing: 0.2 }}>{th.title} TEST</span>
        <span className="num" style={{ textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
          {done ? '' : inWarm ? `웜업 ${i + 1}/${warm.length}` : `${n + 1}차 시도`}
        </span>
      </header>

      {!done ? (
        <>
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 24px', textAlign: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{inWarm ? '웜업' : `${n + 1}차 시도`}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="num" style={{ fontSize: inWarm ? 64 : 112, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>
                {inWarm ? `${fmt(w.weight)} × ${w.reps}` : fmt(cur)}
              </span>
              {!inWarm && <span style={{ fontSize: 22, fontWeight: 700 }}>{u}</span>}
            </div>
            <span className="num" style={{ fontSize: 15, fontWeight: 500, marginTop: 8 }}>
              {inWarm ? (nextW ? `다음 ${fmt(nextW.weight)} × ${nextW.reps}` : `다음은 1차 시도 ${fmt(first)}${u}`) : `성공하면 다음은 ${fmt(cur + S)}${u}`}
            </span>
          </main>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px var(--safe-bot)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <button onClick={() => step(false)} style={{ height: 64, borderRadius: 16, border: `2px solid ${fg}`, background: 'transparent', color: fg, fontSize: 18, fontWeight: 800 }}>
                실패
              </button>
              <button onClick={() => step(true)} style={{ height: 64, borderRadius: 16, background: th.solidBg, color: th.solidFg, fontSize: 18, fontWeight: 800 }}>
                성공
              </button>
            </div>
            {!inWarm && okList.length > 0 && (
              <button onClick={() => setDone(true)} style={{ height: 44, color: fg, fontSize: 14, fontWeight: 600, textDecoration: 'underline' }}>
                여기서 테스트 끝내기
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 18, padding: '24px 24px 8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 700 }}>테스트 완료 · 새 1RM</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="num" style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>
                  {fmt(best)}
                </span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{u}</span>
              </div>
              <span className="num" style={{ marginTop: 6, fontSize: 14, fontWeight: 800, color: th.solidFg, background: th.solidBg, padding: '5px 12px', borderRadius: 999 }}>
                {best > p.oneRM ? `+${fmt(best - p.oneRM)}${u}` : '기존 1RM 유지'}
              </span>
            </div>
            <span className="num" style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', flexShrink: 0 }}>
              3대 {fmt(p.oneRM + others)} → {fmt(best + others)}
              {u}
            </span>
            {attempts.length > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.16)', borderRadius: 16, padding: '6px 16px', display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
                {attempts.map((a, k) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, flexShrink: 0, fontSize: 15 }}>
                    <span style={{ fontWeight: 600 }}>{k + 1}차 시도</span>
                    <span className="num" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800 }}>
                      {fmt(a.weight)}
                      {u}
                      <span style={{ minWidth: 36, textAlign: 'center', fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: a.ok ? th.solidBg : 'rgba(0,0,0,0.22)', color: a.ok ? th.solidFg : fg }}>{a.ok ? '성공' : '실패'}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </main>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 20px var(--safe-bot)' }}>
            {midCycle && (
              <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, textAlign: 'center', marginBottom: 8 }}>
                이번 사이클은 {p.stage}단계({STAGES[stage3].topReps}회 탑) 진행 중이었어요.
                <br />
                어떻게 이어갈까요?
              </p>
            )}
            <button onClick={() => commit('new')} style={{ height: 56, borderRadius: 14, background: fg, color: th.testBg, fontSize: 17, fontWeight: 700 }}>
              {midCycle ? '새 사이클 시작 (1단계부터)' : '새 사이클 시작'}
            </button>
            {midCycle && (
              <button onClick={() => commit('keep')} style={{ height: 56, borderRadius: 14, background: ghost, color: fg, fontSize: 17, fontWeight: 700 }}>
                지금 사이클 이어가기
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
