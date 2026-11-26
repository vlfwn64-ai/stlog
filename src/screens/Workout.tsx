import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Rpe, SetType } from '../logic/program'
import { STAGES } from '../logic/program'
import { applyTopRpe, finishWorkout, updateSets } from '../actions'
import type { SetRow } from '../store'
import { allGear, uid, useApp } from '../store'
import { SET_TYPES, TH, chipColors, fmt, md, typeName } from '../theme'
import { BeltIcon, Sheet } from '../ui'
import type { Go } from '../App'

const RPES: [Rpe, string, string][] = [
  [10, '10', '더는 못 함'],
  [9.5, '9.5', '1개는 애매, 무게는 조금 더 가능'],
  [9, '9', '1개 더 가능'],
  [8, '8', '2개 더 가능'],
  [7, '7', '3개 더 가능'],
  [6, '6', '4개 더 가능'],
  ['fail', '실패', '목표 횟수를 못 채움'],
]

const TIMER_STEP = 10
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`

/** 쉬는 시간: 기본 1:30 정지. 멈춘 상태의 ±는 총시간, 도는 중의 ±는 남은 시간 */
function useRestTimer() {
  const [base, setBase] = useState(90)
  const [remain, setRemain] = useState(90)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemain((r) => {
        if (r <= 1) {
          setRunning(false)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])
  return {
    base,
    remain,
    running,
    minus: () => {
      if (running) setRemain((r) => Math.max(0, r - TIMER_STEP))
      else {
        const b = Math.max(TIMER_STEP, base - TIMER_STEP)
        setBase(b)
        setRemain(b)
      }
    },
    plus: () => {
      if (running) {
        setRemain(remain + TIMER_STEP)
        setBase(Math.max(base, remain + TIMER_STEP))
      } else {
        setBase(base + TIMER_STEP)
        setRemain(base + TIMER_STEP)
      }
    },
    toggle: () => {
      if (!running && remain === 0) setRemain(base)
      setRunning(!running)
    },
    reset: () => {
      setRemain(base)
      setRunning(false)
    },
    restart: () => {
      setRemain(base)
      setRunning(true)
    },
  }
}

export default function Workout({ go }: { go: Go }) {
  const s = useApp()
  const a = s.active
  const [edit, setEdit] = useState<{ id: string; f: 'w' | 'r' } | null>(null)
  const [typeFor, setTypeFor] = useState<{ id: string; sel: string } | null>(null)
  const [rpeFor, setRpeFor] = useState<{ id: string; sel?: Rpe } | null>(null)
  const [gearFor, setGearFor] = useState<{ id: string; sel: string[]; rest: boolean } | null>(null)
  const [warmOpen, setWarmOpen] = useState(false)
  const timer = useRestTimer()
  useEffect(() => {
    if (!a) go({ name: 'home' })
  }, [a, go])

  if (!a) return null
  const lift = a.lift
  const th = TH[lift]
  const u = s.settings.unit
  const owned = s.settings.gear.length ? s.settings.gear : allGear(s.settings)
  const warm = a.sets.filter((r) => r.type === 'W')
  const warmDone = warm.length > 0 && warm.every((r) => r.done)
  const collapsed = warmDone && !warmOpen && !warm.some((r) => r.id === edit?.id)
  const nextId = a.sets.find((r) => !r.done)?.id
  const stage3 = Math.min(3, a.stage) as 1 | 2 | 3
  const sub = a.deload ? `디로드 · ${md(a.date)}` : `${a.stage}단계 · ${STAGES[stage3].topReps}회 탑 · ${md(a.date)}`

  const patch = (id: string, p: Partial<SetRow>) => updateSets((sets) => sets.map((r) => (r.id === id ? { ...r, ...p } : r)))
  const needsRpe = (r: SetRow) => !a.deload && (r.type === 'T' || r.type === 'B')
  const label = (r: SetRow) => {
    const same = a.sets.filter((x) => x.type === r.type)
    const idx = same.findIndex((x) => x.id === r.id) + 1
    return `${typeName(r.type)}${same.length > 1 ? ` ${idx}세트` : ''} · ${fmt(r.weight)}${u} × ${r.reps}`
  }

  const tapDone = (r: SetRow) => {
    setEdit(null)
    if (needsRpe(r)) return setRpeFor({ id: r.id, sel: r.rpe })
    patch(r.id, { done: !r.done })
    if (!r.done) timer.restart()
  }

  const bump = (r: SetRow, f: 'w' | 'r', d: number) => {
    if (f === 'w') patch(r.id, { weight: Math.max(0, +(r.weight + d).toFixed(2)) })
    else patch(r.id, { reps: Math.max(0, r.reps + d) })
  }

  const rowView = (r: SetRow) => {
    const open = edit?.id === r.id
    const fw = open && edit?.f === 'w'
    const fr = open && edit?.f === 'r'
    const chip = chipColors(r.type, lift)
    const cell = (sel: boolean): CSSProperties => ({
      height: 40,
      width: '100%',
      borderRadius: 10,
      border: `2px solid ${sel ? th.deep : open ? '#FFFFFF' : 'transparent'}`,
      background: open || sel ? '#FFFFFF' : '#F7F8FA',
      fontSize: 16,
      fontWeight: 700,
      color: '#191F28',
    })
    const circle: CSSProperties = { justifySelf: 'center', width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }
    let done
    if (r.done && r.rpe !== undefined)
      done = (
        <button onClick={() => tapDone(r)} aria-label={`완료됨, RPE ${r.rpe}`} style={{ ...circle, background: open ? '#FFFFFF' : th.acc, color: open ? '#191F28' : th.on, fontSize: 15, fontWeight: 800 }}>
          {r.rpe === 'fail' ? '실패' : r.rpe}
        </button>
      )
    else if (r.done)
      done = (
        <button onClick={() => tapDone(r)} aria-label="완료됨" style={{ ...circle, background: open ? '#FFFFFF' : th.acc }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={open ? '#191F28' : th.on} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
        </button>
      )
    else done = <button onClick={() => tapDone(r)} aria-label={needsRpe(r) ? '완료하고 RPE 입력' : '완료'} style={{ ...circle, border: `2px solid ${r.id === nextId ? th.line : '#D1D6DB'}`, background: '#FFFFFF' }} />

    return (
      <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 -6px', padding: open ? '6px 4px 10px' : '0 4px', borderRadius: 16, border: `2px solid ${open ? th.acc : 'transparent'}`, background: open ? th.acc : 'transparent' }}>
        <div className="grid5" style={{ height: 48 }}>
          <button onClick={() => (setEdit(null), setTypeFor({ id: r.id, sel: r.type }))} aria-label={`세트 종류 ${typeName(r.type)}, 바꾸기`} style={{ justifySelf: 'center', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: open ? '#FFFFFF' : chip.bg, color: open ? '#191F28' : chip.fg, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.type}</span>
          </button>
          <button className="num" onClick={() => setEdit(fw ? null : { id: r.id, f: 'w' })} aria-label={`무게 ${r.weight}${u}, 바꾸기`} style={cell(fw)}>
            {fmt(r.weight)}
          </button>
          <button className="num" onClick={() => setEdit(fr ? null : { id: r.id, f: 'r' })} aria-label={`횟수 ${r.reps}회, 바꾸기`} style={cell(fr)}>
            {r.reps}
          </button>
          {done}
          {r.gear.length ? (
            <button onClick={() => setGearFor({ id: r.id, sel: r.gear, rest: true })} aria-label={`장비: ${r.gear.join(', ')}`} style={{ justifySelf: 'center', width: 40, height: 40, borderRadius: 10, background: open ? '#FFFFFF' : '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BeltIcon color={open ? '#191F28' : '#333D4B'} />
            </button>
          ) : (
            <button onClick={() => setGearFor({ id: r.id, sel: [], rest: true })} aria-label="장비 선택" style={{ justifySelf: 'center', width: 40, height: 40, borderRadius: 10, border: `1.5px dashed ${open ? '#FFFFFF' : '#D1D6DB'}`, background: open ? '#FFFFFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={open ? '#191F28' : '#6B7684'} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>
        {open && edit && (
          <>
            <div style={{ padding: '0 4px 0 6px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) 76px', gridTemplateRows: 'repeat(2, 40px)', gap: 6 }}>
              {[10, 5, 1, -10, -5, -1].map((d) => (
                <button key={d} className="num" onClick={() => bump(r, edit.f, d)} aria-label={`${edit.f === 'w' ? '무게' : '횟수'} ${d > 0 ? '+' : '−'}${Math.abs(d)}`} style={{ height: 40, fontSize: 15, fontWeight: 700, borderRadius: 10, background: th.tint, color: th.deep }}>
                  {d > 0 ? `+${d}` : `−${-d}`}
                </button>
              ))}
              <button onClick={() => setEdit(null)} style={{ gridColumn: 4, gridRow: '1 / span 2', fontSize: 15, fontWeight: 800, borderRadius: 10, background: th.tint, color: th.deep }}>
                확인
              </button>
            </div>
            <div style={{ padding: '0 4px 0 6px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
              <button
                onClick={() => {
                  updateSets((sets) => sets.filter((x) => x.id !== r.id))
                  setEdit(null)
                }}
                style={{ height: 40, borderRadius: 10, background: '#191F28', color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}
              >
                세트 삭제
              </button>
              <button
                onClick={() => {
                  const n: SetRow = { ...r, id: uid(), done: false, rpe: undefined }
                  updateSets((sets) => {
                    const i = sets.findIndex((x) => x.id === r.id)
                    return [...sets.slice(0, i + 1), n, ...sets.slice(i + 1)]
                  })
                  setEdit({ id: n.id, f: 'w' })
                }}
                style={{ height: 40, borderRadius: 10, background: '#191F28', color: '#FFFFFF', fontSize: 14, fontWeight: 700 }}
              >
                세트 추가
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  const tBtn: CSSProperties = { width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: '1px solid #E5E8EB', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const rpeRow = rpeFor && a.sets.find((r) => r.id === rpeFor.id)
  const typeRow = typeFor && a.sets.find((r) => r.id === typeFor.id)
  const gearRow = gearFor && a.sets.find((r) => r.id === gearFor.id)

  return (
    <div className="screen">
      <header style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 12px 8px 8px' }}>
        <button aria-label="종목 화면으로" onClick={() => go({ name: 'lift', lift })} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: th.text }}>{th.title}</h1>
          <span className="num" style={{ fontSize: 13, color: '#4E5968' }}>
            {sub}
          </span>
        </div>
      </header>

      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 16px 8px' }}>
        <div className="grid5" style={{ fontSize: 12, color: '#6B7684', textAlign: 'center', paddingBottom: 2 }}>
          <span>세트</span>
          <span>무게 ({u})</span>
          <span>횟수</span>
          <span>완료</span>
          <span>장비</span>
        </div>
        {collapsed && (
          <button onClick={() => setWarmOpen(true)} aria-expanded="false" aria-label={`웜업 ${warm.length}세트 완료, 펼치기`} className="grid5" style={{ width: '100%', height: 48, textAlign: 'left' }}>
            <span style={{ justifySelf: 'center', width: 32, height: 32, borderRadius: 8, background: '#F2F4F6', color: '#4E5968', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>W</span>
            <span style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#191F28' }}>웜업 {warm.length}세트 완료</span>
              <span className="num" style={{ fontSize: 12, color: '#6B7684', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {warm.map((r) => fmt(r.weight)).join(' · ')}
                {u}
              </span>
            </span>
            <span style={{ justifySelf: 'center', width: 40, height: 40, borderRadius: 20, background: th.acc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={th.on} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
            <span style={{ justifySelf: 'center', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>
        )}
        {warmDone && !collapsed && (
          <button onClick={() => setWarmOpen(false)} aria-expanded="true" style={{ width: '100%', height: 40, borderRadius: 10, background: '#F2F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4E5968' }}>웜업 접기</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
        )}
        {a.sets.filter((r) => !(collapsed && r.type === 'W')).map(rowView)}
        {a.sets.length === 0 && (
          <button onClick={() => updateSets(() => [{ id: uid(), type: 'B', weight: s.lifts[lift].backoff, reps: 5, done: false, gear: [] }])} style={{ height: 48, borderRadius: 12, border: '1.5px dashed #D1D6DB', fontSize: 15, fontWeight: 600, color: '#4E5968' }}>
            세트 추가
          </button>
        )}
      </main>

      <div style={{ padding: '10px 20px var(--safe-bot)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <section aria-label="쉬는 시간 타이머" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F7F8FA', borderRadius: 16, padding: '10px 10px 10px 16px' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span role="timer" className="num" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: '#191F28' }}>
              {mmss(timer.remain)}
            </span>
            <div style={{ height: 4, borderRadius: 2, background: '#E5E8EB', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((timer.remain / Math.max(timer.base, 1)) * 100)}%`, background: th.acc, transition: 'width 900ms linear' }} />
            </div>
          </div>
          <button onClick={timer.minus} aria-label={`${TIMER_STEP}초 줄이기`} style={tBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </button>
          <button onClick={timer.plus} aria-label={`${TIMER_STEP}초 늘리기`} style={tBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button onClick={timer.toggle} aria-label={timer.running ? '일시정지' : '다시 시작'} style={tBtn}>
            {timer.running ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#191F28" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#191F28" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button onClick={timer.reset} aria-label="타이머 초기화" style={tBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12a8 8 0 1 0 2.4-5.7" />
              <path d="M4 4v4h4" />
            </svg>
          </button>
        </section>
        <button
          onClick={() => {
            const id = finishWorkout()
            if (id) go({ name: 'result', id })
          }}
          style={{ height: 56, borderRadius: 14, background: '#191F28', color: '#FFFFFF', fontSize: 17, fontWeight: 700 }}
        >
          기록 완료
        </button>
      </div>

      {typeFor && typeRow && (
        <Sheet onClose={() => setTypeFor(null)} eyebrow={`${a.sets.indexOf(typeRow) + 1}번째 세트 · ${fmt(typeRow.weight)}${u} × ${typeRow.reps}`} eyebrowColor={th.text} title="어떤 세트인가요?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SET_TYPES.map(([k, name, desc]) => {
              const on = typeFor.sel === k
              return (
                <button
                  key={k}
                  onClick={() => setTypeFor({ ...typeFor, sel: k })}
                  aria-pressed={on}
                  style={{ minHeight: 52, borderRadius: 12, border: on ? `2px solid ${th.line}` : '1px solid #E5E8EB', background: on ? th.tint : '#FFFFFF', display: 'flex', alignItems: 'center', gap: 14, padding: on ? '4px 16px' : '4px 17px', textAlign: 'left' }}
                >
                  <span style={{ width: 28, flexShrink: 0, fontSize: 17, fontWeight: on ? 800 : 700, color: on ? th.deep : '#191F28' }}>{k}</span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, fontWeight: on ? 700 : 600, color: on ? th.deep : '#191F28' }}>{name}</span>
                    <span style={{ fontSize: 12, color: on ? th.deep : '#4E5968' }}>{desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => {
              patch(typeFor.id, { type: typeFor.sel as SetType })
              setTypeFor(null)
            }}
            style={{ height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700 }}
          >
            저장
          </button>
        </Sheet>
      )}

      {rpeFor && rpeRow && (
        <Sheet onClose={() => setRpeFor(null)} eyebrow={label(rpeRow)} eyebrowColor={th.text} title="얼마나 힘들었나요?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {RPES.map(([v, lab, desc]) => {
              const on = rpeFor.sel === v
              return (
                <button
                  key={lab}
                  onClick={() => setRpeFor({ ...rpeFor, sel: v })}
                  aria-pressed={on}
                  style={{ height: 48, borderRadius: 12, border: on ? `2px solid ${th.line}` : '1px solid #E5E8EB', background: on ? th.tint : '#FFFFFF', display: 'flex', alignItems: 'center', gap: 14, padding: on ? '0 16px' : '0 17px', textAlign: 'left' }}
                >
                  <span className="num" style={{ width: 44, fontSize: 17, fontWeight: on ? 800 : 700, color: on ? th.deep : '#191F28' }}>
                    {lab}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: on ? 600 : 400, color: on ? th.deep : '#4E5968' }}>{desc}</span>
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              disabled={rpeFor.sel === undefined}
              onClick={() => {
                if (rpeFor.sel === undefined) return
                applyTopRpe(rpeRow.id, rpeFor.sel)
                if (!rpeRow.done) timer.restart()
                setRpeFor(null)
              }}
              style={{ height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700, opacity: rpeFor.sel === undefined ? 0.4 : 1 }}
            >
              저장
            </button>
            <button
              onClick={() => {
                if (rpeRow.done) patch(rpeRow.id, { done: false, rpe: undefined })
                setRpeFor(null)
              }}
              style={{ height: 44, fontSize: 15, fontWeight: 600, color: '#4E5968' }}
            >
              {rpeRow.done ? '완료 취소' : '취소'}
            </button>
          </div>
        </Sheet>
      )}

      {gearFor && gearRow && (
        <Sheet onClose={() => setGearFor(null)} eyebrow={label(gearRow)} eyebrowColor={th.text} title="어떤 장비를 썼나요?" gap={18}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {owned.map((g) => {
              const on = gearFor.sel.includes(g)
              return (
                <button
                  key={g}
                  aria-pressed={on}
                  onClick={() => setGearFor({ ...gearFor, sel: on ? gearFor.sel.filter((x) => x !== g) : [...gearFor.sel, g] })}
                  style={{ height: 52, borderRadius: 12, border: on ? `2px solid ${th.line}` : '1px solid #E5E8EB', background: on ? th.tint : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: on ? '0 14px' : '0 15px' }}
                >
                  <span style={{ fontSize: 15, fontWeight: on ? 700 : 400, color: on ? th.deep : '#333D4B' }}>{g}</span>
                  {on && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={th.deep} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 4px', fontSize: 15, color: '#333D4B' }}>
            <input type="checkbox" checked={gearFor.rest} onChange={(e) => setGearFor({ ...gearFor, rest: e.target.checked })} style={{ width: 20, height: 20, accentColor: th.line }} />
            남은 세트에도 똑같이 적용
          </label>
          <p style={{ padding: '0 4px', fontSize: 12, lineHeight: 1.6, color: '#4E5968' }}>장비는 기록에 아이콘으로만 남고, 중량 계산에는 쓰이지 않아요. 장비 목록은 설정 › 장비 설정에서 바꿀 수 있어요.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => {
                const { id, sel, rest } = gearFor
                updateSets((sets) => {
                  const i = sets.findIndex((x) => x.id === id)
                  return sets.map((r, j) => (j === i || (rest && j > i && !r.done) ? { ...r, gear: sel } : r))
                })
                setGearFor(null)
              }}
              style={{ height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700 }}
            >
              저장
            </button>
            <button onClick={() => setGearFor(null)} style={{ height: 44, fontSize: 15, fontWeight: 600, color: '#4E5968' }}>
              취소
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
