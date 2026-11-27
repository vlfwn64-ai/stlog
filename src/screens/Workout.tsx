import { L, setsLabel } from '../i18n'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Rpe, SetType } from '../logic/program'
import { phaseTitle, programOf } from '../logic/programs'
import { addSession, applyTopRpe, finishWorkout, saveSession, setRest, updateSets } from '../actions'
import { REST_STEP, useRestTimer } from '../rest'
import type { SetRow } from '../store'
import type { LiftKey } from '../logic/program'
import { allGear, progOf, step as stepOf, uid, useApp } from '../store'
import { gearName, setTypes, TH, chipColors, fmt, isDark, md, typeName } from '../theme'
import { BeltIcon, Sheet } from '../ui'
import type { Go, Route } from '../App'

const rpes = (): [Rpe, string, string][] => [
  [10, '10', L('더는 못 함', 'Nothing left')],
  [9.5, '9.5', L('1개는 애매, 무게는 조금 더 가능', 'Maybe 1 more, or a bit more weight')],
  [9, '9', L('1개 더 가능', '1 rep left')],
  [8, '8', L('2개 더 가능', '2 reps left')],
  [7, '7', L('3개 더 가능', '3 reps left')],
  [6, '6', L('4개 더 가능', '4+ reps left')],
  ['fail', L('실패', 'Fail'), L('목표 횟수를 못 채움', 'Missed the target reps')],
]

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
const DEFAULT_REST = { base: 90, endAt: null, left: 90 }

export default function Workout({ go, editId, add, back }: { go: Go; editId?: string; add?: { date: string; lift: LiftKey }; back?: Route }) {
  const s = useApp()
  const editing = !!editId || !!add
  // 지난 기록 수정·추가: 고친 내용은 저장 누르기 전까지 여기에만
  const [draft, setDraft] = useState(() => {
    if (add) {
      // 지난 날짜에 기록 추가: 지금 처방으로 채워 두고(한 것으로) 고쳐서 저장
      const p = s.lifts[add.lift]
      const prog = progOf(s)
      const sets: SetRow[] = prog.sets(add.lift, p, stepOf(s)).map((w) => ({ id: uid(), type: w.type, weight: w.weight, reps: w.reps, done: true, gear: [] }))
      return { lift: add.lift, program: prog.id, date: add.date, stage: p.stage, deload: false, sets }
    }
    const x = editId ? s.sessions.find((ss) => ss.id === editId) : undefined
    return x ? { lift: x.lift, program: x.program, date: x.date, stage: x.stage, deload: x.deload, sets: x.sets.map((r) => ({ ...r })) } : null
  })
  const a = editing ? draft : s.active
  const upd = (fn: (sets: SetRow[]) => SetRow[]) => (editing ? setDraft((d) => d && { ...d, sets: fn(d.sets) }) : updateSets(fn))
  const [edit, setEdit] = useState<{ id: string; f: 'w' | 'r' } | null>(null)
  const [typeFor, setTypeFor] = useState<{ id: string; sel: string } | null>(null)
  const [rpeFor, setRpeFor] = useState<{ id: string; sel?: Rpe } | null>(null)
  const [gearFor, setGearFor] = useState<{ id: string; sel: string[]; rest: boolean } | null>(null)
  const [warmOpen, setWarmOpen] = useState(false)
  const timer = useRestTimer(s.active?.rest ?? DEFAULT_REST, setRest, { sound: s.settings.sound !== false })
  useEffect(() => {
    if (!a) go(back ?? { name: 'home' })
  }, [a, go, back])

  if (!a) return null
  const lift = a.lift
  const th = TH[lift]
  const u = s.settings.unit
  const owned = s.settings.gear.length ? s.settings.gear : allGear(s.settings)
  const warm = a.sets.filter((r) => r.type === 'W')
  const warmDone = warm.length > 0 && warm.every((r) => r.done)
  const collapsed = warmDone && !warmOpen && !warm.some((r) => r.id === edit?.id)
  const nextId = a.sets.find((r) => !r.done)?.id
  const sub = a.deload ? `${L('디로드', 'Deload')} · ${md(a.date)}` : `${phaseTitle(programOf(a.program), a.lift, a.stage)} · ${md(a.date)}`

  const patch = (id: string, p: Partial<SetRow>) => upd((sets) => sets.map((r) => (r.id === id ? { ...r, ...p } : r)))
  const needsRpe = (r: SetRow) => !a.deload && !r.noRpe && (r.type === 'T' || r.type === 'B')
  const label = (r: SetRow) => {
    const same = a.sets.filter((x) => x.type === r.type)
    const idx = same.findIndex((x) => x.id === r.id) + 1
    return `${typeName(r.type)}${same.length > 1 ? ` ${idx}` : ''} · ${fmt(r.weight)}${u} × ${r.reps}`
  }

  const tapDone = (r: SetRow) => {
    setEdit(null)
    if (needsRpe(r)) return setRpeFor({ id: r.id, sel: r.rpe })
    patch(r.id, { done: !r.done })
    if (!r.done && !editing) timer.restart()
  }

  const bump = (r: SetRow, f: 'w' | 'r', d: number) => {
    if (f === 'w') patch(r.id, { weight: Math.max(0, +(r.weight + d).toFixed(2)) })
    else patch(r.id, { reps: Math.max(0, r.reps + d) })
  }

  const dark = isDark()
  const rowView = (r: SetRow) => {
    const open = edit?.id === r.id
    // 라이트: 펼친 줄 칸이 흰색 / 다크: 원래 어두운 칸 그대로
    const lit = open && !dark
    const dOpen = open && dark
    const fw = open && edit?.f === 'w'
    const fr = open && edit?.f === 'r'
    const chip = dOpen ? { bg: 'var(--fill2)', fg: r.type === 'W' ? 'var(--sub)' : th.text } : chipColors(r.type, lift)
    const cell = (sel: boolean): CSSProperties => ({
      height: 40,
      width: '100%',
      borderRadius: 10,
      border: `2px solid ${sel ? (dark ? '#fff' : th.strong) : lit ? '#fff' : 'transparent'}`,
      background: lit ? '#fff' : 'var(--fill2)',
      fontSize: 16,
      fontWeight: 700,
      color: lit ? '#191f28' : 'var(--ink)',
    })
    const circle: CSSProperties = { justifySelf: 'center', width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }
    const doneBg = lit ? '#fff' : dOpen ? 'var(--fill2)' : th.acc
    const doneFg = lit ? '#191f28' : dOpen ? th.text : th.on
    let done
    if (r.done && r.rpe !== undefined)
      done = (
        <button onClick={() => tapDone(r)} aria-label={`${L('완료됨', 'Done')}, RPE ${r.rpe}`} style={{ ...circle, background: doneBg, color: doneFg, fontSize: 15, fontWeight: 800 }}>
          {r.rpe === 'fail' ? L('실패', 'F') : r.rpe}
        </button>
      )
    else if (r.done)
      done = (
        <button onClick={() => tapDone(r)} aria-label={L('완료됨', 'Done')} style={{ ...circle, background: doneBg }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={doneFg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
        </button>
      )
    else done = <button onClick={() => tapDone(r)} aria-label={needsRpe(r) ? L('완료하고 RPE 입력', 'Done, enter RPE') : L('완료', 'Done')} style={{ ...circle, border: `2px solid ${lit ? '#fff' : dOpen ? 'var(--line2)' : r.id === nextId ? th.line : 'var(--line2)'}`, background: lit ? '#fff' : dOpen ? 'var(--fill2)' : 'transparent' }} />
    const btnBg = dark ? th.press : th.soft
    const btnFg = dark ? '#fff' : th.strong

    return (
      <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 -6px', padding: open ? '6px 4px 10px' : '0 4px', borderRadius: 16, border: `2px solid ${open ? th.acc : 'transparent'}`, background: open ? th.acc : 'transparent' }}>
        <div className="grid5" style={{ height: 48 }}>
          <button onClick={() => (setEdit(null), setTypeFor({ id: r.id, sel: r.type }))} aria-label={`${L('세트 종류', 'Set type')} ${typeName(r.type)}`} style={{ justifySelf: 'center', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: lit ? '#fff' : chip.bg, color: lit ? '#191f28' : chip.fg, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.type}</span>
          </button>
          <button className="num" onClick={() => setEdit(fw ? null : { id: r.id, f: 'w' })} aria-label={`${L('무게', 'Weight')} ${r.weight}${u}`} style={cell(fw)}>
            {fmt(r.weight)}
          </button>
          <button className="num" onClick={() => setEdit(fr ? null : { id: r.id, f: 'r' })} aria-label={`${L('횟수', 'Reps')} ${r.reps}`} style={cell(fr)}>
            {r.reps}
          </button>
          {done}
          {r.gear.length ? (
            <button onClick={() => setGearFor({ id: r.id, sel: r.gear, rest: true })} aria-label={`${L('장비', 'Gear')}: ${r.gear.map(gearName).join(', ')}`} style={{ justifySelf: 'center', width: 40, height: 40, borderRadius: 10, background: lit ? '#fff' : dOpen ? 'var(--fill2)' : 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BeltIcon color={lit ? '#191f28' : 'var(--ink2)'} />
            </button>
          ) : (
            <button onClick={() => setGearFor({ id: r.id, sel: [], rest: true })} aria-label={L('장비 선택', 'Choose gear')} style={{ justifySelf: 'center', width: 40, height: 40, borderRadius: 10, border: `1.5px dashed ${lit ? '#fff' : 'var(--line2)'}`, background: lit ? '#fff' : dOpen ? 'var(--fill2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: lit ? '#191f28' : 'var(--mute)' }} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>
        {open && edit && (
          <>
            <div style={{ padding: '0 4px 0 6px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) 76px', gridTemplateRows: 'repeat(2, 40px)', gap: 6 }}>
              {[10, 5, 1, -10, -5, -1].map((d) => (
                <button key={d} className="num" onClick={() => bump(r, edit.f, d)} aria-label={`${edit.f === 'w' ? L('무게', 'Weight') : L('횟수', 'Reps')} ${d > 0 ? '+' : '−'}${Math.abs(d)}`} style={{ height: 40, fontSize: 15, fontWeight: 700, borderRadius: 10, background: btnBg, color: btnFg }}>
                  {d > 0 ? `+${d}` : `−${-d}`}
                </button>
              ))}
              <button onClick={() => setEdit(null)} style={{ gridColumn: 4, gridRow: '1 / span 2', fontSize: 15, fontWeight: 800, borderRadius: 10, background: btnBg, color: btnFg }}>
                {L('확인', 'Done')}
              </button>
            </div>
            <div style={{ padding: '0 4px 0 6px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
              <button
                onClick={() => {
                  upd((sets) => sets.filter((x) => x.id !== r.id))
                  setEdit(null)
                }}
                style={{ height: 40, borderRadius: 10, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 14, fontWeight: 700 }}
              >
                {L('세트 삭제', 'Delete set')}
              </button>
              <button
                onClick={() => {
                  const n: SetRow = { ...r, id: uid(), done: false, rpe: undefined }
                  upd((sets) => {
                    const i = sets.findIndex((x) => x.id === r.id)
                    return [...sets.slice(0, i + 1), n, ...sets.slice(i + 1)]
                  })
                  setEdit({ id: n.id, f: 'w' })
                }}
                style={{ height: 40, borderRadius: 10, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 14, fontWeight: 700 }}
              >
                {L('세트 추가', 'Add set')}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  const tBtn: CSSProperties = { width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const rpeRow = rpeFor && a.sets.find((r) => r.id === rpeFor.id)
  const typeRow = typeFor && a.sets.find((r) => r.id === typeFor.id)
  const gearRow = gearFor && a.sets.find((r) => r.id === gearFor.id)

  return (
    <div className="screen">
      <header style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 12px 8px 8px' }}>
        <button aria-label={editing ? L('수정 취소', 'Cancel edit') : L('종목 화면으로', 'Back')} onClick={() => go(editing ? (back ?? { name: 'home' }) : { name: 'lift', lift })} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: th.text }}>{th.title}</h1>
          <span className="num" style={{ fontSize: 13, color: 'var(--sub)' }}>
            {add ? `${L('기록 추가', 'Add')} · ${sub}` : editing ? `${L('기록 수정', 'Edit')} · ${sub}` : sub}
          </span>
        </div>
      </header>

      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 16px 8px' }}>
        <div className="grid5" style={{ fontSize: 12, color: 'var(--mute)', textAlign: 'center', paddingBottom: 2 }}>
          <span>{L('세트', 'Set')}</span>
          <span>
            {L('무게', 'Weight')} ({u})
          </span>
          <span>{L('횟수', 'Reps')}</span>
          <span>{L('완료', 'Done')}</span>
          <span>{L('장비', 'Gear')}</span>
        </div>
        {collapsed && (
          <button onClick={() => setWarmOpen(true)} aria-expanded="false" aria-label={L(`웜업 ${warm.length}세트 완료, 펼치기`, `Warm-up done, expand`)} className="grid5" style={{ width: '100%', height: 48, textAlign: 'left' }}>
            <span style={{ justifySelf: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--fill)', color: 'var(--sub)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>W</span>
            <span style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{L(`웜업 ${warm.length}세트 완료`, `Warm-up · ${setsLabel(warm.length)} done`)}</span>
              <span className="num" style={{ fontSize: 12, color: 'var(--mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          <button onClick={() => setWarmOpen(false)} aria-expanded="true" style={{ width: '100%', height: 40, borderRadius: 10, background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sub)' }}>{L('웜업 접기', 'Collapse warm-up')}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
        )}
        {a.sets.filter((r) => !(collapsed && r.type === 'W')).map(rowView)}
        {a.sets.length === 0 && (
          <button onClick={() => upd(() => [{ id: uid(), type: 'B', weight: s.lifts[lift].backoff, reps: 5, done: false, gear: [] }])} style={{ height: 48, borderRadius: 12, border: '1.5px dashed var(--line2)', fontSize: 15, fontWeight: 600, color: 'var(--sub)' }}>
            {L('세트 추가', 'Add set')}
          </button>
        )}
      </main>

      {editing ? (
        <div style={{ padding: '10px 20px var(--safe-bot)' }}>
          <button
            onClick={() => {
              if (editId && draft) saveSession(editId, draft.sets)
              if (add && draft) addSession(draft)
              go(back ?? { name: 'home' })
            }}
            style={{ width: '100%', height: 56, borderRadius: 14, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 17, fontWeight: 700 }}
          >
            {L('저장', 'Save')}
          </button>
        </div>
      ) : (
      <div style={{ padding: '10px 20px var(--safe-bot)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <section aria-label={L('쉬는 시간 타이머', 'Rest timer')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: timer.flash ? th.tint : 'var(--fill2)', boxShadow: timer.flash ? `inset 0 0 0 2px ${th.line}` : undefined, borderRadius: 16, padding: '10px 10px 10px 16px', transition: 'background 200ms ease', animation: timer.flash ? 'pulse 0.4s ease 4' : undefined }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span role="timer" className="num" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: 'var(--ink)' }}>
                {mmss(timer.remain)}
              </span>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--line)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round((timer.remain / Math.max(timer.base, 1)) * 100)}%`, background: th.acc, transition: timer.running ? 'width 250ms linear' : 'none' }} />
              </div>
            </div>
            <button onClick={timer.minus} aria-label={L(`${REST_STEP}초 줄이기`, `−${REST_STEP}s`)} style={tBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 12h14" />
              </svg>
            </button>
            <button onClick={timer.plus} aria-label={L(`${REST_STEP}초 늘리기`, `+${REST_STEP}s`)} style={tBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button onClick={timer.toggle} aria-label={timer.running ? L('일시정지', 'Pause') : L('다시 시작', 'Start')} style={tBtn}>
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
            <button onClick={timer.reset} aria-label={L('타이머 초기화', 'Reset timer')} style={tBtn}>
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
            style={{ height: 56, borderRadius: 14, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 17, fontWeight: 700 }}
          >
            {L('기록 완료', 'Finish workout')}
          </button>
        </div>
      )}

      {typeFor && typeRow && (
        <Sheet onClose={() => setTypeFor(null)} eyebrow={`${L(`${a.sets.indexOf(typeRow) + 1}번째 세트`, `Set ${a.sets.indexOf(typeRow) + 1}`)} · ${fmt(typeRow.weight)}${u} × ${typeRow.reps}`} eyebrowColor={th.text} title={L('어떤 세트인가요?', 'What kind of set?')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {setTypes().map(([k, name, desc]) => {
              const on = typeFor.sel === k
              return (
                <button
                  key={k}
                  onClick={() => setTypeFor({ ...typeFor, sel: k })}
                  aria-pressed={on}
                  style={{ minHeight: 52, borderRadius: 12, border: on ? `2px solid ${th.line}` : '1px solid var(--line)', background: on ? th.tint : 'var(--surface)', display: 'flex', alignItems: 'center', gap: 14, padding: on ? '4px 16px' : '4px 17px', textAlign: 'left' }}
                >
                  <span style={{ width: 28, flexShrink: 0, fontSize: 17, fontWeight: on ? 800 : 700, color: on ? th.deep : 'var(--ink)' }}>{k}</span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, fontWeight: on ? 700 : 600, color: on ? th.deep : 'var(--ink)' }}>{name}</span>
                    <span style={{ fontSize: 12, color: on ? th.deep : 'var(--sub)' }}>{desc}</span>
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
            {L('저장', 'Save')}
          </button>
        </Sheet>
      )}

      {rpeFor && rpeRow && (
        <Sheet onClose={() => setRpeFor(null)} eyebrow={label(rpeRow)} eyebrowColor={th.text} title={L('얼마나 힘들었나요?', 'How hard was it?')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rpes().map(([v, lab, desc]) => {
              const on = rpeFor.sel === v
              return (
                <button
                  key={lab}
                  onClick={() => setRpeFor({ ...rpeFor, sel: v })}
                  aria-pressed={on}
                  style={{ height: 48, borderRadius: 12, border: on ? `2px solid ${th.line}` : '1px solid var(--line)', background: on ? th.tint : 'var(--surface)', display: 'flex', alignItems: 'center', gap: 14, padding: on ? '0 16px' : '0 17px', textAlign: 'left' }}
                >
                  <span className="num" style={{ width: 44, fontSize: 17, fontWeight: on ? 800 : 700, color: on ? th.deep : 'var(--ink)' }}>
                    {lab}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: on ? 600 : 400, color: on ? th.deep : 'var(--sub)' }}>{desc}</span>
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              disabled={rpeFor.sel === undefined}
              onClick={() => {
                if (rpeFor.sel === undefined) return
                if (editing) patch(rpeRow.id, { rpe: rpeFor.sel, done: true })
                else {
                  applyTopRpe(rpeRow.id, rpeFor.sel)
                  if (!rpeRow.done) timer.restart()
                }
                setRpeFor(null)
              }}
              style={{ height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700, opacity: rpeFor.sel === undefined ? 0.4 : 1 }}
            >
              {L('저장', 'Save')}
            </button>
            <button
              onClick={() => {
                if (rpeRow.done) patch(rpeRow.id, { done: false, rpe: undefined })
                setRpeFor(null)
              }}
              style={{ height: 44, fontSize: 15, fontWeight: 600, color: 'var(--sub)' }}
            >
              {rpeRow.done ? L('완료 취소', 'Undo done') : L('취소', 'Cancel')}
            </button>
          </div>
        </Sheet>
      )}

      {gearFor && gearRow && (
        <Sheet onClose={() => setGearFor(null)} eyebrow={label(gearRow)} eyebrowColor={th.text} title={L('어떤 장비를 썼나요?', 'What did you wear?')} gap={18}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {owned.map((g) => {
              const on = gearFor.sel.includes(g)
              return (
                <button
                  key={g}
                  aria-pressed={on}
                  onClick={() => setGearFor({ ...gearFor, sel: on ? gearFor.sel.filter((x) => x !== g) : [...gearFor.sel, g] })}
                  style={{ height: 52, borderRadius: 12, border: on ? `2px solid ${th.line}` : '1px solid var(--line)', background: on ? th.tint : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: on ? '0 14px' : '0 15px' }}
                >
                  <span style={{ fontSize: 15, fontWeight: on ? 700 : 400, color: on ? th.deep : 'var(--ink2)' }}>{gearName(g)}</span>
                  {on && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={th.deep} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 4px', fontSize: 15, color: 'var(--ink2)' }}>
            <input type="checkbox" checked={gearFor.rest} onChange={(e) => setGearFor({ ...gearFor, rest: e.target.checked })} style={{ width: 20, height: 20, accentColor: th.line }} />
            {L('남은 세트에도 똑같이 적용', 'Apply to the remaining sets')}
          </label>
          <p style={{ padding: '0 4px', fontSize: 12, lineHeight: 1.6, color: 'var(--sub)' }}>{L('장비는 기록에 아이콘으로만 남고, 중량 계산에는 쓰이지 않아요. 장비 목록은 설정 › 장비 설정에서 바꿀 수 있어요.', 'Gear is only noted on your log and never changes the weights. Edit your gear list in Settings › Gear.')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => {
                const { id, sel, rest } = gearFor
                upd((sets) => {
                  const i = sets.findIndex((x) => x.id === id)
                  return sets.map((r, j) => (j === i || (rest && j > i && !r.done) ? { ...r, gear: sel } : r))
                })
                setGearFor(null)
              }}
              style={{ height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700 }}
            >
              {L('저장', 'Save')}
            </button>
            <button onClick={() => setGearFor(null)} style={{ height: 44, fontSize: 15, fontWeight: 600, color: 'var(--sub)' }}>
              {L('취소', 'Cancel')}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
