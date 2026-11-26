import { useState } from 'react'
import type { LiftKey } from '../logic/program'
import { GEAR, resetAll, setState, useApp } from '../store'
import { CARD_ORDER, TH, fmt } from '../theme'
import { Confirm, Header } from '../ui'
import type { Go } from '../App'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, gap: 12 }}>
      <span style={{ fontSize: 16, fontWeight: 600 }}>{label}</span>
      {children}
    </div>
  )
}

const stepBtn = { width: 40, height: 40, borderRadius: 10, background: 'var(--fill)', fontSize: 20, fontWeight: 700 }

export default function Menu({ go }: { go: Go }) {
  const s = useApp()
  const st = s.settings
  const u = st.unit
  const [reset, setReset] = useState(false)
  const plates = u === 'kg' ? [0.5, 1, 1.25, 2.5, 5] : [1, 2.5, 5, 10]
  const set = (p: Partial<typeof st>) => setState((x) => ({ ...x, settings: { ...x.settings, ...p } }))
  const goalStep = u === 'kg' ? 5 : 10
  const setGoal = (k: LiftKey, d: number) => set({ goal: { ...st.goal, [k]: Math.max(0, st.goal[k] + d) } })

  return (
    <div className="screen">
      <Header onBack={() => go({ name: 'home' })} title="설정" />
      <div className="scroll pad" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 'var(--safe-bot)' }}>
        <section>
          <h2 className="label" style={{ marginBottom: 4 }}>
            헬스장
          </h2>
          <Row label="제일 가벼운 원판">
            <div className="seg">
              {plates.map((p) => (
                <button key={p} aria-pressed={st.minPlate === p} onClick={() => set({ minPlate: p })}>
                  {p}
                </button>
              ))}
            </div>
          </Row>
          <Row label="바 무게">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button style={stepBtn} onClick={() => set({ bar: Math.max(0, st.bar - (u === 'kg' ? 5 : 5)) })} aria-label="바 무게 빼기">
                −
              </button>
              <b className="num" style={{ width: 56, textAlign: 'center' }}>
                {fmt(st.bar)}
                {u}
              </b>
              <button style={stepBtn} onClick={() => set({ bar: st.bar + 5 })} aria-label="바 무게 더하기">
                +
              </button>
            </div>
          </Row>
        </section>

        <section>
          <h2 className="label" style={{ marginBottom: 10 }}>
            보유 장비
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GEAR.map((g) => {
              const on = st.gear.includes(g)
              return (
                <button key={g} aria-pressed={on} onClick={() => set({ gear: on ? st.gear.filter((x) => x !== g) : [...st.gear, g] })} style={{ height: 40, padding: '0 14px', borderRadius: 20, fontSize: 14, fontWeight: 700, background: on ? '#191F28' : '#F2F4F6', color: on ? '#fff' : '#333D4B' }}>
                  {g}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="label" style={{ marginBottom: 4 }}>
            목표 1RM
          </h2>
          {CARD_ORDER.map((k) => (
            <Row key={k} label={TH[k].name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button style={stepBtn} onClick={() => setGoal(k, -goalStep)} aria-label={`${TH[k].name} 목표 빼기`}>
                  −
                </button>
                <b className="num" style={{ width: 64, textAlign: 'center', color: TH[k].text }}>
                  {fmt(st.goal[k])}
                  {u}
                </b>
                <button style={stepBtn} onClick={() => setGoal(k, goalStep)} aria-label={`${TH[k].name} 목표 더하기`}>
                  +
                </button>
              </div>
            </Row>
          ))}
        </section>

        <section>
          <button className="btn btn-gray" onClick={() => setReset(true)}>
            데이터 초기화
          </button>
          <div className="label" style={{ textAlign: 'center', marginTop: 16 }}>
            ST LOG v0.1
          </div>
        </section>
      </div>
      {reset && (
        <Confirm
          eyebrow="설정"
          title="모든 기록을 지울까요?"
          rows={[
            ['훈련 기록', `${s.sessions.length}회`],
            ['테스트', `${s.tests.length}회`],
          ]}
          cta="지우기"
          onCancel={() => setReset(false)}
          onOk={() => {
            resetAll()
            setReset(false)
          }}
        />
      )}
    </div>
  )
}
