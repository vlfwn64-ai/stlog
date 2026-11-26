import { useEffect, useState } from 'react'
import type { Rpe, SetType } from '../logic/program'
import { applyTopRpe, cancelWorkout, finishWorkout, updateSets } from '../actions'
import type { SetRow } from '../store'
import { GEAR, uid, useApp } from '../store'
import { SET_TYPES, TH, fmt, typeName } from '../theme'
import { Confirm, Header, I, Icon, Sheet, themeVars } from '../ui'
import type { Go } from '../App'

const RPES: [Rpe, string, string][] = [
  [10, '10', '더는 못 해요'],
  [9.5, '9.5', '무게를 더 올리긴 어려워요'],
  [9, '9', '1회 더 할 수 있어요'],
  [8, '8', '2회 더 할 수 있어요'],
  [7, '7', '3회 더 할 수 있어요'],
  [6, '6', '4회 이상 더 할 수 있어요'],
  ['fail', '실패', '목표 횟수를 못 채웠어요'],
]

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`

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
    // 멈춘 상태: 총시간 변경 / 도는 중: 남은 시간만 변경
    minus: () => {
      if (running) setRemain((r) => Math.max(0, r - 15))
      else {
        const b = Math.max(15, base - 15)
        setBase(b)
        setRemain(b)
      }
    },
    plus: () => {
      if (running) {
        setRemain((r) => r + 15)
        setBase((b) => Math.max(b, remain + 15))
      } else {
        setBase(base + 15)
        setRemain(base + 15)
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
  const [typeFor, setTypeFor] = useState<{ id: string; sel: SetType } | null>(null)
  const [rpeFor, setRpeFor] = useState<string | null>(null)
  const [gearFor, setGearFor] = useState<{ id: string; sel: string[] } | null>(null)
  const [warmOpen, setWarmOpen] = useState(false)
  const [quit, setQuit] = useState(false)
  const timer = useRestTimer()

  if (!a) {
    return (
      <div className="screen">
        <Header onBack={() => go({ name: 'home' })} title="기록 없음" />
      </div>
    )
  }
  const th = TH[a.lift]
  const u = s.settings.unit
  const gearList = s.settings.gear.length ? s.settings.gear : GEAR
  const warm = a.sets.filter((r) => r.type === 'W')
  const warmDone = warm.length > 0 && warm.every((r) => r.done)
  const collapsed = warmDone && !warmOpen && !warm.some((r) => r.id === edit?.id)

  const patch = (id: string, p: Partial<SetRow>) => updateSets((sets) => sets.map((r) => (r.id === id ? { ...r, ...p } : r)))
  const needsRpe = (r: SetRow) => !a.deload && (r.type === 'T' || r.type === 'B')

  const tapDone = (r: SetRow) => {
    setEdit(null)
    if (needsRpe(r)) return setRpeFor(r.id)
    patch(r.id, { done: !r.done })
    if (!r.done) timer.restart()
  }

  const bump = (d: number) => {
    if (!edit) return
    const r = a.sets.find((x) => x.id === edit.id)
    if (!r) return
    if (edit.f === 'w') patch(r.id, { weight: Math.max(0, +(r.weight + d).toFixed(2)) })
    else patch(r.id, { reps: Math.max(0, r.reps + d) })
  }

  const rowView = (r: SetRow) => {
    const open = edit?.id === r.id
    const isT = r.type === 'T' || r.type === 'B'
    const chipBg = open ? '#fff' : isT ? th.tint : 'var(--fill)'
    const chipFg = open ? 'var(--ink)' : isT ? th.deep : 'var(--sub)'
    const cellStyle = (sel: boolean) => ({
      background: open ? '#fff' : 'var(--fill)',
      borderColor: open && sel ? th.deep : 'transparent',
    })
    return (
      <div
        key={r.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          margin: '0 -6px',
          padding: open ? '6px 6px 12px' : '0 6px',
          borderRadius: 16,
          background: open ? th.acc : 'transparent',
        }}
      >
        <div className="grid5" style={{ height: 48 }}>
          <button onClick={() => setTypeFor({ id: r.id, sel: r.type })} aria-label={`세트 종류 ${typeName(r.type)}, 바꾸기`} style={{ justifySelf: 'center', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="chip" style={{ background: chipBg, color: chipFg }}>
              {r.type}
            </span>
          </button>
          <button className="cell num" style={cellStyle(edit?.f === 'w')} onClick={() => setEdit(open && edit?.f === 'w' ? null : { id: r.id, f: 'w' })} aria-label={`무게 ${r.weight}${u}`}>
            {fmt(r.weight)}
          </button>
          <button className="cell num" style={cellStyle(edit?.f === 'r')} onClick={() => setEdit(open && edit?.f === 'r' ? null : { id: r.id, f: 'r' })} aria-label={`횟수 ${r.reps}회`}>
            {r.reps}
          </button>
          <button
            className="check"
            onClick={() => tapDone(r)}
            aria-label={r.done ? '완료됨' : '완료하기'}
            style={{
              background: r.done ? (open ? '#fff' : th.acc) : open ? '#fff' : 'transparent',
              color: r.done ? (open ? th.deep : th.on) : 'var(--mute)',
              boxShadow: r.done ? undefined : 'inset 0 0 0 2px #D1D6DB',
            }}
          >
            {r.done && r.rpe !== undefined ? (r.rpe === 'fail' ? '✕' : r.rpe) : r.done ? <Icon d={I.check} size={18} w={3} /> : null}
          </button>
          <button className="check" onClick={() => setGearFor({ id: r.id, sel: r.gear })} aria-label={`장비 ${r.gear.join(', ') || '없음'}`} style={{ position: 'relative', color: open ? th.on : r.gear.length ? th.text : '#B0B8C1' }}>
            <Icon d={I.gear} size={20} />
            {r.gear.length > 0 && (
              <span style={{ position: 'absolute', right: 2, top: 2, minWidth: 16, height: 16, borderRadius: 8, fontSize: 10, fontWeight: 800, background: open ? '#fff' : th.acc, color: open ? th.deep : th.on, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {r.gear.length}
              </span>
            )}
          </button>
        </div>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {[10, 5, 1, -10, -5, -1].map((d) => (
                  <button key={d} onClick={() => bump(d)} className="num" style={{ height: 40, borderRadius: 10, background: th.tint, color: th.deep, fontSize: 16, fontWeight: 800 }}>
                    {d > 0 ? `+${d}` : `−${-d}`}
                  </button>
                ))}
              </div>
              <button onClick={() => setEdit(null)} style={{ width: 64, borderRadius: 10, background: '#fff', color: th.deep, fontSize: 15, fontWeight: 800 }}>
                확인
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-black btn-sm"
                style={{ flex: 1, height: 40 }}
                onClick={() => {
                  updateSets((sets) => sets.filter((x) => x.id !== r.id))
                  setEdit(null)
                }}
              >
                세트 삭제
              </button>
              <button
                className="btn btn-black btn-sm"
                style={{ flex: 1, height: 40 }}
                onClick={() => {
                  const n: SetRow = { ...r, id: uid(), done: false, rpe: undefined }
                  updateSets((sets) => {
                    const i = sets.findIndex((x) => x.id === r.id)
                    return [...sets.slice(0, i + 1), n, ...sets.slice(i + 1)]
                  })
                  setEdit({ id: n.id, f: edit?.f ?? 'w' })
                }}
              >
                세트 추가
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const rpeRow = a.sets.find((r) => r.id === rpeFor)
  const stageLabel = a.deload ? '디로드' : `${a.stage}단계`

  return (
    <div className="screen" style={themeVars(a.lift)}>
      <Header
        onBack={() => go({ name: 'lift', lift: a.lift })}
        title={th.name}
        sub={stageLabel}
        color={th.text}
        right={
          <button onClick={() => setQuit(true)} style={{ height: 36, padding: '0 12px', fontSize: 14, fontWeight: 700, color: 'var(--sub)' }}>
            그만하기
          </button>
        }
      />
      <div className="scroll pad" style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4, paddingBottom: 12 }}>
        <div className="grid5" style={{ fontSize: 12, color: 'var(--mute)', textAlign: 'center' }}>
          <span>세트</span>
          <span>무게 ({u})</span>
          <span>횟수</span>
          <span>완료</span>
          <span>장비</span>
        </div>
        {collapsed ? (
          <button onClick={() => setWarmOpen(true)} className="grid5" style={{ height: 48, textAlign: 'left' }} aria-expanded="false">
            <span className="chip" style={{ justifySelf: 'center', background: 'var(--fill)', color: 'var(--sub)' }}>
              W
            </span>
            <span style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>웜업 {warm.length}세트 완료</span>
              <span className="num" style={{ fontSize: 12, color: 'var(--mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {warm.map((r) => fmt(r.weight)).join(' · ')}
              </span>
            </span>
            <span className="check" style={{ background: th.acc, color: th.on }}>
              <Icon d={I.check} size={18} w={3} />
            </span>
            <span className="check" style={{ color: 'var(--sub)' }}>
              <Icon d={I.down} size={18} />
            </span>
          </button>
        ) : (
          warmDone && (
            <button onClick={() => setWarmOpen(false)} style={{ height: 40, borderRadius: 10, background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--sub)' }} aria-expanded="true">
              웜업 접기 <Icon d={I.up} size={16} />
            </button>
          )
        )}
        {a.sets.filter((r) => !(collapsed && r.type === 'W')).map(rowView)}
        {a.sets.length === 0 && (
          <button
            className="btn btn-tint"
            onClick={() => updateSets(() => [{ id: uid(), type: 'B', weight: s.lifts[a.lift].backoff, reps: 5, done: false, gear: [] }])}
          >
            세트 추가
          </button>
        )}
      </div>

      <div style={{ padding: '10px 20px 0', borderTop: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="num" style={{ fontSize: 26, fontWeight: 800, color: timer.running ? th.text : 'var(--ink)' }}>
              {mmss(timer.remain)}
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--fill)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${timer.base ? (timer.remain / timer.base) * 100 : 0}%`, background: th.acc, transition: 'width 1s linear' }} />
            </div>
          </div>
          {[
            ['−15초', timer.minus, '−15'],
            ['+15초', timer.plus, '+15'],
          ].map(([label, fn, txt]) => (
            <button key={label as string} onClick={fn as () => void} aria-label={label as string} className="num" style={{ width: 48, height: 44, borderRadius: 12, background: th.tint, color: th.deep, fontWeight: 800, fontSize: 14 }}>
              {txt as string}
            </button>
          ))}
          <button onClick={timer.toggle} aria-label={timer.running ? '일시정지' : '시작'} style={{ width: 44, height: 44, borderRadius: 12, background: th.acc, color: th.on, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={timer.running ? I.pause : I.play} size={20} w={2.5} />
          </button>
          <button onClick={timer.reset} aria-label="초기화" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={I.reset} size={20} />
          </button>
        </div>
      </div>
      <div className="bottom">
        <button
          className="btn btn-acc"
          onClick={() => {
            const id = finishWorkout()
            if (id) go({ name: 'result', id })
          }}
        >
          기록 완료
        </button>
      </div>

      {typeFor && (
        <Sheet onClose={() => setTypeFor(null)} eyebrow={th.name} title="세트 종류">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {SET_TYPES.map(([k, name]) => {
              const on = typeFor.sel === k
              return (
                <button key={k} onClick={() => setTypeFor({ ...typeFor, sel: k })} aria-pressed={on} style={{ height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', background: on ? th.acc : 'var(--fill2)', color: on ? th.on : 'var(--ink)' }}>
                  <span className="chip" style={{ background: on ? '#fff' : 'var(--fill)', color: on ? th.deep : 'var(--sub)' }}>
                    {k}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{name}</span>
                </button>
              )
            })}
          </div>
          <button
            className="btn btn-acc"
            onClick={() => {
              patch(typeFor.id, { type: typeFor.sel })
              setTypeFor(null)
            }}
          >
            저장
          </button>
        </Sheet>
      )}

      {rpeRow && (
        <Sheet onClose={() => setRpeFor(null)} eyebrow={`${typeName(rpeRow.type)} · ${fmt(rpeRow.weight)}${u} × ${rpeRow.reps}`} title="얼마나 힘들었나요?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {RPES.map(([v, label, desc]) => {
              const on = rpeRow.rpe === v
              return (
                <button
                  key={label}
                  onClick={() => {
                    applyTopRpe(rpeRow.id, v)
                    setRpeFor(null)
                    if (!rpeRow.done) timer.restart()
                  }}
                  style={{ height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', background: on ? th.acc : 'var(--fill2)', color: on ? th.on : 'var(--ink)', textAlign: 'left' }}
                >
                  <b className="num" style={{ width: 40, fontSize: 18 }}>
                    {label}
                  </b>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{desc}</span>
                </button>
              )
            })}
            {rpeRow.done && (
              <button
                className="btn btn-gray btn-sm"
                style={{ marginTop: 6 }}
                onClick={() => {
                  patch(rpeRow.id, { done: false, rpe: undefined })
                  setRpeFor(null)
                }}
              >
                완료 취소
              </button>
            )}
          </div>
        </Sheet>
      )}

      {gearFor && (
        <Sheet onClose={() => setGearFor(null)} eyebrow={th.name} title="사용한 장비">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {gearList.map((g) => {
              const on = gearFor.sel.includes(g)
              return (
                <button
                  key={g}
                  aria-pressed={on}
                  onClick={() => setGearFor({ ...gearFor, sel: on ? gearFor.sel.filter((x) => x !== g) : [...gearFor.sel, g] })}
                  style={{ height: 44, padding: '0 16px', borderRadius: 22, fontSize: 15, fontWeight: 700, background: on ? th.acc : 'var(--fill)', color: on ? th.on : 'var(--ink2)' }}
                >
                  {g}
                </button>
              )
            })}
          </div>
          <button
            className="btn btn-acc"
            onClick={() => {
              const sel = gearFor.sel
              patch(gearFor.id, { gear: sel })
              setGearFor(null)
            }}
          >
            저장
          </button>
        </Sheet>
      )}

      {quit && (
        <Confirm
          eyebrow={th.name}
          title="기록을 그만할까요?"
          rows={[['완료한 세트', `${a.sets.filter((r) => r.done).length}세트`]]}
          cta="기록 버리기"
          onCancel={() => setQuit(false)}
          onOk={() => {
            const lift = a.lift
            cancelWorkout()
            go({ name: 'lift', lift })
          }}
        />
      )}
    </div>
  )
}
