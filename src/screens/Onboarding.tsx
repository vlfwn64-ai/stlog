import { useState } from 'react'
import type { LiftKey, Unit } from '../logic/program'
import { AddGearSheet, DialSet, GearGrid, PlatePicker } from '../dial'
import { GEAR, initialLifts, setState, today } from '../store'
import { CARD_ORDER } from '../theme'
import { SegToggle } from '../ui'

type Vals = Record<LiftKey, number>

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [unit, setUnit] = useState<Unit>('kg')
  const [goal, setGoal] = useState<Vals>({ B: 120, D: 200, S: 180 })
  const [now, setNow] = useState<Vals>({ B: 80, D: 120, S: 140 })
  const [gear, setGear] = useState<string[]>(['벨트', '스트랩', '니슬리브'])
  const [custom, setCustom] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [plate, setPlate] = useState(2.5)

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
      settings: { ...s.settings, unit, minPlate: plate, bar: unit === 'kg' ? 20 : 45, gear, customGear: custom, goal },
      lifts: initialLifts(now, plate),
      rmHistory: CARD_ORDER.map((k) => ({ date: today(), lift: k, rm: now[k] })),
    }))
    onDone()
  }

  const h1 = { fontSize: 24, lineHeight: 1.35, fontWeight: 800 } as const
  const sub = { fontSize: 14, color: 'var(--sub)' } as const

  return (
    <div className="screen">
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 20px 0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setStep(Math.max(0, step - 1))} aria-label="이전 단계" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: step ? 1 : 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>ST LOG</span>
          <span className="num" style={{ width: 44, textAlign: 'right', fontSize: 13, color: 'var(--mute)' }}>
            {step + 1} / 4
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, paddingLeft: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ height: 4, borderRadius: 2, background: i <= step ? 'var(--ink)' : 'var(--line)' }} />
          ))}
        </div>
      </header>

      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', padding: '28px 20px 0' }}>
        {step <= 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <h1 style={h1}>{step === 0 ? '얼마나 강해지고 싶으신가요?' : '지금은 얼마나 강하신가요?'}</h1>
              <SegToggle options={['kg', 'lb'] as Unit[]} value={unit} onChange={changeUnit} />
            </div>
            <p style={{ ...sub, marginTop: -12 }}>{step === 0 ? '종목별 목표 1RM을 정해주세요.' : '최근 1RM을 입력해주세요. 정확하지 않아도 괜찮아요.'}</p>
            <DialSet vals={step === 0 ? goal : now} unit={unit} onChange={step === 0 ? setGoal : setNow} />
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={h1}>장비는 뭐가 있으세요?</h1>
              <p style={sub}>가진 장비를 모두 골라주세요. 운동할 때 착용 여부를 체크할 수 있어요.</p>
            </div>
            <GearGrid
              all={[...GEAR, ...custom]}
              sel={gear}
              onToggle={(g) => setGear(gear.includes(g) ? gear.filter((x) => x !== g) : [...gear, g])}
              onAdd={() => setAdding(true)}
            />
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={h1}>헬스장 원판 단위는요?</h1>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#D92B3A' }}>제일 가벼운 원판 1개의 무게를 입력해 주세요</p>
            </div>
            <PlatePicker value={plate} unit={unit} onChange={setPlate} />
            <div style={{ background: 'var(--fill2)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>
                한 번에 {plate * 2}
                {unit}씩 올려요
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--sub)' }}>
                양쪽에 {plate}
                {unit} 원판을 하나씩 끼우는 기준이에요. 설정에서 언제든 바꿀 수 있어요.
              </span>
            </div>
          </div>
        )}
      </main>

      <div style={{ padding: '12px 20px var(--safe-bot)' }}>
        <button onClick={() => (step === 3 ? finish() : setStep(step + 1))} style={{ width: '100%', height: 56, borderRadius: 14, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 17, fontWeight: 700 }}>
          {step === 3 ? '시작하기' : '다음'}
        </button>
      </div>

      {adding && (
        <AddGearSheet
          onClose={() => setAdding(false)}
          onAdd={(n) => {
            if (![...GEAR, ...custom].includes(n)) setCustom([...custom, n])
            if (!gear.includes(n)) setGear([...gear, n])
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}
