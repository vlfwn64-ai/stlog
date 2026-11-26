import { useState } from 'react'
import type { LiftKey } from '../logic/program'
import { firstAttempt, testResult, warmups } from '../logic/program'
import { finishTest } from '../actions'
import { step as stepOf, useApp } from '../store'
import { CARD_ORDER, TH, fmt } from '../theme'
import { I, Icon } from '../ui'
import type { Go } from '../App'

export default function Test({ lift, go }: { lift: LiftKey; go: Go }) {
  const s = useApp()
  const th = TH[lift]
  const u = s.settings.unit
  const st = stepOf(s)
  const p = s.lifts[lift]
  const [fa] = useState(() => firstAttempt(p.oneRM, st))
  const [warm] = useState(() => warmups(fa, { lift, step: st, bar: s.settings.bar, unit: u, heavy: true }))
  const [wi, setWi] = useState(0)
  const [attempts, setAttempts] = useState<{ weight: number; ok: boolean }[]>([])
  const [over, setOver] = useState(false)

  const inWarm = wi < warm.length
  const lastOk = attempts.filter((a) => a.ok).pop()
  const cur = inWarm ? warm[wi] : { weight: lastOk ? +(lastOk.weight + st).toFixed(2) : fa, reps: 1 }
  const newRM = testResult(p.oneRM, attempts)
  const sumBefore = CARD_ORDER.reduce((a, k) => a + s.lifts[k].oneRM, 0)

  const fg = th.on
  const ghost = th.on === '#FFFFFF' ? 'rgba(255,255,255,.18)' : 'rgba(25,31,40,.1)'

  const commit = (mode: 'new' | 'keep') => {
    finishTest(lift, attempts, mode)
    go({ name: 'lift', lift })
  }

  return (
    <div className="screen" style={{ background: th.acc, color: fg }}>
      <header className="hdr">
        <button className="icon-btn" onClick={() => go({ name: 'lift', lift })} aria-label="나가기">
          <Icon d={I.close} color={fg} />
        </button>
        <h1 style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>{th.name} TEST</h1>
      </header>

      {!over ? (
        <>
          <div className="pad" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, opacity: 0.85 }}>{inWarm ? `웜업 ${wi + 1} / ${warm.length}` : `${attempts.length + 1}차 시도`}</span>
            <span className="num" style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {fmt(cur.weight)}
              <span style={{ fontSize: 28, fontWeight: 800 }}>{u}</span>
            </span>
            <span className="num" style={{ fontSize: 22, fontWeight: 800 }}>× {cur.reps}</span>
            {attempts.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                {attempts.map((a, i) => (
                  <span key={i} className="num" style={{ height: 30, padding: '0 12px', borderRadius: 15, background: ghost, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', textDecoration: a.ok ? undefined : 'line-through' }}>
                    {fmt(a.weight)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="bottom">
            {inWarm ? (
              <button className="btn" style={{ background: fg, color: th.acc }} onClick={() => setWi(wi + 1)}>
                완료
              </button>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn"
                    style={{ flex: 1, background: ghost, color: fg }}
                    onClick={() => {
                      setAttempts([...attempts, { weight: cur.weight, ok: false }])
                      setOver(true)
                    }}
                  >
                    실패
                  </button>
                  <button className="btn" style={{ flex: 2, background: fg, color: th.acc }} onClick={() => setAttempts([...attempts, { weight: cur.weight, ok: true }])}>
                    성공
                  </button>
                </div>
                {lastOk && (
                  <button className="btn btn-sm" style={{ background: 'transparent', color: fg }} onClick={() => setOver(true)}>
                    여기서 끝내기
                  </button>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="scroll pad" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
            <span style={{ fontSize: 16, fontWeight: 700, opacity: 0.85 }}>새 1RM</span>
            <span className="num" style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>
              {fmt(newRM)}
              <span style={{ fontSize: 26 }}>{u}</span>
            </span>
            <span className="num" style={{ fontSize: 16, fontWeight: 700 }}>
              {newRM > p.oneRM ? `+${fmt(newRM - p.oneRM)}${u}` : '유지'} · 3대 {fmt(sumBefore)} → {fmt(sumBefore - p.oneRM + newRM)}
              {u}
            </span>
            <div style={{ borderRadius: 16, background: ghost, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attempts.map((a, i) => (
                <div key={i} className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                  <span>{i + 1}차</span>
                  <span>
                    {fmt(a.weight)}
                    {u} · {a.ok ? '성공' : '실패'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bottom">
            {p.stage === 4 ? (
              <button className="btn" style={{ background: fg, color: th.acc }} onClick={() => commit('new')}>
                새 사이클 시작
              </button>
            ) : (
              <>
                <button className="btn" style={{ background: fg, color: th.acc }} onClick={() => commit('new')}>
                  새 사이클 시작 (1단계부터)
                </button>
                <button className="btn" style={{ background: ghost, color: fg }} onClick={() => commit('keep')}>
                  지금 사이클 이어가기
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
