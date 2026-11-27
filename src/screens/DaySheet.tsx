import { useState } from 'react'
import { programOf, sessionTag } from '../logic/programs'
import { testResult } from '../logic/program'
import { deleteSession, deleteTest, saveTest } from '../actions'
import type { SessionLog, TestLog } from '../store'
import { step as stepOf, today, useApp } from '../store'
import { TH, chipText, dropsText, chipColors, fmt, rpeText } from '../theme'
import { L, attemptLabel, dayTitle, setsLabel } from '../i18n'
import { Confirm, Sheet } from '../ui'
import type { Go, Route } from '../App'

type Attempt = { weight: number; ok: boolean }

/** 지난 기록 시트: 달력 날짜(그날 전부) 또는 사이클 박스(그 세션 하나) */
export default function DaySheet({ date, sessionId, go, back, onClose }: { date?: string; sessionId?: string; go: Go; back: Route; onClose: () => void }) {
  const s = useApp()
  const u = s.settings.unit
  const S = stepOf(s)
  const [del, setDel] = useState<SessionLog | null>(null)
  const [delTest, setDelTest] = useState<TestLog | null>(null)
  const [editTest, setEditTest] = useState<{ t: TestLog; attempts: Attempt[] } | null>(null)
  const sessions = s.sessions.filter((x) => (sessionId ? x.id === sessionId : x.date === date))
  const day = date ?? sessions[0]?.date
  const tests = sessionId ? [] : s.tests.filter((t) => t.date === day)
  const total = sessions.length + tests.length

  const btn = (label: string, onClick: () => void, primary?: { bg: string; fg: string }) => (
    <button
      onClick={onClick}
      style={primary ? { flex: 1, height: 48, borderRadius: 12, background: primary.bg, color: primary.fg, fontSize: 15, fontWeight: 700 } : { width: 96, flexShrink: 0, height: 48, borderRadius: 12, background: 'var(--fill)', fontSize: 15, fontWeight: 700, color: 'var(--ink2)' }}
    >
      {label}
    </button>
  )

  if (del) {
    return (
      <Confirm
        lift={del.lift}
        eyebrow={`${TH[del.lift].name} · ${dayTitle(del.date)}`}
        title={L('이 기록을 지울까요?', 'Delete this workout?')}
        rows={[
          [L('완료한 세트', 'Sets done'), setsLabel(del.sets.filter((r) => r.done).length)],
          [L('다음 훈련 무게', 'Next weights'), L('그대로', 'Unchanged')],
        ]}
        cta={L('지우기', 'Delete')}
        onCancel={() => setDel(null)}
        onOk={() => {
          deleteSession(del.id)
          setDel(null)
          if (total <= 1) onClose()
        }}
      />
    )
  }

  if (delTest) {
    return (
      <Confirm
        lift={delTest.lift}
        eyebrow={`${TH[delTest.lift].name} · ${dayTitle(delTest.date)}`}
        title={L('이 테스트 기록을 지울까요?', 'Delete this test?')}
        rows={[
          [L('시도', 'Attempts'), String(delTest.attempts.length)],
          [L('지금 1RM', 'Current 1RM'), L('그대로', 'Unchanged')],
        ]}
        cta={L('지우기', 'Delete')}
        onCancel={() => setDelTest(null)}
        onOk={() => {
          deleteTest(delTest.id)
          setDelTest(null)
          if (total <= 1) onClose()
        }}
      />
    )
  }

  if (editTest) {
    const { t, attempts } = editTest
    const th = TH[t.lift]
    const set = (a: Attempt[]) => setEditTest({ t, attempts: a })
    const round = { width: 36, height: 36, borderRadius: 18, border: '1.5px solid var(--line2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as const
    return (
      <Sheet onClose={() => setEditTest(null)} eyebrow={`${th.name} · ${dayTitle(t.date)}`} eyebrowColor={th.text} title={L('테스트 기록 수정', 'Edit test')}>
        <div style={{ background: 'var(--fill2)', borderRadius: 16, padding: '6px 12px', display: 'flex', flexDirection: 'column' }}>
          {attempts.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 52, borderTop: i ? '1px solid var(--line)' : undefined }}>
              <span style={{ width: 64, flexShrink: 0, fontSize: 14, fontWeight: 700, color: 'var(--sub)' }}>{attemptLabel(i + 1)}</span>
              <button style={round} aria-label={L('무게 줄이기', 'Less weight')} onClick={() => set(attempts.map((x, j) => (j === i ? { ...x, weight: Math.max(0, +(x.weight - S).toFixed(2)) } : x)))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <b className="num" style={{ minWidth: 56, textAlign: 'center', fontSize: 16 }}>
                {fmt(a.weight)}
                {u}
              </b>
              <button style={round} aria-label={L('무게 늘리기', 'More weight')} onClick={() => set(attempts.map((x, j) => (j === i ? { ...x, weight: +(x.weight + S).toFixed(2) } : x)))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                onClick={() => set(attempts.map((x, j) => (j === i ? { ...x, ok: !x.ok } : x)))}
                style={{ marginLeft: 'auto', height: 32, padding: '0 12px', borderRadius: 16, fontSize: 13, fontWeight: 800, background: a.ok ? th.acc : 'var(--fill)', color: a.ok ? th.on : 'var(--sub)' }}
              >
                {a.ok ? L('성공', 'Made') : L('실패', 'Missed')}
              </button>
              <button aria-label={L('시도 지우기', 'Remove attempt')} onClick={() => set(attempts.filter((_, j) => j !== i))} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mute)', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const last = attempts[attempts.length - 1]
              set([...attempts, { weight: last ? +(last.weight + S).toFixed(2) : t.prevRM, ok: false }])
            }}
            style={{ minHeight: 48, borderTop: attempts.length ? '1px solid var(--line)' : undefined, fontSize: 14, fontWeight: 700, color: 'var(--sub)' }}
          >
            + {L('시도 추가', 'Add attempt')}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
          <span style={{ fontSize: 14, color: 'var(--sub)' }}>{L('새 1RM', 'New 1RM')}</span>
          <span className="num" style={{ fontSize: 16, fontWeight: 800 }}>
            {fmt(testResult(t.prevRM, attempts))}
            {u}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {btn(L('취소', 'Cancel'), () => setEditTest(null))}
          {btn(
            L('저장', 'Save'),
            () => {
              saveTest(t.id, attempts)
              setEditTest(null)
            },
            { bg: th.acc, fg: th.on },
          )}
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose} title={day ? dayTitle(day) : L('기록', 'Log')}>
      {total === 0 && (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 14, color: 'var(--mute)' }}>
          {day && day > today() ? L('아직 오지 않은 날이에요', 'This day hasn’t come yet') : L('이날은 기록이 없어요', 'Nothing logged this day')}
        </div>
      )}
      {sessions.map((x) => {
        const th = TH[x.lift]
        const done = x.sets.filter((r) => r.done)
        const warm = done.filter((r) => r.type === 'W')
        const work = done.filter((r) => r.type !== 'W')
        const prog = programOf(x.program)
        return (
          <article key={x.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 4px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>
                {th.name} · {sessionTag(x)}
              </span>
              <span style={{ height: 22, padding: '0 8px', borderRadius: 6, background: 'var(--fill)', fontSize: 12, fontWeight: 700, color: 'var(--ink2)', lineHeight: '22px', whiteSpace: 'nowrap' }}>{x.free ? L('자유 운동', 'Free') : prog.name()}</span>
            </div>
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
                const c = chipColors(r.type, x.lift)
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
              {done.length === 0 && <div style={{ minHeight: 36, display: 'flex', alignItems: 'center', fontSize: 14, color: 'var(--mute)' }}>{L('완료한 세트가 없어요', 'No sets done')}</div>}
            </div>
            {x.e1rm !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
                <span style={{ fontSize: 14, color: 'var(--sub)' }}>{L('추정 1RM', 'Est. 1RM')}</span>
                <span className="num" style={{ fontSize: 16, fontWeight: 800 }}>
                  {fmt(x.e1rm)}
                  {u}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {btn(L('삭제', 'Delete'), () => setDel(x))}
              {btn(L('수정', 'Edit'), () => go({ name: 'edit', id: x.id, back }), { bg: th.acc, fg: th.on })}
            </div>
          </article>
        )
      })}
      {tests.map((t) => {
        const th = TH[t.lift]
        return (
          <article key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: th.text, padding: '0 4px' }}>
              {th.name} · {L('1RM 테스트', '1RM test')}
            </span>
            <div style={{ background: 'var(--fill2)', borderRadius: 16, padding: '6px 16px', display: 'flex', flexDirection: 'column' }}>
              {t.attempts.map((a, i) => (
                <div key={i} className="num" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 36, borderTop: i ? '1px solid var(--line)' : undefined, fontSize: 15 }}>
                  <span style={{ color: 'var(--sub)' }}>{attemptLabel(i + 1)}</span>
                  <b>
                    {fmt(a.weight)}
                    {u} · {a.ok ? L('성공', 'Made') : L('실패', 'Missed')}
                  </b>
                </div>
              ))}
              {t.attempts.length === 0 && <div style={{ minHeight: 36, display: 'flex', alignItems: 'center', fontSize: 14, color: 'var(--mute)' }}>{L('시도가 없어요', 'No attempts')}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
              <span style={{ fontSize: 14, color: 'var(--sub)' }}>{L('새 1RM', 'New 1RM')}</span>
              <span className="num" style={{ fontSize: 16, fontWeight: 800 }}>
                {fmt(t.newRM)}
                {u}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {btn(L('삭제', 'Delete'), () => setDelTest(t))}
              {btn(L('수정', 'Edit'), () => setEditTest({ t, attempts: t.attempts.map((a) => ({ ...a })) }), { bg: th.acc, fg: th.on })}
            </div>
          </article>
        )
      })}
      {!sessionId && day && (
        <>
          {day <= today() && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ padding: '0 4px', fontSize: 13, fontWeight: 700, color: 'var(--sub)' }}>{L('운동 기록 추가', 'Add a workout')}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {(['B', 'D', 'S'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      onClose()
                      go({ name: 'add', date: day, lift: k, back })
                    }}
                    aria-label={L(`${TH[k].name} 기록 추가`, `Add ${TH[k].name}`)}
                    style={{ height: 52, borderRadius: 12, background: TH[k].acc, color: TH[k].on, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 900 }}>+</span> {TH[k].tab}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Sheet>
  )
}
