import { L, setsLabel } from '../i18n'
import { atTest, groupSets, phaseChip, sessionTag } from '../logic/programs'
import { progOf, step as stepOf, useApp } from '../store'
import { ETC_TH, TH, chipText, dropsText, chipColors, fmt, md, rpeText } from '../theme'
import { startEtc } from '../actions'
import type { Go } from '../App'

const chip = (n: number, u: string) => (n > 0 ? `+${fmt(n)}${u}` : n < 0 ? `−${fmt(-n)}${u}` : L('유지', 'Same'))

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
  const meta = `${th.name} · ${md(log.date)} · ${sessionTag(log)}`

  // 다음 훈련 줄: 탑세트 · 백오프
  const p = s.lifts[lift]
  const n = log.next
  let next: { k: string; what: string; chip: string }[]
  const prog = progOf(s)
  const stageChip = n?.newCycle ? L('새 사이클', 'New cycle') : phaseChip(prog, lift, p.stage)
  if (atTest(prog, p)) next = [{ k: 'T', what: L('1RM 테스트', '1RM test'), chip: 'TEST' }]
  else {
    next = groupSets(prog.sets(lift, p, stepOf(s))).map((x, i) => ({
      k: x.type,
      what: `${fmt(x.weight)}${u} × ${x.reps}${x.type === 'A' ? '+' : ''}${x.count > 1 ? ` × ${x.count}` : ''}`,
      chip:
        i === 0
          ? n
            ? n.advanced
              ? stageChip
              : chip(n.topChange, u)
            : L('유지', 'Same')
          : prog.id === 'stlog' && x.type === 'B'
            ? n
              ? n.advanced
                ? stageChip
                : chip(n.boChange, u)
              : L('유지', 'Same')
            : '',
    }))
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
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{L('훈련 완료!', 'Workout done!')}</h1>
          <span className="num" style={{ fontSize: 14, color: 'var(--sub)' }}>
            {meta}
          </span>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>{L('오늘 기록', 'Today')}</h2>
          <div style={{ background: 'var(--fill2)', borderRadius: 16, padding: '6px 16px', display: 'flex', flexDirection: 'column' }}>
            {warm.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36 }}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--fill)', color: 'var(--sub)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>W</span>
                <span className="num" style={{ flex: 1, fontSize: 14, color: 'var(--sub)' }}>
                  {L('웜업', 'Warm-up')} {setsLabel(warm.length)} · {warm.map((r) => fmt(r.weight)).join(' · ')}
                  {u}
                </span>
              </div>
            )}
            {work.map((r, i) => {
              const c = chipColors(r.type, lift)
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, borderTop: warm.length || i ? '1px solid var(--line)' : undefined }}>
                  <span style={{ width: 28, height: 28, borderRadius: 7, background: c.bg, color: c.fg, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{chipText(r, work)}</span>
                  <span className="num" style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>
                    {fmt(r.weight)}
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--sub)' }}>{u}</span> × {r.reps}
                      {dropsText(r)}
                  </span>
                  {(r.rpe !== undefined || (r.type === 'S' && r.got !== undefined)) && (
                    <span className="num" style={{ fontSize: 13, fontWeight: 700, color: th.deep }}>
                      {rpeText(r)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {log.e1rm !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
              <span style={{ fontSize: 14, color: 'var(--sub)' }}>{L('오늘 추정 1RM', 'Est. 1RM today')}</span>
              <span className="num" style={{ fontSize: 18, fontWeight: 800 }}>
                {fmt(log.e1rm)}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{u}</span>{' '}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>
                  · {L('최고', 'Best')} {fmt(best)}
                  {u}
                </span>
              </span>
            </div>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>{L('다음 훈련', 'Next workout')}</h2>
          <div style={{ borderRadius: 16, background: th.tint, border: `2px solid ${th.line}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {next.map((x, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: x.k === 'T' ? th.acc : 'var(--surface)', color: x.k === 'T' ? th.on : th.deep, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{x.k}</span>
                <span className="num" style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>
                  {x.what}
                </span>
                {x.chip && (
                  <span className="num" style={{ fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: th.acc, color: th.on }}>
                    {x.chip}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
      <div style={{ padding: '12px 20px var(--safe-bot)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => {
            // 운동 시간은 3대 훈련 시작부터 이어서
            startEtc(log.start)
            go({ name: 'etcLobby' })
          }}
          style={{ width: '100%', height: 56, borderRadius: 14, background: ETC_TH.acc, color: ETC_TH.on, fontSize: 17, fontWeight: 700 }}
        >
          {L('이어서 자유 훈련하기', 'Continue with free training')}
        </button>
        <button onClick={() => go({ name: 'home' })} style={{ width: '100%', height: 56, borderRadius: 14, background: th.acc, color: th.on, fontSize: 17, fontWeight: 700 }}>
          {L('훈련 종료하기', 'Finish')}
        </button>
      </div>
    </div>
  )
}
