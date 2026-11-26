import { L, attemptLabel } from '../i18n'
import { useState } from 'react'
import { useRestTimer } from '../rest'
import { unlockAudio } from '../sound'
import type { RestState } from '../store'
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

  // 성공 뒤 쉬는 시간 (기본 3분, 원이 줄어든다). 끝나는 시각 기준이라 앱을 내려도 정확
  const [rest, setRest] = useState<RestState>({ base: 180, endAt: null, left: 0 })
  const timer = useRestTimer(rest, setRest, { sound: s.settings.sound !== false })
  const remain = timer.remain
  const showRing = !inWarm && okList.length > 0 && !done
  const restStep = (d: number) => (d < 0 ? timer.minus() : timer.plus())
  const setResting = (on: boolean) => {
    if (!on) setRest((r) => ({ ...r, endAt: null, left: 0 }))
  }

  const step = (ok: boolean) => {
    unlockAudio()
    if (inWarm) return setI(i + 1)
    const next = [...attempts, { weight: cur, ok }]
    setAttempts(next)
    if (!ok) {
      setResting(false)
      return setDone(true)
    }
    timer.restart()
  }

  const R = 146
  const C = 2 * Math.PI * R
  const left = remain > 0 ? remain / Math.max(timer.base, 1) : 0

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
        <button aria-label={L('테스트 그만하기', 'Quit test')} onClick={() => go({ name: 'lift', lift })} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span style={{ textAlign: 'center', fontSize: 17, fontWeight: 800, letterSpacing: 0.2 }}>{th.title} TEST</span>
        <span className="num" style={{ textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
          {done ? '' : inWarm ? `${L('웜업', 'Warm-up')} ${i + 1}/${warm.length}` : attemptLabel(n + 1)}
        </span>
      </header>

      {!done ? (
        <>
          <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 20px' }}>
            {/* 원과 무게 자리는 1차·2차 시도 모두 같게 고정 */}
            <div style={{ position: 'relative', width: 'min(84vw, 320px)', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
              {showRing && (
                <svg viewBox="0 0 320 320" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)', pointerEvents: 'none' }}>
                  <circle cx="160" cy="160" r={R} fill="none" stroke={th.strong} strokeWidth="10" />
                  <circle
                    cx="160"
                    cy="160"
                    r={R}
                    fill="none"
                    stroke={fg}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={-C * (1 - left)}
                    style={{ transition: 'stroke-dashoffset 250ms linear', opacity: left > 0 ? 1 : 0 }}
                  />
                </svg>
              )}
              <span style={{ height: 30, lineHeight: '30px', fontSize: 22, fontWeight: 700 }}>{inWarm ? L('웜업', 'Warm-up') : attemptLabel(n + 1)}</span>
              <div style={{ height: 112, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                <span className="num" style={{ fontSize: inWarm ? 64 : 100, lineHeight: '112px', fontWeight: 900, letterSpacing: -2 }}>
                  {inWarm ? `${fmt(w.weight)} × ${w.reps}` : fmt(cur)}
                </span>
                {!inWarm && <span style={{ fontSize: 22, fontWeight: 700 }}>{u}</span>}
              </div>
              <span className="num" style={{ height: 30, lineHeight: '30px', fontSize: 15, fontWeight: 500 }}>
                {inWarm ? (nextW ? L(`다음 ${fmt(nextW.weight)} × ${nextW.reps}`, `Next ${fmt(nextW.weight)} × ${nextW.reps}`) : L(`다음은 1차 시도 ${fmt(first)}${u}`, `Next: attempt 1 at ${fmt(first)}${u}`)) : L(`성공하면 다음은 ${fmt(cur + S)}${u}`, `If you make it, next is ${fmt(cur + S)}${u}`)}
              </span>
            </div>
            {/* 쉬는 시간은 원 밖 (자리는 늘 잡아 둬서 무게 위치가 안 움직인다) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 48, visibility: showRing ? 'visible' : 'hidden', animation: timer.flash ? 'pulse 0.4s ease 4' : undefined }} aria-hidden={!showRing}>
              <button onClick={() => restStep(-10)} aria-label={L('쉬는 시간 10초 줄이기', 'Rest −10s')} style={{ width: 44, height: 44, borderRadius: 22, border: `2px solid ${fg}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <span role="timer" className="num" style={{ minWidth: 76, fontSize: 28, fontWeight: 800, textAlign: 'center' }}>
                {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')}
              </span>
              <button onClick={() => restStep(10)} aria-label={L('쉬는 시간 10초 늘리기', 'Rest +10s')} style={{ width: 44, height: 44, borderRadius: 22, border: `2px solid ${fg}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </main>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px var(--safe-bot)' }}>
            {/* 자리는 늘 잡아 둬서 위 무게 위치가 안 움직인다 */}
            <button
              onClick={() => (setResting(false), setDone(true))}
              disabled={!showRing}
              style={{ height: 44, color: fg, fontSize: 14, fontWeight: 600, textDecoration: 'underline', visibility: showRing ? 'visible' : 'hidden' }}
            >
              {L('여기서 테스트 끝내기', 'End test here')}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <button onClick={() => step(false)} style={{ height: 64, borderRadius: 16, border: `2px solid ${fg}`, background: 'transparent', color: fg, fontSize: 18, fontWeight: 800 }}>
                {L('실패', 'Fail')}
              </button>
              <button onClick={() => step(true)} style={{ height: 64, borderRadius: 16, background: th.solidBg, color: th.solidFg, fontSize: 18, fontWeight: 800 }}>
                {L('성공', 'Made it')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 18, padding: '24px 24px 8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 700 }}>{L('테스트 완료 · 새 1RM', 'Test done · New 1RM')}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="num" style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>
                  {fmt(best)}
                </span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{u}</span>
              </div>
              <span className="num" style={{ marginTop: 6, fontSize: 14, fontWeight: 800, color: th.solidFg, background: th.solidBg, padding: '5px 12px', borderRadius: 999 }}>
                {best > p.oneRM ? `+${fmt(best - p.oneRM)}${u}` : L('기존 1RM 유지', '1RM unchanged')}
              </span>
            </div>
            <span className="num" style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', flexShrink: 0 }}>
              {L('3대', 'Total')} {fmt(p.oneRM + others)} → {fmt(best + others)}
              {u}
            </span>
            {attempts.length > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.16)', borderRadius: 16, padding: '6px 16px', display: 'flex', flexDirection: 'column', minHeight: 0, flexShrink: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
                {attempts.map((a, k) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, flexShrink: 0, fontSize: 15 }}>
                    <span style={{ fontWeight: 600 }}>{attemptLabel(k + 1)}</span>
                    <span className="num" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800 }}>
                      {fmt(a.weight)}
                      {u}
                      <span style={{ minWidth: 36, textAlign: 'center', fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: a.ok ? th.solidBg : 'rgba(0,0,0,0.22)', color: a.ok ? th.solidFg : fg }}>{a.ok ? L('성공', 'Made') : L('실패', 'Missed')}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </main>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 20px var(--safe-bot)' }}>
            {midCycle && (
              <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, textAlign: 'center', marginBottom: 8 }}>
                {L(`이번 사이클은 ${p.stage}단계(${STAGES[stage3].topReps}회 탑) 진행 중이었어요.`, `You were on stage ${p.stage} (top ${STAGES[stage3].topReps}) of this cycle.`)}
                <br />
                {L('어떻게 이어갈까요?', 'How do you want to continue?')}
              </p>
            )}
            <button onClick={() => commit('new')} style={{ height: 56, borderRadius: 14, background: fg, color: th.testBg, fontSize: 17, fontWeight: 700 }}>
              {midCycle ? L('새 사이클 시작 (1단계부터)', 'New cycle (from stage 1)') : L('새 사이클 시작', 'Start new cycle')}
            </button>
            {midCycle && (
              <button onClick={() => commit('keep')} style={{ height: 56, borderRadius: 14, background: ghost, color: fg, fontSize: 17, fontWeight: 700 }}>
                {L('지금 사이클 이어가기', 'Keep this cycle')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
