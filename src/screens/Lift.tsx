import { L, attemptLabel, setsLabel } from '../i18n'
import { useRef, useState } from 'react'
import type { LiftKey } from '../logic/program'
import { deloadSets, firstAttempt, warmups } from '../logic/program'
import type { Program } from '../logic/programs'
import { atTest, groupSets, levelName, mainSet, phaseTitle, programOf, repsText } from '../logic/programs'
import { cancelWorkout, goNextStage, previewNextStage, startWorkout } from '../actions'
import type { AppState, SessionLog } from '../store'
import { progOf, step as stepOf, useApp } from '../store'
import { CARD_ORDER, ETC_TH, TH, fmt, md, rpeText } from '../theme'
import { Confirm, LiftChart, PillToggle, RangeTabs, Sheet, SummaryRows, ts } from '../ui'
import type { Range } from '../ui'
import type { Go } from '../App'
import { latestEst, liftPoints } from './Home'
import DaySheet from './DaySheet'

type Pop = null | 'deload' | 'next' | 'test' | 'prev' | 'start' | 'startDeload' | 'discard'

/** 세션 대표 세트 (완료한 본 세트 중 가장 무거운 것) */
const mainOf = (x: SessionLog) =>
  x.sets.filter((r) => r.type !== 'W' && r.done).reduce<SessionLog['sets'][number] | undefined>((m, r) => (!m || r.weight > m.weight ? r : m), undefined)
/** 이전 사이클 글자: 암렙이면 "90×9" */
const mainText = (x: SessionLog) => {
  const m = mainOf(x)
  return m ? `${fmt(m.weight)}${m.type === 'A' ? `×${m.reps}` : ''}` : ''
}

type Box = { w: string; d: string; id: string; deload?: boolean }

/** 이번 사이클 줄별 기록 (디로드한 날도 그 줄에 날짜순으로) */
function cycleRows(s: AppState, lift: LiftKey, prog: Program) {
  const p = s.lifts[lift]
  const cyc = s.sessions.filter((x) => x.lift === lift && !x.free && (x.cycle ?? 1) === (p.cycle ?? 1)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return prog.phases(lift).map((ph) => ({
    ...ph,
    boxes: cyc
      .filter((x) => x.stage === ph.n)
      .flatMap((x): Box[] => {
        const m = mainOf(x)
        return m ? [{ w: fmt(m.weight), d: md(x.date), id: x.id, deload: x.deload }] : []
      }),
  }))
}

/** 끝난 사이클 (테스트로 끝났거나, 프로그램을 바꿨거나, 5/3/1 방식 4주가 끝난 것) */
function prevCycles(s: AppState, lift: LiftKey) {
  const p = s.lifts[lift]
  const out: { id: string; range: string; from?: number; to?: number; weeks: number; program: string; rows: { label: string; text: string }[] }[] = []
  const weeksOf = (a: string, b: string) => Math.max(1, Math.ceil((ts(b) - ts(a)) / (7 * 86400000)))
  for (let c = (p.cycle ?? 1) - 1; c >= 1; c--) {
    const t = s.tests.find((x) => x.lift === lift && x.endedCycle && x.cycleNo === c)
    const ss = s.sessions.filter((x) => x.lift === lift && !x.deload && !x.free && (x.cycle ?? 1) === c && mainOf(x)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    if (!t && !ss.length) continue
    const prog = programOf(ss[0]?.program ?? t?.program)
    const start = t?.endedCycle ?? ss[0].date
    const end = t?.date ?? ss[ss.length - 1].date
    const rows = prog
      .phases(lift)
      .filter((ph) => !ph.test)
      .map((ph) => ({ label: ph.sub ? `${ph.label} ${ph.sub}` : ph.label, text: ss.filter((x) => x.stage === ph.n).map(mainText).join(' → ') }))
      .filter((r) => r.text)
    if (t) rows.push({ label: L('테스트', 'Test'), text: t.attempts.map((a) => `${fmt(a.weight)} ${a.ok ? '✓' : '✗'}`).join(' · ') })
    out.push({ id: t?.id ?? `c${c}`, range: `${md(start)} – ${md(end)}`, from: t?.prevRM, to: t?.newRM, weeks: weeksOf(start, end), program: prog.name(), rows })
  }
  // 사이클 번호가 없던 예전 테스트
  s.tests
    .filter((t) => t.lift === lift && t.endedCycle && t.cycleNo === undefined)
    .reverse()
    .forEach((t) => {
      const start = t.endedCycle as string
      const ss = s.sessions.filter((x) => x.lift === lift && !x.deload && x.date >= start && x.date <= t.date && mainOf(x))
      const prog = programOf(t.program)
      const rows = prog
        .phases(lift)
        .filter((ph) => !ph.test)
        .map((ph) => ({ label: ph.label, text: ss.filter((x) => x.stage === ph.n).map(mainText).join(' → ') }))
        .filter((r) => r.text)
      rows.push({ label: L('테스트', 'Test'), text: t.attempts.map((a) => `${fmt(a.weight)} ${a.ok ? '✓' : '✗'}`).join(' · ') })
      out.push({ id: t.id, range: `${md(start)} – ${md(t.date)}`, from: t.prevRM, to: t.newRM, weeks: weeksOf(start, t.date), program: prog.name(), rows })
    })
  return out
}

export default function Lift({ lift, go, enter, slide }: { lift: LiftKey; go: Go; enter?: boolean; slide?: 'left' | 'right' }) {
  const s = useApp()
  const th = TH[lift]
  const p = s.lifts[lift]
  const u = s.settings.unit
  const st = stepOf(s)
  const [mode, setMode] = useState<'est' | 'act'>('est')
  const [range, setRange] = useState<Range>('cycle')
  const [pop, setPop] = useState<Pop>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const toggle = () => setMode(mode === 'est' ? 'act' : 'est')

  const est = latestEst(s, lift)
  const goal = s.settings.goal[lift]
  const live = s.active?.lift === lift
  const otherLive = !!s.active && !live
  const prog = progOf(s)
  const test = atTest(prog, p)
  const main = mainSet(prog, lift, p, st)
  const work = test ? [] : groupSets(prog.sets(lift, p, st))
  /** 대표 세트 "100kg × 3+" */
  const mainW = main ? `${fmt(main.weight)}${u} × ${repsText(main)}` : ''
  const rows = cycleRows(s, lift, prog)
  const nextPre = prog.canAdvance ? previewNextStage(s, lift) : null
  const nextP = nextPre?.next
  const dl = deloadSets(lift, p.oneRM, st)
  const fa = firstAttempt(p.oneRM, st)
  const bar = s.settings.bar
  const testWarm = warmups(fa, { lift, step: st, bar, unit: u, heavy: true })
  const todayWarm = warmups(main?.weight ?? p.top, { lift, step: st, bar, unit: u, heavy: prog.heavy(p) })
  const dlWarm = warmups(dl[0].weight, { lift, step: st, bar, unit: u, heavy: false })
  const lastSession = [...s.sessions].reverse().find((x) => x.lift === lift && !x.deload && mainOf(x))
  const lastTop = lastSession && mainOf(lastSession)
  const prev = prevCycles(s, lift)

  const begin = (deload: boolean) => {
    setPop(null)
    if (!live) startWorkout(lift, deload)
    go({ name: 'workout' })
  }
  const onStart = () => {
    if (live) return go({ name: 'workout' })
    if (otherLive) return setPop('discard')
    if (test) return setPop('test')
    setPop('start')
  }

  const startButtons = (deload: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button onClick={() => begin(deload)} style={{ height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700 }}>
        {L('훈련 시작', 'Start workout')}
      </button>
      <button onClick={() => setPop(null)} style={{ height: 48, fontSize: 15, fontWeight: 600, color: 'var(--sub)' }}>
        {L('취소', 'Cancel')}
      </button>
    </div>
  )

  return (
    <div
      className="screen"
      onTouchStart={(e) => {
        const t = e.touches[0]
        swipe.current = { x: t.clientX, y: t.clientY }
      }}
      onTouchEnd={(e) => {
        const st0 = swipe.current
        swipe.current = null
        if (!st0 || pop || openId) return
        const t = e.changedTouches[0]
        const dx = t.clientX - st0.x
        const dy = t.clientY - st0.y
        // 옆으로 확실히 민 경우만 (세로 스크롤과 구분)
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
        const i = CARD_ORDER.indexOf(lift)
        const j = i + (dx < 0 ? 1 : -1)
        if (j === CARD_ORDER.length) return go({ name: 'etc', from: 'right' })
        if (j < 0 || j > CARD_ORDER.length) return
        go({ name: 'lift', lift: CARD_ORDER[j], from: dx < 0 ? 'right' : 'left' })
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 12px 0 8px', borderBottom: '1px solid var(--fill)' }}>
        <button aria-label={L('홈으로', 'Home')} onClick={() => go({ name: 'home' })} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: enter ? 'fadeIn 250ms ease both' : undefined }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <nav aria-label={L('종목', 'Lifts')} style={{ display: 'flex', gap: 4, flex: 1 }}>
          {CARD_ORDER.map((k) => {
            const on = k === lift
            return (
              <button key={k} aria-current={on ? 'page' : undefined} onClick={() => !on && go({ name: 'lift', lift: k, from: CARD_ORDER.indexOf(k) > CARD_ORDER.indexOf(lift) ? 'right' : 'left' })} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 10 }}>
                <span style={{ fontSize: 16, fontWeight: on ? 700 : 500, color: on ? TH[k].text : 'var(--sub)' }}>{TH[k].tab}</span>
                <span style={{ width: on ? '100%' : '60%', height: 3, borderRadius: 2, background: TH[k].acc }} />
              </button>
            )
          })}
          <button onClick={() => go({ name: 'etc', from: 'right' })} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--sub)' }}>{ETC_TH.tab}</span>
            <span style={{ width: '60%', height: 3, borderRadius: 2, background: ETC_TH.acc }} />
          </button>
        </nav>
      </header>

      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 20px 0', animation: enter ? 'liftIn 420ms cubic-bezier(0.2,0.8,0.2,1) both' : slide ? `${slide === 'right' ? 'fromRight' : 'fromLeft'} 260ms cubic-bezier(0.2,0.8,0.2,1) both` : undefined }}>
        <h1 className="num" style={{ fontSize: 21, fontWeight: 800 }}>
          {test || !main ? (
            <>
              1RM <span style={{ color: th.text }}>TEST</span>
            </>
          ) : (
            <>
              {prog.id === 'stlog' ? L(`${main.reps}회 탑`, `Top ${main.reps}`) : phaseTitle(prog, lift, p.stage)}{' '}
              <span style={{ color: th.text }}>
                {fmt(main.weight)}
                {u}
              </span>
            </>
          )}
        </h1>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {L('1RM 추이', '1RM trend')}
              <span className="num" style={{ fontSize: 13, fontWeight: 500, color: 'var(--mute)' }}>
                {goal > p.oneRM ? L(`목표까지 ${fmt(goal - p.oneRM)}${u}`, `${fmt(goal - p.oneRM)}${u} to goal`) : L('목표 달성', 'Goal reached')}
              </span>
            </h2>
            <PillToggle value={mode === 'est' ? 0 : 1} onToggle={toggle} a={L('추정', 'Est.')} b={L('실제', 'Actual')} label={L('그래프 기준 바꾸기', 'Switch chart')} />
          </div>
          <button type="button" onClick={toggle} aria-label={L('눌러서 추정과 실제 전환', 'Tap to switch estimated and actual')} style={{ display: 'block', width: '100%' }}>
            <LiftChart lift={lift} pts={liftPoints(s, lift, mode)} range={range} cycleStart={s.lifts[lift].cycleStart} />
          </button>
          <RangeTabs value={range} options={['cycle', '1m', '3m', '6m', '1y', 'all']} onChange={setRange} compact />
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, background: 'var(--fill2)', borderRadius: 14, padding: '6px 14px' }}>
          {(
            [
              [L('추정 1RM', 'Est. 1RM'), est],
              ['1RM', p.oneRM],
              [L('목표', 'Goal'), goal],
            ] as [string, number | null][]
          ).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>{k}</span>
              <span className="num" style={{ fontSize: 17, fontWeight: 700 }}>
                {v === null ? '–' : fmt(v)}
                {v !== null && <span style={{ fontSize: 13, fontWeight: 500 }}> {u}</span>}
              </span>
            </div>
          ))}
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {L('이번 사이클', 'This cycle')}
              <span className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--mute)' }}>
                {md(p.cycleStart)}~
              </span>
            </h2>
            <button onClick={() => setPop('prev')} style={{ height: 30, padding: '0 12px', borderRadius: 999, background: 'var(--fill2)', display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>
              {L('이전 사이클', 'Past cycles')}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          {prog.id !== 'stlog' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -4 }}>
              <span style={{ height: 24, padding: '0 9px', borderRadius: 7, background: 'var(--fill)', fontSize: 12, fontWeight: 700, color: 'var(--ink2)', lineHeight: '24px' }}>
                {levelName(prog.level)} · {prog.name()}
              </span>
              {p.tm !== undefined && (
                <span className="num" style={{ fontSize: 12, color: 'var(--mute)' }}>
                  {L('트레이닝 맥스', 'Training max')} {fmt(p.tm)}
                  {u}
                </span>
              )}
            </div>
          )}
          {rows.filter((r) => !r.test || test || r.boxes.length).map((r) => {
            const cur = r.n === p.stage
            const todayW = cur ? fmt(test ? fa : (main?.weight ?? p.top)) : null
            return (
              <div key={r.n} style={cur ? { display: 'flex', alignItems: 'center', gap: 14, margin: '-6px -10px', padding: '6px 10px', borderRadius: 14, background: th.rowBg } : { display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: prog.id === 'stlog' ? 34 : 44, flexShrink: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                  <span style={{ fontSize: 14, fontWeight: cur ? 800 : 700, color: cur ? th.deep : 'var(--sub)' }}>{r.label}</span>
                  {r.sub && <span style={{ fontSize: 11, fontWeight: 600, color: cur ? th.deep : 'var(--mute)' }}>{r.sub}</span>}
                </span>
                <div
                  ref={(el) => {
                    // 한 줄로, 오늘 칸이 보이게 끝으로
                    if (el) el.scrollLeft = el.scrollWidth
                  }}
                  data-nodrag
                  style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none', margin: '-2px 0', padding: '2px 0' }}
                >
                  {r.boxes.map((b, i) => (
                    <button
                      key={i}
                      onClick={() => setOpenId(b.id)}
                      aria-label={b.deload ? L(`${b.d} 디로드 기록 보기`, `View deload ${b.d}`) : L(`${b.d} 기록 보기`, `View ${b.d}`)}
                      style={{ width: 46, height: 44, flexShrink: 0, borderRadius: 10, border: `1.5px ${b.deload ? 'dashed' : 'solid'} ${th.boxLine}`, background: b.deload ? 'var(--fill2)' : 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <span className="num" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: b.deload ? 'var(--sub)' : 'var(--ink)' }}>
                        {b.w}
                      </span>
                      <span className="num" style={{ fontSize: 10, color: 'var(--mute)' }}>
                        {b.d}
                      </span>
                    </button>
                  ))}
                  {todayW && (
                    <div style={{ width: 46, height: 44, flexShrink: 0, borderRadius: 10, background: th.acc, boxShadow: th.shadow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="num" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, color: th.on }}>
                        {todayW}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: th.on }}>{L('오늘', 'Today')}</span>
                    </div>
                  )}
                  {!r.boxes.length && !todayW && (
                    <div style={{ height: 44, flexShrink: 0, borderRadius: 10, border: '1.5px dashed var(--line2)', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--mute)' }}>{L('아직 기록 없음', 'No sets yet')}</div>
                  )}
                </div>
              </div>
            )
          })}
          {/* 사이클 마지막 테스트 날에는 아래 '테스트 시작' 하나만 */}
          {!test && (
            <div style={{ display: 'grid', gridTemplateColumns: prog.canAdvance ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 8, marginTop: 4 }}>
              <button onClick={() => setPop('test')} style={{ height: 40, borderRadius: 12, border: `1.5px solid ${th.line}`, background: 'var(--surface)', fontSize: 14, fontWeight: 800, color: th.deep }}>
                {L('TEST하기', 'Test now')}
              </button>
              {prog.canAdvance && (
                <button onClick={() => setPop('next')} style={{ height: 40, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14, fontWeight: 600, color: 'var(--ink2)' }}>
                  {prog.advanceLabel()}
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <div style={{ display: 'flex', gap: 8, padding: '10px 20px var(--safe-bot)', animation: enter ? 'liftIn 420ms cubic-bezier(0.2,0.8,0.2,1) 60ms both' : undefined }}>
        {(live || !test) && (
        <button
          onClick={() => setPop(live ? 'discard' : 'deload')}
          style={{ width: 96, flexShrink: 0, height: 56, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}
        >
          {live ? L('기록 취소', 'Discard') : L('디로드', 'Deload')}
        </button>
        )}
        <button onClick={onStart} style={{ flex: 1, height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700 }}>
          {live ? L('이어서 기록', 'Resume') : test ? L('테스트 시작', 'Start test') : L('훈련 시작', 'Start workout')}
        </button>
      </div>

      {openId && <DaySheet sessionId={openId} go={go} back={{ name: 'lift', lift }} onClose={() => setOpenId(null)} />}
      {pop === 'start' && (
        <Sheet onClose={() => setPop(null)} gap={18}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: th.text }}>Now</span>
            <span className="num" style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
              {mainW}
            </span>
            <span style={{ fontSize: 14, color: 'var(--sub)' }}>
              {th.name} · {prog.id === 'stlog' ? L(`${p.stage}단계 탑세트 · RPE 9까지`, `Stage ${p.stage} top set · up to RPE 9`) : `${prog.name()} · ${phaseTitle(prog, lift, p.stage)}`}
            </span>
          </div>
          <SummaryRows
            small
            rows={[
              [`${L('웜업', 'Warm-up')} ${setsLabel(todayWarm.length)}`, todayWarm.map((w) => fmt(w.weight)).join(' → ')],
              ...work.map((x, i): [string, string] => [
                x.type === 'B' ? L('백오프', 'Back-off') : x.type === 'A' ? L('암렙', 'AMRAP') : prog.id === 'stlog' || prog.id === 'rpe1' ? L('탑세트', 'Top set') : `${L('본세트', 'Set')}${work.filter((y) => y.type !== 'B').length > 1 ? ` ${i + 1}` : ''}`,
                `${fmt(x.weight)}${u} × ${x.reps}${x.type === 'A' ? '+' : ''}${x.count > 1 ? ` × ${x.count}` : ''}`,
              ]),
            ]}
          />
          {lastSession && lastTop && (
            <span className="num" style={{ fontSize: 13, color: 'var(--mute)' }}>
              {L('지난번', 'Last')} {md(lastSession.date)} · {fmt(lastTop.weight)}
              {u} × {lastTop.reps}
              {lastTop.rpe !== undefined ? ` @${rpeText(lastTop)}` : ''}
            </span>
          )}
          {startButtons(false)}
        </Sheet>
      )}

      {pop === 'startDeload' && (
        <Sheet onClose={() => setPop(null)} gap={18}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: th.text }}>Now</span>
            <span className="num" style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
              {fmt(dl[0].weight)}
              {u} × {dl[0].reps}
            </span>
            <span style={{ fontSize: 14, color: 'var(--sub)' }}>{th.name} · {L('디로드 · 1RM의 65%', 'Deload · 65% of 1RM')}</span>
          </div>
          <SummaryRows
            small
            rows={[
              [`${L('웜업', 'Warm-up')} ${setsLabel(dlWarm.length)}`, dlWarm.map((w) => fmt(w.weight)).join(' → ')],
              [L('디로드', 'Deload'), `${fmt(dl[0].weight)}${u} × ${dl[0].reps} × ${dl.length}`],
              [L('다음 훈련', 'Next workout'), test ? L('1RM 테스트', '1RM test') : L(`원래 무게 ${mainW}`, `Back to ${mainW}`)],
            ]}
          />
          {startButtons(true)}
        </Sheet>
      )}

      {pop === 'deload' && (
        <Confirm
          lift={lift}
          eyebrow={`${th.name} · ${L('디로드', 'Deload')}`}
          title={L('오늘은 가볍게 할까요?', 'Go light today?')}
          rows={[
            [L('오늘 무게', 'Today'), `${fmt(dl[0].weight)}${u} × ${dl[0].reps} × ${dl.length}`],
            [L('기준', 'Based on'), L(`1RM ${fmt(p.oneRM)}${u}의 65%`, `65% of 1RM ${fmt(p.oneRM)}${u}`)],
            [L('다음 훈련', 'Next workout'), test ? L('1RM 테스트', '1RM test') : L(`원래 무게 ${mainW}`, `Back to ${mainW}`)],
          ]}
          cta={L('디로드로 시작', 'Start deload')}
          onCancel={() => setPop(null)}
          onOk={() => setPop(otherLive ? 'discard' : 'startDeload')}
        />
      )}
      {pop === 'next' && nextP && (
        <Confirm
          lift={lift}
          eyebrow={`${th.name} · ${prog.id === '531' ? L('다음 주', 'Next week') : L('다음 단계', 'Next stage')}`}
          title={prog.id === '531' ? L('다음 주로 넘어갈까요?', 'Move to the next week?') : L('다음 단계로 넘어갈까요?', 'Move to the next stage?')}
          rows={[
            [L('지금', 'Now'), `${phaseTitle(prog, lift, p.stage)} · ${mainW}`],
            ...((atTest(prog, nextP)
              ? [
                  [L('다음', 'Next'), L('1RM 테스트', '1RM test')],
                  [attemptLabel(1), `${fmt(fa)}${u}`],
                ]
              : (() => {
                  const m = mainSet(prog, lift, nextP, st)
                  return [
                    [L('다음', 'Next'), `${nextPre?.newCycle ? `${L('새 사이클', 'New cycle')} · ` : ''}${phaseTitle(prog, lift, nextP.stage)}${m ? ` · ${fmt(m.weight)}${u} × ${repsText(m)}` : ''}`],
                    ...(nextP.tm !== undefined && nextPre?.newCycle ? [[L('트레이닝 맥스', 'Training max'), `${fmt(p.tm ?? 0)} → ${fmt(nextP.tm)}${u}`]] : []),
                  ]
                })()) as [string, string][]),
          ]}
          cta={L('넘어가기', 'Move on')}
          onCancel={() => setPop(null)}
          onOk={() => {
            goNextStage(lift)
            setPop(null)
          }}
        />
      )}
      {pop === 'test' && (
        <Confirm
          lift={lift}
          eyebrow={`${th.name} · ${L('1RM 테스트', '1RM test')}`}
          title={L('한계를 시험해 볼까요?', 'Test your limit?')}
          rows={[
            [L('웜업', 'Warm-up'), testWarm.length ? `${setsLabel(testWarm.length)} · ${fmt(testWarm[0].weight)} → ${fmt(testWarm[testWarm.length - 1].weight)}${u}` : L('없음', 'None')],
            [attemptLabel(1), `${fmt(fa)}${u}`],
            [L('지금 1RM', 'Current 1RM'), `${fmt(p.oneRM)}${u}`],
          ]}
          cta={L('테스트 시작', 'Start test')}
          onCancel={() => setPop(null)}
          onOk={() => {
            setPop(null)
            go({ name: 'test', lift })
          }}
        />
      )}
      {pop === 'discard' && s.active && (
        <Confirm
          lift={s.active.lift}
          eyebrow={`${TH[s.active.lift].name} · ${L('기록 중', 'In progress')}`}
          title={live ? L('이 기록을 지울까요?', 'Discard this workout?') : L('진행 중인 기록이 있어요', 'A workout is in progress')}
          rows={[[L('완료한 세트', 'Sets done'), setsLabel(s.active.sets.filter((r) => r.done).length)]]}
          cta={live ? L('기록 지우기', 'Discard') : L('지우고 새로 시작', 'Discard and start')}
          onCancel={() => setPop(null)}
          onOk={() => {
            cancelWorkout()
            setPop(live ? null : test ? 'test' : 'start')
          }}
        />
      )}
      {pop === 'prev' && (
        <Sheet onClose={() => setPop(null)} tall>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>{L('이전 사이클', 'Past cycles')}</h2>
            <button aria-label={L('닫기', 'Close')} onClick={() => setPop(null)} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {prev.map((c) => (
            <article key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span className="num" style={{ fontSize: 17, fontWeight: 800 }}>
                    {c.range}
                  </span>
                  <span style={{ height: 22, padding: '0 8px', borderRadius: 6, background: 'var(--fill)', fontSize: 12, fontWeight: 700, color: 'var(--ink2)', lineHeight: '22px', whiteSpace: 'nowrap' }}>{c.program}</span>
                </div>
                <span className="num" style={{ fontSize: 13, color: 'var(--sub)' }}>
                  {c.from !== undefined && c.to !== undefined && (
                    <>
                      <span style={{ fontWeight: 800, color: th.deep }}>{c.to > c.from ? L(`+${fmt(c.to - c.from)}${u} 상승`, `+${fmt(c.to - c.from)}${u}`) : L('유지', 'Same')}</span> · 1RM {fmt(c.from)} → {fmt(c.to)}
                      {u} ·{' '}
                    </>
                  )}
                  {L(`${c.weeks}주`, `${c.weeks} wk`)}
                </span>
              </div>
              {c.rows.map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 52, flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--sub)' }}>{r.label}</span>
                  <span className="num" style={{ fontSize: 14, color: 'var(--ink2)' }}>
                    {r.text}
                  </span>
                </div>
              ))}
            </article>
          ))}
          {prev.length === 0 && <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 14, color: 'var(--mute)' }}>{L('아직 끝난 사이클이 없어요', 'No finished cycles yet')}</div>}
        </Sheet>
      )}
    </div>
  )
}
