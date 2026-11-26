import { STAGES } from '../logic/program'
import { useApp } from '../store'
import { TH, chipColors, fmt, md } from '../theme'
import type { Go } from '../App'

const chip = (n: number, u: string) => (n > 0 ? `+${fmt(n)}${u}` : n < 0 ? `−${fmt(-n)}${u}` : '유지')

export default function Result({ id, go }: { id: string; go: Go }) {
  const s = useApp()
  const log = s.sessions.find((x) => x.id === id)
  if (!log) return null
  const lift = log.lift
  const th = TH[lift]
  const u = s.settings.unit
  const done = log.sets.filter((r) => r.done)
  const warm = done.filter((r) => r.type === 'W')
  const work = done.filter((r) => r.type !== 'W')
  const best = Math.max(0, ...s.sessions.filter((x) => x.lift === lift && x.e1rm).map((x) => x.e1rm as number))
  const stage3 = Math.min(3, log.stage) as 1 | 2 | 3
  const meta = log.deload ? `${th.name} · ${md(log.date)} · 디로드` : `${th.name} · ${md(log.date)} · ${log.stage}단계 ${STAGES[stage3].topReps}회 탑`

  // 다음 훈련 줄: 탑세트 · 백오프
  const p = s.lifts[lift]
  const n = log.next
  let next: { k: string; what: string; chip: string }[]
  if (p.stage === 4) next = [{ k: 'T', what: '1RM 테스트', chip: 'TEST' }]
  else {
    const c = STAGES[p.stage]
    next = [
      { k: 'T', what: `${fmt(p.top)}${u} × ${c.topReps}`, chip: n ? (n.advanced ? `${p.stage}단계` : chip(n.topChange, u)) : '유지' },
      { k: 'B', what: `${fmt(p.backoff)}${u} × ${c.boReps[lift]} × ${c.boSets}`, chip: n ? (n.advanced ? `${p.stage}단계` : chip(n.boChange, u)) : '유지' },
    ]
  }

  return (
    <div className="screen">
      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <span style={{ width: 48, height: 48, borderRadius: 24, background: th.acc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={th.on} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>훈련 완료!</h1>
          <span className="num" style={{ fontSize: 14, color: 'var(--sub)' }}>
            {meta}
          </span>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>오늘 기록</h2>
          <div style={{ background: 'var(--fill2)', borderRadius: 16, padding: '6px 16px', display: 'flex', flexDirection: 'column' }}>
            {warm.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36 }}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--fill)', color: 'var(--sub)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>W</span>
                <span className="num" style={{ flex: 1, fontSize: 14, color: 'var(--sub)' }}>
                  웜업 {warm.length}세트 · {warm.map((r) => fmt(r.weight)).join(' · ')}
                  {u}
                </span>
              </div>
            )}
            {work.map((r, i) => {
              const c = chipColors(r.type, lift)
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, borderTop: warm.length || i ? '1px solid var(--line)' : undefined }}>
                  <span style={{ width: 28, height: 28, borderRadius: 7, background: c.bg, color: c.fg, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.type}</span>
                  <span className="num" style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>
                    {fmt(r.weight)}
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--sub)' }}>{u}</span> × {r.reps}
                  </span>
                  {r.rpe !== undefined && (
                    <span className="num" style={{ fontSize: 13, fontWeight: 700, color: th.deep }}>
                      {r.rpe === 'fail' ? '실패' : `RPE ${r.rpe}`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {log.e1rm !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
              <span style={{ fontSize: 14, color: 'var(--sub)' }}>오늘 추정 1RM</span>
              <span className="num" style={{ fontSize: 18, fontWeight: 800 }}>
                {fmt(log.e1rm)}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{u}</span>{' '}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>
                  · 최고 {fmt(best)}
                  {u}
                </span>
              </span>
            </div>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>다음 훈련</h2>
          <div style={{ borderRadius: 16, background: th.tint, border: `2px solid ${th.line}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {next.map((x) => (
              <div key={x.k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: x.k === 'T' ? th.acc : 'var(--surface)', color: x.k === 'T' ? th.on : th.deep, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{x.k}</span>
                <span className="num" style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>
                  {x.what}
                </span>
                <span className="num" style={{ fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: th.acc, color: th.on }}>
                  {x.chip}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <div style={{ padding: '12px 20px var(--safe-bot)' }}>
        <button onClick={() => go({ name: 'lift', lift })} style={{ width: '100%', height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700 }}>
          확인
        </button>
      </div>
    </div>
  )
}
