import { L, setsLabel } from '../i18n'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Rpe, SetType } from '../logic/program'
import { phaseTitle, programOf } from '../logic/programs'
import { addSession, applyTopRpe, finishWorkout, saveSession, setRest, updateSets } from '../actions'
import { REST_STEP, useRestTimer } from '../rest'
import type { SetRow } from '../store'
import type { LiftKey } from '../logic/program'
import { allGear, progOf, step as stepOf, uid, useApp } from '../store'
import { chipText, gearName, setTypes, TH, chipColors, fmt, isDark, md, typeName } from '../theme'
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
  const [edit, setEditRaw] = useState<{ id: string; f: 'w' | 'r' } | null>(null)
  /** 키패드로 치는 중인 글자. null이면 아직 안 친 상태(처음 누르는 숫자가 원래 값을 바꾼다) */
  const [buf, setBuf] = useState<string | null>(null)
  const setEdit = (e: { id: string; f: 'w' | 'r' } | null) => {
    setEditRaw(e)
    setBuf(null)
  }
  const mainRef = useRef<HTMLElement>(null)
  // 키패드가 열리면 고르는 줄이 가려지지 않게
  useEffect(() => {
    if (!edit) return
    const el = mainRef.current?.querySelector(`[data-row="${edit.id}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [edit])
  const [typeFor, setTypeFor] = useState<{ id: string; sel: string } | null>(null)
  const [rpeFor, setRpeFor] = useState<{ id: string; sel?: Rpe; got?: number } | null>(null)
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
    if (needsRpe(r)) return setRpeFor({ id: r.id, sel: r.rpe, got: r.got })
    patch(r.id, { done: !r.done })
    if (!r.done && !editing) timer.restart()
  }

  /** 키패드 한 번 누름 */
  const press = (k: string) => {
    if (!edit) return
    const r = a.sets.find((x) => x.id === edit.id)
    if (!r) return
    if (k === '.' && (edit.f === 'r' || (buf ?? '').includes('.'))) return
    let b = k === 'back' ? (buf === null ? '' : buf.slice(0, -1)) : buf === null ? (k === '.' ? '0.' : k) : buf + k
    if (/^0\d/.test(b)) b = b.slice(1)
    if (b.length > 6 || /\.\d{3}$/.test(b)) return
    setBuf(b)
    const v = parseFloat(b)
    patch(r.id, edit.f === 'w' ? { weight: isNaN(v) ? 0 : v } : { reps: isNaN(v) ? 0 : Math.round(v) })
  }
  /** 무게 → 횟수 → 다음 세트 무게 */
  const kpNext = () => {
    if (!edit) return
    if (edit.f === 'w') return setEdit({ id: edit.id, f: 'r' })
    const vis = a.sets.filter((r) => !(collapsed && r.type === 'W'))
    const i = vis.findIndex((r) => r.id === edit.id)
    setEdit(i >= 0 && i < vis.length - 1 ? { id: vis[i + 1].id, f: 'w' } : null)
  }
  const delSet = (id: string) => {
    upd((sets) => sets.filter((x) => x.id !== id))
    setEdit(null)
  }
  const addSetAfter = (r: SetRow) => {
    const n: SetRow = { ...r, id: uid(), done: false, rpe: undefined, got: undefined }
    upd((sets) => {
      const i = sets.findIndex((x) => x.id === r.id)
      return [...sets.slice(0, i + 1), n, ...sets.slice(i + 1)]
    })
    return n
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
    /** 고른 칸: 치기 전엔 값에 옅은 색(통째로 바뀜), 치는 중엔 커서 */
    const typed = (sel: boolean, v: string) =>
      !sel ? (
        v
      ) : buf === null ? (
        <span style={{ padding: '1px 3px', borderRadius: 4, background: dark ? th.press : th.tint }}>{v}</span>
      ) : (
        <>
          {buf}
          <span className="caret" style={{ background: th.acc }} />
        </>
      )

    return (
      <div key={r.id} data-row={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 -6px', padding: open ? '6px 4px 10px' : '0 4px', borderRadius: 16, border: `2px solid ${open ? th.acc : 'transparent'}`, background: open ? th.acc : 'transparent' }}>
        <div className="grid5" style={{ height: 48 }}>
          <button onClick={() => (setEdit(null), setTypeFor({ id: r.id, sel: r.type }))} aria-label={`${L('세트 종류', 'Set type')} ${typeName(r.type)}`} style={{ justifySelf: 'center', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: lit ? '#fff' : chip.bg, color: lit ? '#191f28' : chip.fg, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{chipText(r, a.sets)}</span>
          </button>
          <button className="num" onClick={() => setEdit({ id: r.id, f: 'w' })} aria-label={`${L('무게', 'Weight')} ${r.weight}${u}`} style={cell(fw)}>
            {typed(fw, fmt(r.weight))}
          </button>
          <button className="num" onClick={() => setEdit({ id: r.id, f: 'r' })} aria-label={r.rpe === 'fail' && r.got !== undefined ? L(`횟수 ${r.reps}개 중 ${r.got}개`, `${r.got} of ${r.reps} reps`) : `${L('횟수', 'Reps')} ${r.reps}`} style={cell(fr)}>
            {fr ? (
              typed(true, String(r.reps))
            ) : r.rpe === 'fail' && r.got !== undefined ? (
              <>
                {r.got}
                <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.6 }}>/{r.reps}</span>
              </>
            ) : (
              r.reps
            )}
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
          <div style={{ padding: '0 4px 0 6px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
            <button onClick={() => delSet(r.id)} style={{ height: 40, borderRadius: 10, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 14, fontWeight: 700 }}>
              {L('세트 삭제', 'Delete set')}
            </button>
            <button onClick={() => setEdit({ id: addSetAfter(r).id, f: 'w' })} style={{ height: 40, borderRadius: 10, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 14, fontWeight: 700 }}>
              {L('세트 추가', 'Add set')}
            </button>
          </div>
        )}
      </div>
    )
  }

  const footBtn: CSSProperties = { height: 44, borderRadius: 12, border: '1.5px solid var(--line)', background: 'var(--surface)', fontSize: 14, fontWeight: 700, color: 'var(--sub)' }
  const tBtn: CSSProperties = { width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  /** 쉬는 시간 카드 (키패드가 열리면 키패드 위에 떠 있다) */
  const timerCard = (float: boolean) => (
    <section aria-label={L('쉬는 시간 타이머', 'Rest timer')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: timer.flash ? th.tint : float ? 'var(--surface)' : 'var(--fill2)', ...(float ? { margin: '0 12px 10px', border: '1px solid var(--line)', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' } : {}), boxShadow: timer.flash ? `inset 0 0 0 2px ${th.line}` : undefined, borderRadius: 16, padding: '10px 10px 10px 16px', transition: 'background 200ms ease', animation: timer.flash ? 'pulse 0.4s ease 4' : undefined }}>
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
  )
  const editRow = edit ? a.sets.find((r) => r.id === edit.id) : undefined
  const vis = a.sets.filter((r) => !(collapsed && r.type === 'W'))
  const lastRow = vis[vis.length - 1]
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']
  const keypad = editRow && edit && (
    <div style={{ flexShrink: 0, animation: 'kpUp 220ms cubic-bezier(0.2,0.8,0.2,1) both' }}>
      {!editing && timerCard(true)}
      <section aria-label={L('숫자 키패드', 'Number pad')} style={{ background: 'var(--fill)', borderRadius: '20px 20px 0 0', padding: '10px 10px var(--safe-bot)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 4px 0 10px' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: th.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {typeName(editRow.type)} · {edit.f === 'w' ? `${L('무게', 'Weight')} (${u})` : L('횟수', 'Reps')}
          </span>
          <button onClick={kpNext} style={{ height: 36, padding: '0 14px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, fontWeight: 700 }}>
            {edit.f === 'w' ? L('횟수 ›', 'Reps ›') : L('다음 세트 ›', 'Next set ›')}
          </button>
          <button onClick={() => setEdit(null)} aria-label={L('입력 완료', 'Done typing')} style={{ height: 36, padding: '0 16px', borderRadius: 10, background: th.acc, color: th.on, fontSize: 14, fontWeight: 800 }}>
            {L('완료', 'Done')}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          {KEYS.map((k) => {
            if (k === 'back')
              return (
                <button key={k} className="kp-key" onClick={() => press('back')} aria-label={L('지우기', 'Delete')} style={{ height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
                    <path d="M17 9.5l-5 5M12 9.5l5 5" />
                  </svg>
                </button>
              )
            const off = k === '.' && (edit.f === 'r' || (buf ?? '').includes('.'))
            return (
              <button key={k} className="kp-key num" onClick={() => press(k)} aria-label={k === '.' ? L('소수점', 'Decimal point') : k} aria-disabled={off} style={{ height: 52, borderRadius: 12, background: 'var(--surface)', boxShadow: '0 1px 0 rgba(0,0,0,0.06)', fontSize: 24, fontWeight: 600, color: off ? 'var(--line2)' : 'var(--ink)' }}>
                {k}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )

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

      <main ref={mainRef} className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 16px 8px' }}>
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
        {vis.map(rowView)}
        {a.sets.length === 0 ? (
          <button onClick={() => upd(() => [{ id: uid(), type: 'B', weight: s.lifts[lift].backoff, reps: 5, done: false, gear: [] }])} style={footBtn}>
            {L('+ 세트 추가', '+ Add set')}
          </button>
        ) : (
          lastRow &&
          edit?.id !== lastRow.id && (
            // 마지막 세트 아래: 마지막 세트 지우기 / 마지막 세트 복사해서 추가
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, padding: '4px 0 8px' }}>
              <button onClick={() => delSet(lastRow.id)} style={footBtn}>
                {L('세트 삭제', 'Delete set')}
              </button>
              <button onClick={() => addSetAfter(lastRow)} style={footBtn}>
                {L('+ 세트 추가', '+ Add set')}
              </button>
            </div>
          )
        )}
      </main>

      {keypad ? (
        keypad
      ) : editing ? (
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
          {timerCard(false)}
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
                  <span style={{ width: 28, flexShrink: 0, fontSize: 17, fontWeight: on ? 800 : 700, color: on ? th.deep : 'var(--ink)' }}>{k === 'N' ? '1' : k}</span>
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
                  onClick={() => setRpeFor({ ...rpeFor, sel: v, got: v === 'fail' ? rpeFor.got : undefined })}
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
          {rpeFor.sel === 'fail' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{L(`${rpeRow.reps}개 중 몇 개 들었나요?`, `How many of ${rpeRow.reps} reps?`)}</span>
              <div role="group" aria-label={L('든 개수', 'Reps done')} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
                {Array.from({ length: Math.min(Math.max(rpeRow.reps, 1), 24) }, (_, n) => {
                  const on = rpeFor.got === n
                  return (
                    <button key={n} className="num" aria-pressed={on} onClick={() => setRpeFor({ ...rpeFor, got: n })} style={{ height: 44, borderRadius: 10, border: on ? `2px solid ${th.line}` : '1px solid var(--line)', background: on ? th.tint : 'var(--surface)', fontSize: 16, fontWeight: on ? 800 : 600, color: on ? th.deep : 'var(--ink)' }}>
                      {n}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              disabled={rpeFor.sel === undefined || (rpeFor.sel === 'fail' && rpeFor.got === undefined)}
              onClick={() => {
                if (rpeFor.sel === undefined || (rpeFor.sel === 'fail' && rpeFor.got === undefined)) return
                const got = rpeFor.sel === 'fail' ? rpeFor.got : undefined
                if (editing) patch(rpeRow.id, { rpe: rpeFor.sel, got, done: true })
                else {
                  applyTopRpe(rpeRow.id, rpeFor.sel, got)
                  if (!rpeRow.done) timer.restart()
                }
                setRpeFor(null)
              }}
              style={{ height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700, opacity: rpeFor.sel === undefined || (rpeFor.sel === 'fail' && rpeFor.got === undefined) ? 0.4 : 1 }}
            >
              {L('저장', 'Save')}
            </button>
            <button
              onClick={() => {
                if (rpeRow.done) patch(rpeRow.id, { done: false, rpe: undefined, got: undefined })
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
