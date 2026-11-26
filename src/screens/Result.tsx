import { STAGES } from '../logic/program'
import { useApp } from '../store'
import { TH, fmt } from '../theme'
import { I, Icon, themeVars } from '../ui'
import type { Go } from '../App'

const chg = (n: number, u: string) => (n > 0 ? `+${fmt(n)}${u}` : n < 0 ? `−${fmt(-n)}${u}` : '유지')

export default function Result({ id, go }: { id: string; go: Go }) {
  const s = useApp()
  const log = s.sessions.find((x) => x.id === id)
  if (!log) return null
  const th = TH[log.lift]
  const u = s.settings.unit
  const done = log.sets.filter((r) => r.done)
  const warm = done.filter((r) => r.type === 'W')
  const work = done.filter((r) => r.type !== 'W')
  const best = Math.max(0, ...s.sessions.filter((x) => x.lift === log.lift && x.e1rm).map((x) => x.e1rm as number))
  const n = log.next
  const nextStage = n?.stage ?? s.lifts[log.lift].stage
  const d = new Date(log.date + 'T12:00:00')

  return (
    <div className="screen" style={themeVars(log.lift)}>
      <div className="scroll pad" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 24, paddingBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <span style={{ width: 64, height: 64, borderRadius: 32, background: th.acc, color: th.on, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={I.check} size={32} w={3} />
          </span>
          <h1 className="h-xl">훈련 완료!</h1>
          <span className="num" style={{ fontSize: 14, color: 'var(--sub)' }}>
            {th.name} · {d.getMonth() + 1}월 {d.getDate()}일 · {log.deload ? '디로드' : `${log.stage}단계`}
          </span>
        </div>

        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>오늘 기록</h2>
          {warm.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span className="chip" style={{ background: 'var(--fill)', color: 'var(--sub)', width: 28, height: 28, fontSize: 12 }}>
                W
              </span>
              <span className="num" style={{ color: 'var(--sub)' }}>
                웜업 {warm.length}세트 · {warm.map((r) => fmt(r.weight)).join(' · ')}
              </span>
            </div>
          )}
          {work.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
              <span className="chip" style={{ background: th.tint, color: th.deep, width: 28, height: 28, fontSize: 12 }}>
                {r.type}
              </span>
              <b className="num" style={{ flex: 1 }}>
                {fmt(r.weight)}
                {u} × {r.reps}
              </b>
              {r.rpe !== undefined && (
                <span className="num" style={{ fontSize: 13, fontWeight: 700, color: th.text }}>
                  {r.rpe === 'fail' ? '실패' : `RPE ${r.rpe}`}
                </span>
              )}
            </div>
          ))}
          <div className="divider" />
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div className="label">오늘 추정 1RM</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 800 }}>
                {log.e1rm ? `${fmt(log.e1rm)}${u}` : '–'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="label">최고</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 800 }}>
                {best ? `${fmt(best)}${u}` : '–'}
              </div>
            </div>
          </div>
        </section>

        <section style={{ borderRadius: 16, border: `2px solid ${th.acc}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>다음 훈련</h2>
          {nextStage === 4 ? (
            <div style={{ fontSize: 20, fontWeight: 800, color: th.text }}>1RM 테스트</div>
          ) : n ? (
            [
              ['T', `${fmt(n.top)}${u} × ${STAGES[nextStage as 1 | 2 | 3].topReps}`, n.advanced ? `${nextStage}단계` : chg(n.topChange, u)],
              ['B', `${fmt(n.backoff)}${u}`, n.advanced ? `${nextStage}단계` : chg(n.boChange, u)],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="chip" style={{ background: k === 'T' ? th.acc : '#fff', color: k === 'T' ? th.on : th.deep, boxShadow: k === 'T' ? undefined : `inset 0 0 0 1.5px ${th.acc}` }}>
                  {k}
                </span>
                <b className="num" style={{ flex: 1, fontSize: 18 }}>
                  {v}
                </b>
                <span className="num" style={{ height: 28, padding: '0 10px', borderRadius: 14, background: th.tint, color: th.deep, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                  {c}
                </span>
              </div>
            ))
          ) : (
            <div className="num" style={{ fontSize: 18, fontWeight: 800 }}>
              {fmt(s.lifts[log.lift].top)}
              {u} × {STAGES[s.lifts[log.lift].stage as 1 | 2 | 3]?.topReps}
            </div>
          )}
        </section>
      </div>
      <div className="bottom">
        <button className="btn btn-acc" onClick={() => go({ name: 'lift', lift: log.lift })}>
          확인
        </button>
      </div>
    </div>
  )
}
