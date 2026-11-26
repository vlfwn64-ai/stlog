import { useState } from 'react'
import type { LiftKey } from '../logic/program'
import { STAGES, advanceStage, deloadSets, firstAttempt, warmups } from '../logic/program'
import { cancelWorkout, goNextStage, startWorkout } from '../actions'
import { step as stepOf, useApp } from '../store'
import { TH, fmt } from '../theme'
import { Confirm, Header, LineChart, Sheet, themeVars } from '../ui'
import type { Go } from '../App'
import { CHART_COLOR, latestEst, liftPoints } from './Home'

const md = (d: string) => `${+d.slice(5, 7)}.${+d.slice(8, 10)}`

export default function Lift({ lift, go }: { lift: LiftKey; go: Go }) {
  const s = useApp()
  const th = TH[lift]
  const p = s.lifts[lift]
  const u = s.settings.unit
  const st = stepOf(s)
  const [mode, setMode] = useState<'est' | 'act'>('est')
  const [pop, setPop] = useState<null | 'deload' | 'next' | 'test' | 'prev' | 'switch'>(null)

  const est = latestEst(s, lift)
  const goal = s.settings.goal[lift]
  const toGoal = Math.max(0, goal - p.oneRM)
  const live = s.active?.lift === lift
  const otherLive = s.active && s.active.lift !== lift

  // 이번 사이클 단계별 최근 탑세트
  const cyc = s.sessions.filter((x) => x.lift === lift && !x.deload && x.date >= p.cycleStart)
  const boxes = ([1, 2, 3] as const).map((n) => {
    const l = cyc.filter((x) => x.stage === n)
    const last = l[l.length - 1]
    const top = last?.sets.find((r) => r.type === 'T' && r.done)
    return { n, label: `${n}단계 ${STAGES[n].topReps}회`, w: top ? fmt(top.weight) : n === p.stage ? fmt(p.top) : '–', date: last ? md(last.date) : n === p.stage ? '오늘' : '' }
  })
  const prev = s.tests.filter((t) => t.lift === lift && t.endedCycle).reverse()

  const start = (deload: boolean) => {
    if (otherLive) return setPop('switch')
    if (!live) startWorkout(lift, deload)
    go({ name: 'workout' })
  }

  const headline = p.stage === 4 ? '1RM 테스트' : `${STAGES[p.stage].topReps}회 탑 ${fmt(p.top)}${u}`
  const nextP = advanceStage(p, st)
  const dl = deloadSets(lift, p.oneRM, st)
  const fa = firstAttempt(p.oneRM, st)
  const warmN = warmups(fa, { lift, step: st, bar: s.settings.bar, unit: u, heavy: true }).length

  return (
    <div className="screen" style={themeVars(lift)}>
      <Header onBack={() => go({ name: 'home' })} title={th.name} color={th.text} />
      <div className="scroll pad" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 12 }}>
        <h2 className="h-xl num">{headline}</h2>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="h-md">1RM 추이</h3>
            <div className="seg">
              <button aria-pressed={mode === 'est'} onClick={() => setMode('est')}>
                추정
              </button>
              <button aria-pressed={mode === 'act'} onClick={() => setMode('act')}>
                실제
              </button>
            </div>
          </div>
          <button style={{ width: '100%', marginTop: 8 }} onClick={() => setMode(mode === 'est' ? 'act' : 'est')} aria-label="추정/실제 전환">
            <LineChart series={[{ color: CHART_COLOR[lift], label: lift, pts: liftPoints(s, lift, mode) }]} unit={u} />
          </button>
          <div style={{ fontSize: 14, fontWeight: 700, color: th.text, marginTop: 4 }}>
            목표까지 {fmt(toGoal)}
            {u}
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            ['추정 1RM', est !== null ? fmt(est) : '–'],
            ['1RM', fmt(p.oneRM)],
            ['목표', fmt(goal)],
          ].map(([k, v]) => (
            <div key={k} className="card" style={{ padding: 12 }}>
              <div className="label">{k}</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 800 }}>
                {v}
              </div>
            </div>
          ))}
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 className="h-md">이번 사이클</h3>
            <button onClick={() => setPop('prev')} style={{ height: 32, padding: '0 12px', borderRadius: 16, background: 'var(--fill)', fontSize: 13, fontWeight: 700, color: 'var(--ink2)' }}>
              이전 사이클
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[...boxes, { n: 4, label: 'TEST', w: p.stage === 4 ? fmt(fa) : '–', date: p.stage === 4 ? '오늘' : '' }].map((b) => {
              const cur = b.n === p.stage
              return (
                <div key={b.n} style={{ borderRadius: 12, padding: '10px 8px', background: cur ? th.acc : 'var(--fill2)', color: cur ? th.on : 'var(--ink)', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 78 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{b.label}</span>
                  <span className="num" style={{ fontSize: 18, fontWeight: 800 }}>
                    {b.w}
                  </span>
                  <span className="num" style={{ fontSize: 11, opacity: 0.8 }}>
                    {b.date}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        <section style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-tint btn-sm" onClick={() => setPop('test')}>
            TEST하기
          </button>
          {p.stage < 4 && (
            <button className="btn btn-tint btn-sm" onClick={() => setPop('next')}>
              다음 단계로
            </button>
          )}
        </section>
      </div>

      <div className="bottom" style={{ flexDirection: 'row' }}>
        {p.stage < 4 && !live && (
          <button className="btn btn-gray" style={{ flex: 1 }} onClick={() => setPop('deload')}>
            디로드
          </button>
        )}
        <button className="btn btn-acc" style={{ flex: 2 }} onClick={() => (p.stage === 4 && !live ? setPop('test') : start(false))}>
          {live ? '이어서 기록' : p.stage === 4 ? 'TEST 시작' : '훈련 시작'}
        </button>
      </div>

      {pop === 'deload' && (
        <Confirm
          eyebrow={`${th.name} · 디로드`}
          title="오늘은 가볍게 할까요?"
          rows={[
            ['오늘 무게', `${fmt(dl[0].weight)}${u} × ${dl[0].reps} × ${dl.length}`],
            ['기준', `1RM ${fmt(p.oneRM)}${u}의 65%`],
            ['다음 훈련', `${fmt(p.top)}${u} 복귀`],
          ]}
          cta="디로드 시작"
          onCancel={() => setPop(null)}
          onOk={() => {
            setPop(null)
            start(true)
          }}
        />
      )}
      {pop === 'next' && p.stage < 4 && (
        <Confirm
          eyebrow={`${th.name} · 다음 단계`}
          title="다음 단계로 넘어갈까요?"
          rows={[
            ['지금', `${p.stage}단계 ${fmt(p.top)} × ${STAGES[p.stage as 1 | 2 | 3].topReps}`],
            ['다음', nextP.stage === 4 ? '1RM 테스트' : `${nextP.stage}단계 ${fmt(nextP.top)} × ${STAGES[nextP.stage as 1 | 2 | 3].topReps}`],
            ...(nextP.stage === 4 ? [] : ([['백오프', `${fmt(nextP.backoff)}${u}`]] as [string, string][])),
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
          eyebrow={`${th.name} · TEST`}
          title="한계를 시험해 볼까요?"
          rows={[
            ['웜업', `${warmN}세트`],
            ['1차 시도', `${fmt(fa)}${u}`],
            ['지금 1RM', `${fmt(p.oneRM)}${u}`],
          ]}
          cta="TEST 시작"
          onCancel={() => setPop(null)}
          onOk={() => {
            setPop(null)
            go({ name: 'test', lift })
          }}
        />
      )}
      {pop === 'switch' && s.active && (
        <Confirm
          eyebrow={TH[s.active.lift].name}
          title="진행 중인 기록이 있어요"
          rows={[['기록 중', `${TH[s.active.lift].name} ${s.active.sets.filter((r) => r.done).length}세트 완료`]]}
          cta="버리고 시작"
          onCancel={() => setPop(null)}
          onOk={() => {
            cancelWorkout()
            setPop(null)
            startWorkout(lift, false)
            go({ name: 'workout' })
          }}
        />
      )}
      {pop === 'prev' && (
        <Sheet onClose={() => setPop(null)} title="이전 사이클">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prev.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--sub)' }}>아직 끝난 사이클이 없어요</div>}
            {prev.map((t) => (
              <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="num" style={{ fontWeight: 800, fontSize: 16 }}>
                    {md(t.endedCycle as string)} – {md(t.date)}
                  </div>
                  <div className="num" style={{ fontSize: 13, color: th.text, fontWeight: 700 }}>
                    {t.newRM > t.prevRM ? `+${fmt(t.newRM - t.prevRM)}${u} 상승` : '유지'}
                  </div>
                </div>
                <b className="num" style={{ fontSize: 18 }}>
                  {fmt(t.newRM)}
                  {u}
                </b>
              </div>
            ))}
          </div>
          <div style={{ height: 12 }} />
        </Sheet>
      )}
    </div>
  )
}
