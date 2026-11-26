import { useState } from 'react'
import type { LiftKey } from '../logic/program'
import { STAGES, advanceStage, deloadSets, firstAttempt, warmups } from '../logic/program'
import { cancelWorkout, goNextStage, startWorkout } from '../actions'
import type { AppState, SessionLog } from '../store'
import { step as stepOf, useApp } from '../store'
import { CARD_ORDER, TH, fmt, md } from '../theme'
import { Confirm, LiftChart, PillToggle, Sheet, SummaryRows, ts } from '../ui'
import type { Go } from '../App'
import { latestEst, liftPoints } from './Home'

type Pop = null | 'deload' | 'next' | 'test' | 'prev' | 'start' | 'startDeload' | 'discard'

const topOf = (x: SessionLog) => x.sets.find((r) => r.type === 'T' && r.done)

/** 이번 사이클 단계별 기록 */
function cycleRows(s: AppState, lift: LiftKey) {
  const p = s.lifts[lift]
  const cyc = s.sessions.filter((x) => x.lift === lift && !x.deload && (x.cycle ?? 1) === (p.cycle ?? 1))
  return ([1, 2, 3] as const).map((n) => ({
    n: n as number,
    label: `${STAGES[n].topReps}회`,
    boxes: cyc
      .filter((x) => x.stage === n && topOf(x))
      .map((x) => ({ w: fmt(topOf(x)!.weight), d: md(x.date) })),
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
        .map((n) => ({ label: `${STAGES[n].topReps}회`, text: ss.filter((x) => x.stage === n && topOf(x)).map((x) => fmt(topOf(x)!.weight)).join(' → ') }))
        .filter((r) => r.text)
      rows.push({ label: '테스트', text: t.attempts.map((a) => `${fmt(a.weight)} ${a.ok ? '✓' : '✗'}`).join(' · ') })
      const weeks = Math.max(1, Math.ceil((ts(t.date) - ts(start)) / (7 * 86400000)))
      return { id: t.id, range: `${md(start)} – ${md(t.date)}`, from: t.prevRM, to: t.newRM, weeks, rows }
    })
}

export default function Lift({ lift, go }: { lift: LiftKey; go: Go }) {
  const s = useApp()
  const th = TH[lift]
  const p = s.lifts[lift]
  const u = s.settings.unit
  const st = stepOf(s)
  const [mode, setMode] = useState<'est' | 'act'>('est')
  const [pop, setPop] = useState<Pop>(null)
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
        훈련 시작
      </button>
      <button onClick={() => setPop(null)} style={{ height: 48, fontSize: 15, fontWeight: 600, color: '#4E5968' }}>
        취소
      </button>
    </div>
  )

  return (
    <div className="screen">
      <header style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 12px 0 8px', borderBottom: '1px solid #F2F4F6' }}>
        <button aria-label="홈으로" onClick={() => go({ name: 'home' })} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <nav aria-label="종목" style={{ display: 'flex', gap: 4, flex: 1 }}>
          {CARD_ORDER.map((k) => {
            const on = k === lift
            return (
              <button key={k} aria-current={on ? 'page' : undefined} onClick={() => !on && go({ name: 'lift', lift: k })} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 10 }}>
                <span style={{ fontSize: 16, fontWeight: on ? 700 : 500, color: on ? TH[k].text : '#4E5968' }}>{TH[k].tab}</span>
                <span style={{ width: on ? '100%' : '60%', height: 3, borderRadius: 2, background: TH[k].acc }} />
              </button>
            )
          })}
        </nav>
      </header>

      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 20px 0' }}>
        <h1 className="num" style={{ fontSize: 22, fontWeight: 800 }}>
          {p.stage === 4 ? (
            <>
              1RM <span style={{ color: th.text }}>TEST</span>
            </>
          ) : (
            <>
              {cfg.topReps}회 탑{' '}
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
              1RM 추이
              <span className="num" style={{ fontSize: 13, fontWeight: 500, color: '#6B7684' }}>
                {goal > p.oneRM ? `목표까지 ${fmt(goal - p.oneRM)}${u}` : '목표 달성'}
              </span>
            </h2>
            <PillToggle value={mode === 'est' ? 0 : 1} onToggle={toggle} a="추정" b="실제" label={`그래프 기준 바꾸기, 지금 ${mode === 'est' ? '추정' : '실제'} 1RM`} />
          </div>
          <button type="button" onClick={toggle} aria-label="눌러서 추정과 실제 전환" style={{ display: 'block', width: '100%' }}>
            <LiftChart lift={lift} pts={liftPoints(s, lift, mode)} unit={u} />
          </button>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, background: '#F7F8FA', borderRadius: 14, padding: '12px 14px' }}>
          {(
            [
              ['추정 1RM', est],
              ['1RM', p.oneRM],
              ['목표', goal],
            ] as [string, number | null][]
          ).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12, color: '#6B7684' }}>{k}</span>
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
              이번 사이클
              <span className="num" style={{ fontSize: 12, fontWeight: 500, color: '#6B7684' }}>
                {md(p.cycleStart)}~
              </span>
            </h2>
            <button onClick={() => setPop('prev')} style={{ height: 32, padding: '0 12px', borderRadius: 999, background: '#F7F8FA', display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: '#4E5968' }}>
              이전 사이클
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          {[...rows, ...(p.stage === 4 ? [{ n: 4, label: '1회', boxes: [] as { w: string; d: string }[] }] : [])].map((r) => {
            const cur = r.n === p.stage
            const todayW = cur ? fmt(p.stage === 4 ? fa : p.top) : null
            return (
              <div key={r.n} style={cur ? { display: 'flex', alignItems: 'center', gap: 10, margin: '-6px -10px', padding: '6px 10px', borderRadius: 14, background: th.rowBg } : { display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, flexShrink: 0, fontSize: 14, fontWeight: cur ? 800 : 700, color: cur ? th.deep : '#4E5968' }}>{r.label}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                  {r.boxes.map((b, i) => (
                    <div key={i} style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${th.boxLine}`, background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="num" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2, color: '#191F28' }}>
                        {b.w}
                      </span>
                      <span className="num" style={{ fontSize: 10, color: '#6B7684' }}>
                        {b.d}
                      </span>
                    </div>
                  ))}
                  {todayW && (
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: th.acc, boxShadow: th.shadow, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="num" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, color: th.on }}>
                        {todayW}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: th.on }}>오늘</span>
                    </div>
                  )}
                  {!r.boxes.length && !todayW && (
                    <div style={{ height: 44, borderRadius: 10, border: '1.5px dashed #D1D6DB', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 13, color: '#6B7684' }}>아직 기록 없음</div>
                  )}
                </div>
              </div>
            )
          })}
          <div style={{ display: 'grid', gridTemplateColumns: p.stage < 4 ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 8, marginTop: 2 }}>
            <button onClick={() => setPop('test')} style={{ height: 44, borderRadius: 12, border: `1.5px solid ${th.line}`, background: '#FFFFFF', fontSize: 14, fontWeight: 800, color: th.deep }}>
              TEST하기
            </button>
            {p.stage < 4 && (
              <button onClick={() => setPop('next')} style={{ height: 44, borderRadius: 12, border: '1px solid #E5E8EB', background: '#FFFFFF', fontSize: 14, fontWeight: 600, color: '#333D4B' }}>
                다음 단계로
              </button>
            )}
          </div>
        </section>
      </main>

      <div style={{ display: 'flex', gap: 8, padding: '14px 20px var(--safe-bot)' }}>
        <button
          onClick={() => setPop(live ? 'discard' : 'deload')}
          style={{ width: 96, flexShrink: 0, height: 56, borderRadius: 14, border: '1px solid #E5E8EB', background: '#FFFFFF', fontSize: 16, fontWeight: 700, color: '#333D4B' }}
        >
          {live ? '기록 취소' : '디로드'}
        </button>
        <button onClick={onStart} style={{ flex: 1, height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700 }}>
          {live ? '이어서 기록' : p.stage === 4 ? '테스트 시작' : '훈련 시작'}
        </button>
      </div>

      {pop === 'start' && (
        <Sheet onClose={() => setPop(null)} gap={18}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: th.text }}>Now</span>
            <span className="num" style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
              {fmt(p.top)}
              {u} × {cfg.topReps}
            </span>
            <span style={{ fontSize: 14, color: '#4E5968' }}>
              {th.name} · {stage3}단계 탑세트 · RPE 9까지
            </span>
          </div>
          <SummaryRows
            small
            rows={[
              [`웜업 ${todayWarm.length}세트`, todayWarm.map((w) => fmt(w.weight)).join(' → ')],
              ['탑세트', `${fmt(p.top)}${u} × ${cfg.topReps}`],
              ['백오프', `${fmt(p.backoff)}${u} × ${cfg.boReps[lift]} × ${cfg.boSets}`],
            ]}
          />
          {lastSession && lastTop && (
            <span className="num" style={{ fontSize: 13, color: '#6B7684' }}>
              지난번 {md(lastSession.date)} · {fmt(lastTop.weight)}
              {u} × {lastTop.reps}
              {lastTop.rpe !== undefined ? ` @RPE ${lastTop.rpe === 'fail' ? '실패' : lastTop.rpe}` : ''}
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
            <span style={{ fontSize: 14, color: '#4E5968' }}>{th.name} · 디로드 · 1RM의 65%</span>
          </div>
          <SummaryRows
            small
            rows={[
              [`웜업 ${dlWarm.length}세트`, dlWarm.map((w) => fmt(w.weight)).join(' → ')],
              ['디로드', `${fmt(dl[0].weight)}${u} × ${dl[0].reps} × ${dl.length}`],
              ['다음 훈련', `원래 무게 ${fmt(p.top)}${u} × ${cfg.topReps}`],
            ]}
          />
          {startButtons(true)}
        </Sheet>
      )}

      {pop === 'deload' && (
        <Confirm
          lift={lift}
          eyebrow={`${th.name} · 디로드`}
          title="오늘은 가볍게 할까요?"
          rows={[
            ['오늘 무게', `${fmt(dl[0].weight)}${u} × ${dl[0].reps} × ${dl.length}`],
            ['기준', `1RM ${fmt(p.oneRM)}${u}의 65%`],
            ['다음 훈련', `원래 무게 ${fmt(p.top)}${u} × ${cfg.topReps}`],
          ]}
          cta="디로드로 시작"
          onCancel={() => setPop(null)}
          onOk={() => setPop(otherLive ? 'discard' : 'startDeload')}
        />
      )}
      {pop === 'next' && (
        <Confirm
          lift={lift}
          eyebrow={`${th.name} · 다음 단계`}
          title="다음 단계로 넘어갈까요?"
          rows={[
            ['지금', `${p.stage}단계 · ${cfg.topReps}회 탑 ${fmt(p.top)}${u}`],
            ...((nextP.stage === 4
              ? [
                  ['다음', '1RM 테스트'],
                  ['1차 시도', `${fmt(fa)}${u}`],
                ]
              : [
                  ['다음', `${nextP.stage}단계 · ${STAGES[nextP.stage as 1 | 2 | 3].topReps}회 탑 ${fmt(nextP.top)}${u}`],
                  ['백오프', `${fmt(nextP.backoff)}${u} × ${STAGES[nextP.stage as 1 | 2 | 3].boReps[lift]} × ${STAGES[nextP.stage as 1 | 2 | 3].boSets}`],
                ]) as [string, string][]),
          ]}
          cta="넘어가기"
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
          eyebrow={`${th.name} · 1RM 테스트`}
          title="한계를 시험해 볼까요?"
          rows={[
            ['웜업', testWarm.length ? `${testWarm.length}세트 · ${fmt(testWarm[0].weight)} → ${fmt(testWarm[testWarm.length - 1].weight)}${u}` : '없음'],
            ['1차 시도', `${fmt(fa)}${u}`],
            ['지금 1RM', `${fmt(p.oneRM)}${u}`],
          ]}
          cta="테스트 시작"
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
          eyebrow={`${TH[s.active.lift].name} · 기록 중`}
          title={live ? '이 기록을 지울까요?' : '진행 중인 기록이 있어요'}
          rows={[['완료한 세트', `${s.active.sets.filter((r) => r.done).length}세트`]]}
          cta={live ? '기록 지우기' : '지우고 새로 시작'}
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
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>이전 사이클</h2>
            <button aria-label="닫기" onClick={() => setPop(null)} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {prev.map((c) => (
            <article key={c.id} style={{ border: '1px solid #E5E8EB', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="num" style={{ fontSize: 17, fontWeight: 800 }}>
                  {c.range}
                </span>
                <span className="num" style={{ fontSize: 13, color: '#4E5968' }}>
                  <span style={{ fontWeight: 800, color: th.deep }}>{c.to > c.from ? `+${fmt(c.to - c.from)}${u} 상승` : '유지'}</span> · 1RM {fmt(c.from)} → {fmt(c.to)}
                  {u} · {c.weeks}주
                </span>
              </div>
              {c.rows.map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 44, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#4E5968' }}>{r.label}</span>
                  <span className="num" style={{ fontSize: 14, color: '#333D4B' }}>
                    {r.text}
                  </span>
                </div>
              ))}
            </article>
          ))}
          {prev.length === 0 && <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 14, color: '#6B7684' }}>아직 끝난 사이클이 없어요</div>}
        </Sheet>
      )}
    </div>
  )
}
