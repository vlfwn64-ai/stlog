import { L, attemptLabel, setsLabel, shortReps, stageLabel, topLabel } from '../i18n'
import { useRef, useState } from 'react'
import type { LiftKey } from '../logic/program'
import { STAGES, advanceStage, deloadSets, firstAttempt, warmups } from '../logic/program'
import { cancelWorkout, goNextStage, startWorkout } from '../actions'
import type { AppState, SessionLog } from '../store'
import { step as stepOf, useApp } from '../store'
import { CARD_ORDER, TH, fmt, md } from '../theme'
import { Confirm, LiftChart, PillToggle, Sheet, SummaryRows, ts } from '../ui'
import type { Go } from '../App'
import { latestEst, liftPoints } from './Home'
import DaySheet from './DaySheet'

type Pop = null | 'deload' | 'next' | 'test' | 'prev' | 'start' | 'startDeload' | 'discard'

const topOf = (x: SessionLog) => x.sets.find((r) => r.type === 'T' && r.done)

/** 디로드 날 무게 (완료한 본 세트 중 가장 무거운 것) */
const deloadOf = (x: SessionLog) => {
  const w = x.sets.filter((r) => r.type !== 'W' && r.done).map((r) => r.weight)
  return w.length ? Math.max(...w) : null
}

type Box = { w: string; d: string; id: string; deload?: boolean }

/** 이번 사이클 단계별 기록 (디로드한 날도 그 단계 자리에 날짜순으로) */
function cycleRows(s: AppState, lift: LiftKey) {
  const p = s.lifts[lift]
  const cyc = s.sessions.filter((x) => x.lift === lift && (x.cycle ?? 1) === (p.cycle ?? 1))
  return ([1, 2, 3, 4] as const).map((n) => ({
    n: n as number,
    label: shortReps(n === 4 ? 1 : STAGES[n].topReps),
    boxes: cyc
      .filter((x) => x.stage === n)
      .flatMap((x): Box[] => {
        if (x.deload) {
          const w = deloadOf(x)
          return w === null ? [] : [{ w: fmt(w), d: md(x.date), id: x.id, deload: true }]
        }
        const t = topOf(x)
        return t ? [{ w: fmt(t.weight), d: md(x.date), id: x.id }] : []
      }),
  }))
}

/** 끝난 사이클 (새 사이클로 넘어간 테스트 기준) */
function prevCycles(s: AppState, lift: LiftKey) {
  return s.tests
    .filter((t) => t.lift === lift && t.endedCycle)
    .reverse()
    .map((t) => {
      const start = t.endedCycle as string
      const ss = s.sessions.filter((x) => x.lift === lift && !x.deload && (t.cycleNo !== undefined ? (x.cycle ?? 1) === t.cycleNo : x.date >= start && x.date <= t.date))
      const rows = ([1, 2, 3] as const)
        .map((n) => ({ label: shortReps(STAGES[n].topReps), text: ss.filter((x) => x.stage === n && topOf(x)).map((x) => fmt(topOf(x)!.weight)).join(' → ') }))
        .filter((r) => r.text)
      rows.push({ label: L('테스트', 'Test'), text: t.attempts.map((a) => `${fmt(a.weight)} ${a.ok ? '✓' : '✗'}`).join(' · ') })
      const weeks = Math.max(1, Math.ceil((ts(t.date) - ts(start)) / (7 * 86400000)))
      return { id: t.id, range: `${md(start)} – ${md(t.date)}`, from: t.prevRM, to: t.newRM, weeks, rows }
    })
}

export default function Lift({ lift, go, enter, slide }: { lift: LiftKey; go: Go; enter?: boolean; slide?: 'left' | 'right' }) {
  const s = useApp()
  const th = TH[lift]
  const p = s.lifts[lift]
  const u = s.settings.unit
  const st = stepOf(s)
  const [mode, setMode] = useState<'est' | 'act'>('est')
  const [pop, setPop] = useState<Pop>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const toggle = () => setMode(mode === 'est' ? 'act' : 'est')

  const est = latestEst(s, lift)
  const goal = s.settings.goal[lift]
  const live = s.active?.lift === lift
  const otherLive = !!s.active && !live
  const stage3 = Math.min(3, p.stage) as 1 | 2 | 3
  const cfg = STAGES[stage3]
  const rows = cycleRows(s, lift)
  const nextP = advanceStage(p, st)
  const dl = deloadSets(lift, p.oneRM, st)
  const fa = firstAttempt(p.oneRM, st)
  const bar = s.settings.bar
  const testWarm = warmups(fa, { lift, step: st, bar, unit: u, heavy: true })
  const todayWarm = warmups(p.top, { lift, step: st, bar, unit: u, heavy: stage3 === 3 })
  const dlWarm = warmups(dl[0].weight, { lift, step: st, bar, unit: u, heavy: false })
  const lastSession = [...s.sessions].reverse().find((x) => x.lift === lift && !x.deload && topOf(x))
  const lastTop = lastSession && topOf(lastSession)
  const prev = prevCycles(s, lift)

  const begin = (deload: boolean) => {
    setPop(null)
    if (!live) startWorkout(lift, deload)
    go({ name: 'workout' })
  }
  const onStart = () => {
    if (live) return go({ name: 'workout' })
    if (otherLive) return setPop('discard')
    if (p.stage === 4) return setPop('test')
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
        if (j < 0 || j >= CARD_ORDER.length) return
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
        </nav>
      </header>

      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 20px 0', animation: enter ? 'liftIn 420ms cubic-bezier(0.2,0.8,0.2,1) both' : slide ? `${slide === 'right' ? 'fromRight' : 'fromLeft'} 260ms cubic-bezier(0.2,0.8,0.2,1) both` : undefined }}>
        <h1 className="num" style={{ fontSize: 22, fontWeight: 800 }}>
          {p.stage === 4 ? (
            <>
              1RM <span style={{ color: th.text }}>TEST</span>
            </>
          ) : (
            <>
              {topLabel(cfg.topReps)}{' '}
              <span style={{ color: th.text }}>
                {fmt(p.top)}
                {u}
              </span>
            </>
          )}
        </h1>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {L('1RM 추이', '1RM trend')}
              <span className="num" style={{ fontSize: 13, fontWeight: 500, color: 'var(--mute)' }}>
                {goal > p.oneRM ? L(`목표까지 ${fmt(goal - p.oneRM)}${u}`, `${fmt(goal - p.oneRM)}${u} to goal`) : L('목표 달성', 'Goal reached')}
              </span>
            </h2>
            <PillToggle value={mode === 'est' ? 0 : 1} onToggle={toggle} a={L('추정', 'Est.')} b={L('실제', 'Actual')} label={L('그래프 기준 바꾸기', 'Switch chart')} />
          </div>
          <button type="button" onClick={toggle} aria-label={L('눌러서 추정과 실제 전환', 'Tap to switch estimated and actual')} style={{ display: 'block', width: '100%' }}>
            <LiftChart lift={lift} pts={liftPoints(s, lift, mode)} />
          </button>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, background: 'var(--fill2)', borderRadius: 14, padding: '12px 14px' }}>
          {(
            [
              [L('추정 1RM', 'Est. 1RM'), est],
              ['1RM', p.oneRM],
              [L('목표', 'Goal'), goal],
            ] as [string, number | null][]
          ).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--mute)' }}>{k}</span>
              <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>
                {v === null ? '–' : fmt(v)}
                {v !== null && <span style={{ fontSize: 13, fontWeight: 500 }}> {u}</span>}
              </span>
            </div>
          ))}
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {L('이번 사이클', 'This cycle')}
              <span className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--mute)' }}>
                {md(p.cycleStart)}~
              </span>
            </h2>
            <button onClick={() => setPop('prev')} style={{ height: 32, padding: '0 12px', borderRadius: 999, background: 'var(--fill2)', display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>
              {L('이전 사이클', 'Past cycles')}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          {rows.filter((r) => r.n < 4 || p.stage === 4 || r.boxes.length).map((r) => {
            const cur = r.n === p.stage
            const todayW = cur ? fmt(p.stage === 4 ? fa : p.top) : null
            return (
              <div key={r.n} style={cur ? { display: 'flex', alignItems: 'center', gap: 10, margin: '-6px -10px', padding: '6px 10px', borderRadius: 14, background: th.rowBg } : { display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, flexShrink: 0, fontSize: 14, fontWeight: cur ? 800 : 700, color: cur ? th.deep : 'var(--sub)' }}>{r.label}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                  {r.boxes.map((b, i) => (
                    <button
                      key={i}
                      onClick={() => setOpenId(b.id)}
                      aria-label={b.deload ? L(`${b.d} 디로드 기록 보기`, `View deload ${b.d}`) : L(`${b.d} 기록 보기`, `View ${b.d}`)}
                      style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px ${b.deload ? 'dashed' : 'solid'} ${th.boxLine}`, background: b.deload ? 'var(--fill2)' : 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
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
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: th.acc, boxShadow: th.shadow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="num" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, color: th.on }}>
                        {todayW}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: th.on }}>{L('오늘', 'Today')}</span>
                    </div>
                  )}
                  {!r.boxes.length && !todayW && (
                    <div style={{ height: 44, borderRadius: 10, border: '1.5px dashed var(--line2)', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--mute)' }}>{L('아직 기록 없음', 'No sets yet')}</div>
                  )}
                </div>
              </div>
            )
          })}
          {/* 사이클 마지막 테스트 날에는 아래 '테스트 시작' 하나만 */}
          {p.stage < 4 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 2 }}>
              <button onClick={() => setPop('test')} style={{ height: 44, borderRadius: 12, border: `1.5px solid ${th.line}`, background: 'var(--surface)', fontSize: 14, fontWeight: 800, color: th.deep }}>
                {L('TEST하기', 'Test now')}
              </button>
              <button onClick={() => setPop('next')} style={{ height: 44, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14, fontWeight: 600, color: 'var(--ink2)' }}>
                {L('다음 단계로', 'Next stage')}
              </button>
            </div>
          )}
        </section>
      </main>

      <div style={{ display: 'flex', gap: 8, padding: '14px 20px var(--safe-bot)', animation: enter ? 'liftIn 420ms cubic-bezier(0.2,0.8,0.2,1) 60ms both' : undefined }}>
        {(live || p.stage < 4) && (
        <button
          onClick={() => setPop(live ? 'discard' : 'deload')}
          style={{ width: 96, flexShrink: 0, height: 56, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}
        >
          {live ? L('기록 취소', 'Discard') : L('디로드', 'Deload')}
        </button>
        )}
        <button onClick={onStart} style={{ flex: 1, height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700 }}>
          {live ? L('이어서 기록', 'Resume') : p.stage === 4 ? L('테스트 시작', 'Start test') : L('훈련 시작', 'Start workout')}
        </button>
      </div>

      {openId && <DaySheet sessionId={openId} go={go} back={{ name: 'lift', lift }} onClose={() => setOpenId(null)} />}
      {pop === 'start' && (
        <Sheet onClose={() => setPop(null)} gap={18}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: th.text }}>Now</span>
            <span className="num" style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
              {fmt(p.top)}
              {u} × {cfg.topReps}
            </span>
            <span style={{ fontSize: 14, color: 'var(--sub)' }}>
              {th.name} · {L(`${stage3}단계 탑세트 · RPE 9까지`, `Stage ${stage3} top set · up to RPE 9`)}
            </span>
          </div>
          <SummaryRows
            small
            rows={[
              [`${L('웜업', 'Warm-up')} ${setsLabel(todayWarm.length)}`, todayWarm.map((w) => fmt(w.weight)).join(' → ')],
              [L('탑세트', 'Top set'), `${fmt(p.top)}${u} × ${cfg.topReps}`],
              [L('백오프', 'Back-off'), `${fmt(p.backoff)}${u} × ${cfg.boReps[lift]} × ${cfg.boSets}`],
            ]}
          />
          {lastSession && lastTop && (
            <span className="num" style={{ fontSize: 13, color: 'var(--mute)' }}>
              {L('지난번', 'Last')} {md(lastSession.date)} · {fmt(lastTop.weight)}
              {u} × {lastTop.reps}
              {lastTop.rpe !== undefined ? ` @RPE ${lastTop.rpe === 'fail' ? L('실패', 'fail') : lastTop.rpe}` : ''}
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
              [L('다음 훈련', 'Next workout'), L(`원래 무게 ${fmt(p.top)}${u} × ${cfg.topReps}`, `Back to ${fmt(p.top)}${u} × ${cfg.topReps}`)],
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
            [L('다음 훈련', 'Next workout'), L(`원래 무게 ${fmt(p.top)}${u} × ${cfg.topReps}`, `Back to ${fmt(p.top)}${u} × ${cfg.topReps}`)],
          ]}
          cta={L('디로드로 시작', 'Start deload')}
          onCancel={() => setPop(null)}
          onOk={() => setPop(otherLive ? 'discard' : 'startDeload')}
        />
      )}
      {pop === 'next' && (
        <Confirm
          lift={lift}
          eyebrow={`${th.name} · ${L('다음 단계', 'Next stage')}`}
          title={L('다음 단계로 넘어갈까요?', 'Move to the next stage?')}
          rows={[
            [L('지금', 'Now'), `${stageLabel(p.stage)} · ${topLabel(cfg.topReps)} ${fmt(p.top)}${u}`],
            ...((nextP.stage === 4
              ? [
                  [L('다음', 'Next'), L('1RM 테스트', '1RM test')],
                  [attemptLabel(1), `${fmt(fa)}${u}`],
                ]
              : [
                  [L('다음', 'Next'), `${stageLabel(nextP.stage)} · ${topLabel(STAGES[nextP.stage as 1 | 2 | 3].topReps)} ${fmt(nextP.top)}${u}`],
                  [L('백오프', 'Back-off'), `${fmt(nextP.backoff)}${u} × ${STAGES[nextP.stage as 1 | 2 | 3].boReps[lift]} × ${STAGES[nextP.stage as 1 | 2 | 3].boSets}`],
                ]) as [string, string][]),
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
            setPop(live ? null : p.stage === 4 ? 'test' : 'start')
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
                <span className="num" style={{ fontSize: 17, fontWeight: 800 }}>
                  {c.range}
                </span>
                <span className="num" style={{ fontSize: 13, color: 'var(--sub)' }}>
                  <span style={{ fontWeight: 800, color: th.deep }}>{c.to > c.from ? L(`+${fmt(c.to - c.from)}${u} 상승`, `+${fmt(c.to - c.from)}${u}`) : L('유지', 'Same')}</span> · 1RM {fmt(c.from)} → {fmt(c.to)}
                  {u} · {L(`${c.weeks}주`, `${c.weeks} wk`)}
                </span>
              </div>
              {c.rows.map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 44, flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--sub)' }}>{r.label}</span>
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
