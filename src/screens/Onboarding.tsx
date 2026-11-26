import { L } from '../i18n'
import type { Level, ProgramId } from '../logic/programs'
import { byLevel, levelHint, levelName, recommendLevel } from '../logic/programs'
import { LevelTabs, ProgramCards } from './ProgramPicker'
import { useState } from 'react'
import type { LiftKey, Unit } from '../logic/program'
import { stepOf } from '../logic/program'
import { AddGearSheet, BODY_DEFAULT, BodyPicker, DialSet, GearGrid, PLATES, PlatePicker } from '../dial'
import type { Body } from '../store'
import { GEAR, initialLifts, setState, today } from '../store'
import { CARD_ORDER, TH } from '../theme'
import { SegToggle } from '../ui'

type Vals = Record<LiftKey, number>

/** 수준별 추천 프로그램 */
const recOf = (lv: Level) => (byLevel(lv).find((p) => p.rec) ?? byLevel(lv)[0]).id

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [unit, setUnit] = useState<Unit>('kg')
  const [goal, setGoal] = useState<Vals>({ B: 120, D: 200, S: 180 })
  const [now, setNow] = useState<Vals>({ B: 80, D: 120, S: 140 })
  const [gear, setGear] = useState<string[]>(['벨트', '스트랩', '니슬리브'])
  const [custom, setCustom] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [plate, setPlate] = useState(2.5)
  const [body, setBody] = useState<Body>({ sex: 'm', height: BODY_DEFAULT.m.height, weight: BODY_DEFAULT.m.kg })
  const [level, setLevel] = useState<Level | null>(null)
  const [pick, setPick] = useState<Record<Level, ProgramId>>(() => ({ 0: recOf(0), 1: recOf(1), 2: recOf(2) }))
  const total = now.B + now.D + now.S
  const rec = recommendLevel(total, body.weight, body.sex)
  const lv = level ?? rec
  const LAST = 5

  const changeUnit = (u: Unit) => {
    if (u === unit) return
    const f = u === 'lb' ? 2.2046 : 1 / 2.2046
    const conv = (o: Vals): Vals => ({ B: Math.round((o.B * f) / 5) * 5, D: Math.round((o.D * f) / 5) * 5, S: Math.round((o.S * f) / 5) * 5 })
    setGoal(conv(goal))
    setNow(conv(now))
    // 고른 원판은 새 단위에서 가장 가까운 원판으로
    const p = plate * f
    setPlate(PLATES[u].reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a)))
    setBody({ ...body, weight: Math.round(body.weight * f * 2) / 2 })
    setUnit(u)
  }

  const finish = () => {
    setState((s) => ({
      ...s,
      onboarded: true,
      settings: { ...s.settings, unit, minPlate: plate, bar: unit === 'kg' ? 20 : 45, gear, customGear: custom, goal, body, program: pick[lv] },
      lifts: initialLifts(now, plate, pick[lv]),
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
          <button onClick={() => setStep(Math.max(0, step - 1))} aria-label={L('이전 단계', 'Back')} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: step ? 1 : 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>ST LOG</span>
          <span className="num" style={{ width: 44, textAlign: 'right', fontSize: 13, color: 'var(--mute)' }}>
            {step + 1} / {LAST + 1}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${LAST + 1}, minmax(0, 1fr))`, gap: 6, paddingLeft: 12 }}>
          {Array.from({ length: LAST + 1 }, (_, i) => i).map((i) => (
            <span key={i} style={{ height: 4, borderRadius: 2, background: i <= step ? 'var(--ink)' : 'var(--line)' }} />
          ))}
        </div>
      </header>

      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', padding: '28px 20px 0' }}>
        {(step === 2 || step === 3) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <h1 style={h1}>{step === 2 ? L('얼마나 강해지고 싶으신가요?', 'How strong do you want to be?') : L('지금은 얼마나 강하신가요?', 'How strong are you now?')}</h1>
              <SegToggle options={['kg', 'lb'] as Unit[]} value={unit} onChange={changeUnit} />
            </div>
            <p style={{ ...sub, marginTop: -12 }}>{step === 2 ? L('종목별 목표 1RM을 정해주세요.', 'Set a goal 1RM for each lift.') : L('최근 1RM을 입력해주세요. 정확하지 않아도 괜찮아요.', 'Enter your recent 1RM. A rough number is fine.')}</p>
            <DialSet vals={step === 2 ? goal : now} unit={unit} step={stepOf(plate)} onChange={step === 2 ? setGoal : setNow} />
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={h1}>{L('몸에 대해 알려주세요', 'Tell us about you')}</h1>
              <p style={sub}>{L('체중 대비 중량으로 알맞은 프로그램을 추천해 드려요.', 'We use your strength-to-bodyweight ratio to suggest a program.')}</p>
            </div>
            <BodyPicker value={body} unit={unit} onChange={setBody} />
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--mute)' }}>{L('몸무게는 설정에서 언제든 바꿀 수 있어요.', 'You can update your weight anytime in Settings.')}</p>
          </div>
        )}

        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={h1}>{L('어떤 프로그램으로 할까요?', 'Which program?')}</h1>
              <p style={sub}>{L('무게는 고른 프로그램에 맞춰 앱이 정해요. 설정에서 언제든 바꿀 수 있어요.', 'The app sets your weights for the program you pick. You can change it anytime in Settings.')}</p>
            </div>
            <div style={{ background: 'var(--fill2)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="num" style={{ fontSize: 15, fontWeight: 800 }}>
                {L(`3대 ${total}${unit} · 체중의 ${(total / body.weight).toFixed(1)}배`, `Total ${total}${unit} · ${(total / body.weight).toFixed(1)}× bodyweight`)}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--sub)' }}>
                {lv === rec
                  ? L(`${body.sex === 'f' ? '여성' : '남성'} 기준 ${levelName(rec)} 수준이라 ${levelName(rec)}을 추천해요.`, `That’s ${levelName(rec).toLowerCase()} level for ${body.sex === 'f' ? 'women' : 'men'}, so we suggest it.`)
                  : L(`${body.sex === 'f' ? '여성' : '남성'} 기준으로는 ${levelName(rec)} 수준이에요. 경력에 맞춰 골라도 괜찮아요.`, `That’s ${levelName(rec).toLowerCase()} level for ${body.sex === 'f' ? 'women' : 'men'}. Picking by experience is fine too.`)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <LevelTabs value={lv} rec={rec} onChange={setLevel} />
              <p style={{ padding: '0 4px', fontSize: 13, color: 'var(--mute)' }}>
                {L('경력으로 보면: ', 'By experience: ')}
                {levelHint(lv)}
              </p>
            </div>
            <ProgramCards level={lv} value={pick[lv]} onChange={(id) => setPick({ ...pick, [lv]: id })} />
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={h1}>{L('장비는 뭐가 있으세요?', 'What gear do you have?')}</h1>
              <p style={sub}>{L('가진 장비를 모두 골라주세요. 운동할 때 착용 여부를 체크할 수 있어요.', 'Pick everything you own. You can mark what you wore on each set.')}</p>
            </div>
            <GearGrid
              all={[...GEAR, ...custom]}
              sel={gear}
              onToggle={(g) => setGear(gear.includes(g) ? gear.filter((x) => x !== g) : [...gear, g])}
              onAdd={() => setAdding(true)}
            />
          </div>
        )}

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <h1 style={h1}>{L('헬스장 원판 단위는요?', 'Smallest plate at your gym?')}</h1>
                <SegToggle options={['kg', 'lb'] as Unit[]} value={unit} onChange={changeUnit} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: TH.B.text }}>{L('제일 가벼운 원판 1개의 무게를 입력해 주세요', 'Enter the weight of one lightest plate')}</p>
            </div>
            <PlatePicker value={plate} unit={unit} onChange={setPlate} />
            <div style={{ background: 'var(--fill2)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>
                {L(`한 번에 ${plate * 2}${unit}씩 올려요`, `Weights go up by ${plate * 2}${unit}`)}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--sub)' }}>
                {L(`양쪽에 ${plate}${unit} 원판을 하나씩 끼우는 기준이에요. 설정에서 언제든 바꿀 수 있어요.`, `One ${plate}${unit} plate on each side. You can change this anytime in Settings.`)}
              </span>
            </div>
          </div>
        )}
      </main>

      <div style={{ padding: '12px 20px var(--safe-bot)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={() => (step === LAST ? finish() : setStep(step + 1))} style={{ width: '100%', height: 56, borderRadius: 14, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 17, fontWeight: 700 }}>
          {step === LAST ? L('시작하기', 'Get started') : L('다음', 'Next')}
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
