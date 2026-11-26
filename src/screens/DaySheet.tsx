import { useState } from 'react'
import { STAGES } from '../logic/program'
import { deleteSession } from '../actions'
import type { SessionLog } from '../store'
import { useApp } from '../store'
import { TH, chipColors, fmt } from '../theme'
import { Confirm, Sheet } from '../ui'
import type { Go, Route } from '../App'

const dayTitle = (d: string) => {
  const t = new Date(d + 'T12:00:00')
  return `${t.getMonth() + 1}월 ${t.getDate()}일 (${'일월화수목금토'[t.getDay()]})`
}

/** 지난 기록 시트: 달력 날짜(그날 전부) 또는 사이클 박스(그 세션 하나) */
export default function DaySheet({ date, sessionId, go, back, onClose }: { date?: string; sessionId?: string; go: Go; back: Route; onClose: () => void }) {
  const s = useApp()
  const u = s.settings.unit
  const [del, setDel] = useState<SessionLog | null>(null)
  const sessions = s.sessions.filter((x) => (sessionId ? x.id === sessionId : x.date === date))
  const day = date ?? sessions[0]?.date
  const tests = sessionId ? [] : s.tests.filter((t) => t.date === day)

  if (del) {
    const th = TH[del.lift]
    return (
      <Confirm
        lift={del.lift}
        eyebrow={`${th.name} · ${dayTitle(del.date)}`}
        title="이 기록을 지울까요?"
        rows={[
          ['완료한 세트', `${del.sets.filter((r) => r.done).length}세트`],
          ['다음 훈련 무게', '그대로'],
        ]}
        cta="지우기"
        onCancel={() => setDel(null)}
        onOk={() => {
          deleteSession(del.id)
          setDel(null)
          if (sessions.length + tests.length <= 1) onClose()
        }}
      />
    )
  }

  return (
    <Sheet onClose={onClose} title={day ? dayTitle(day) : '기록'}>
      {sessions.length === 0 && tests.length === 0 && <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 14, color: 'var(--mute)' }}>이날은 기록이 없어요</div>}
      {sessions.map((x) => {
        const th = TH[x.lift]
        const done = x.sets.filter((r) => r.done)
        const warm = done.filter((r) => r.type === 'W')
        const work = done.filter((r) => r.type !== 'W')
        const st = Math.min(3, x.stage) as 1 | 2 | 3
        return (
          <article key={x.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: th.text, padding: '0 4px' }}>
              {th.name} · {x.deload ? '디로드' : `${x.stage}단계 ${STAGES[st].topReps}회 탑`}
            </span>
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
                const c = chipColors(r.type, x.lift)
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
              {done.length === 0 && <div style={{ minHeight: 36, display: 'flex', alignItems: 'center', fontSize: 14, color: 'var(--mute)' }}>완료한 세트가 없어요</div>}
            </div>
            {x.e1rm !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
                <span style={{ fontSize: 14, color: 'var(--sub)' }}>추정 1RM</span>
                <span className="num" style={{ fontSize: 16, fontWeight: 800 }}>
                  {fmt(x.e1rm)}
                  {u}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDel(x)} style={{ width: 96, flexShrink: 0, height: 48, borderRadius: 12, background: 'var(--fill)', fontSize: 15, fontWeight: 700, color: 'var(--ink2)' }}>
                삭제
              </button>
              <button onClick={() => go({ name: 'edit', id: x.id, back })} style={{ flex: 1, height: 48, borderRadius: 12, background: th.acc, color: th.on, fontSize: 15, fontWeight: 700 }}>
                수정
              </button>
            </div>
          </article>
        )
      })}
      {tests.map((t) => {
        const th = TH[t.lift]
        return (
          <article key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: th.text, padding: '0 4px' }}>{th.name} · 1RM 테스트</span>
            <div style={{ background: 'var(--fill2)', borderRadius: 16, padding: '6px 16px', display: 'flex', flexDirection: 'column' }}>
              {t.attempts.map((a, i) => (
                <div key={i} className="num" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 36, borderTop: i ? '1px solid var(--line)' : undefined, fontSize: 15 }}>
                  <span style={{ color: 'var(--sub)' }}>{i + 1}차 시도</span>
                  <b>
                    {fmt(a.weight)}
                    {u} · {a.ok ? '성공' : '실패'}
                  </b>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
              <span style={{ fontSize: 14, color: 'var(--sub)' }}>새 1RM</span>
              <span className="num" style={{ fontSize: 16, fontWeight: 800 }}>
                {fmt(t.newRM)}
                {u}
              </span>
            </div>
          </article>
        )
      })}
    </Sheet>
  )
}
