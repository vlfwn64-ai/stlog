import { useState } from 'react'
import type { LiftKey, Unit } from '../logic/program'
import { GEAR, initialLifts, setState, today } from '../store'
import { CARD_ORDER, TH } from '../theme'
import { I, Icon } from '../ui'

type Vals = Record<LiftKey, number>

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [unit, setUnit] = useState<Unit>('kg')
  const [goal, setGoal] = useState<Vals>({ B: 150, D: 250, S: 200 })
  const [now, setNow] = useState<Vals>({ B: 100, D: 180, S: 140 })
  const [gear, setGear] = useState<string[]>([])
  const [plate, setPlate] = useState(2.5)

  const kg = unit === 'kg'
  const inc = kg ? 5 : 10
  const plates = kg ? [0.5, 1, 1.25, 2.5, 5] : [1, 2.5, 5, 10]
  const which = step === 0 ? goal : now
  const setWhich = step === 0 ? setGoal : setNow

  const changeUnit = (u: Unit) => {
    if (u === unit) return
    const f = u === 'lb' ? 2.2046 : 1 / 2.2046
    const conv = (o: Vals): Vals => ({ B: Math.round((o.B * f) / 5) * 5, D: Math.round((o.D * f) / 5) * 5, S: Math.round((o.S * f) / 5) * 5 })
    setGoal(conv(goal))
    setNow(conv(now))
    setPlate(2.5)
    setUnit(u)
  }

  const finish = () => {
    setState((s) => ({
      ...s,
      onboarded: true,
      settings: { unit, minPlate: plate, bar: kg ? 20 : 45, gear, goal },
      lifts: initialLifts(now, plate),
      rmHistory: CARD_ORDER.map((k) => ({ date: today(), lift: k, rm: now[k] })),
    }))
  }

  const titles = ['얼마나 강해지고 싶으신가요?', '지금은 얼마나 강하신가요?', '장비는 뭐가 있으세요?', '헬스장 원판 단위는요?']
  const sum = which.B + which.D + which.S

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px 8px 8px', gap: 8 }}>
        <button className="icon-btn" onClick={() => setStep(Math.max(0, step - 1))} style={{ opacity: step ? 1 : 0 }} aria-label="이전">
          <Icon d={I.back} />
        </button>
        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? '#191F28' : '#E5E8EB' }} />
          ))}
        </div>
        <span className="label num" style={{ width: 40, textAlign: 'right' }}>
          {step + 1} / 4
        </span>
      </div>

      <div className="scroll pad" style={{ paddingTop: 16 }}>
        <h1 className="h-xl" style={{ marginBottom: 24 }}>
          {titles[step]}
        </h1>

        {step <= 1 && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>
                3대 <b className="num" style={{ fontSize: 22 }}>{sum}</b>
                {unit}
              </span>
              <div className="seg">
                {(['kg', 'lb'] as Unit[]).map((u) => (
                  <button key={u} aria-pressed={unit === u} onClick={() => changeUnit(u)}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CARD_ORDER.map((k) => (
                <div key={k} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, background: TH[k].tint }}>
                  <span className="chip" style={{ background: TH[k].acc, color: TH[k].on, width: 36, height: 36, fontSize: 16 }}>
                    {k}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TH[k].text }}>{TH[k].name}</div>
                    <div className="num" style={{ fontSize: 24, fontWeight: 800 }}>
                      {which[k]}
                      <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 2 }}>{unit}</span>
                    </div>
                  </div>
                  <button className="icon-btn" style={{ background: '#fff', fontSize: 22, fontWeight: 700 }} aria-label={`${TH[k].name} ${inc} 빼기`} onClick={() => setWhich({ ...which, [k]: Math.max(0, which[k] - inc) })}>
                    −
                  </button>
                  <button className="icon-btn" style={{ background: '#fff', fontSize: 22, fontWeight: 700 }} aria-label={`${TH[k].name} ${inc} 더하기`} onClick={() => setWhich({ ...which, [k]: which[k] + inc })}>
                    +
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GEAR.map((g) => {
              const on = gear.includes(g)
              return (
                <button
                  key={g}
                  aria-pressed={on}
                  onClick={() => setGear(on ? gear.filter((x) => x !== g) : [...gear, g])}
                  style={{ height: 48, padding: '0 18px', borderRadius: 24, fontSize: 16, fontWeight: 700, background: on ? '#191F28' : '#F2F4F6', color: on ? '#fff' : '#333D4B' }}
                >
                  {g}
                </button>
              )
            })}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plates.map((p) => (
              <button
                key={p}
                aria-pressed={plate === p}
                onClick={() => setPlate(p)}
                style={{
                  height: 60,
                  borderRadius: 14,
                  padding: '0 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 18,
                  fontWeight: 700,
                  background: plate === p ? '#191F28' : '#F2F4F6',
                  color: plate === p ? '#fff' : '#191F28',
                }}
              >
                <span className="num">
                  {p}
                  {unit}
                </span>
                <span className="num" style={{ fontSize: 14, opacity: 0.8 }}>
                  +{p * 2}
                  {unit}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bottom">
        <button className="btn btn-black" onClick={() => (step === 3 ? finish() : setStep(step + 1))}>
          {step === 3 ? '시작하기' : '다음'}
        </button>
      </div>
    </div>
  )
}
