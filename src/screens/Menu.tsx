import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LiftKey, Unit } from '../logic/program'
import { backupJson, changeUnit, parseBackup, restoreBackup, setOneRM } from '../actions'
import { AddGearSheet, DialSet, GearGrid, PlatePicker } from '../dial'
import type { AppState } from '../store'
import { GEAR, allGear, resetAll, setState, today, useApp } from '../store'
import { CARD_ORDER, fmt, md } from '../theme'
import { Confirm, SegToggle, Sheet } from '../ui'
import type { Go } from '../App'

type Pop = null | 'rm' | 'goal' | 'plate' | 'bar' | 'gear' | 'addGear' | 'reset' | 'restore' | 'badFile'

function Row({ label, value, onClick, color }: { label: string; value: ReactNode; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} style={{ width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 16, color: color ?? 'var(--ink)', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>
      <span className="num" style={{ fontSize: 14, color: 'var(--sub)', textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </button>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: 'var(--surface)', padding: '8px 20px' }}>
      <h2 style={{ margin: '8px 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--mute)' }}>{title}</h2>
      {children}
    </section>
  )
}

const saveBtn = { height: 56, borderRadius: 14, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 17, fontWeight: 700 } as const

export default function Menu({ go }: { go: Go }) {
  const s = useApp()
  const st = s.settings
  const u = st.unit
  const [pop, setPop] = useState<Pop>(null)
  const [backup, setBackup] = useState<{ data: AppState; exportedAt: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /** 백업 파일을 만들어 공유창(파일에 저장·카톡 등)으로 보낸다 */
  const exportBackup = async () => {
    const name = `stlog-백업-${today()}.json`
    const file = new File([backupJson()], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'ST LOG 백업' })
        setState((x) => ({ ...x, settings: { ...x.settings, lastBackup: today() } }))
        return
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    // 공유창이 없으면 파일로 내려받기
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setState((x) => ({ ...x, settings: { ...x.settings, lastBackup: today() } }))
  }

  const pickFile = async (f: File | undefined) => {
    if (!f) return
    const b = parseBackup(await f.text())
    if (fileRef.current) fileRef.current.value = ''
    if (!b) return setPop('badFile')
    setBackup(b)
    setPop('restore')
  }
  const [rm, setRm] = useState<Record<LiftKey, number>>({ B: s.lifts.B.oneRM, D: s.lifts.D.oneRM, S: s.lifts.S.oneRM })
  const [goal, setGoal] = useState(st.goal)
  const [plate, setPlate] = useState(st.minPlate)
  const [bar, setBar] = useState(st.bar)
  const [gear, setGear] = useState(st.gear)
  const [deleting, setDeleting] = useState(false)
  const set = (p: Partial<typeof st>) => setState((x) => ({ ...x, settings: { ...x.settings, ...p } }))
  const open = (p: Pop) => {
    setRm({ B: s.lifts.B.oneRM, D: s.lifts.D.oneRM, S: s.lifts.S.oneRM })
    setGoal(st.goal)
    setPlate(st.minPlate)
    setBar(st.bar)
    setGear(st.gear)
    setDeleting(false)
    setPop(p)
  }
  const trio = (o: Record<LiftKey, number>) => `${CARD_ORDER.map((k) => fmt(o[k])).join(' · ')} ${u} ›`

  return (
    <div className="screen" style={{ background: 'var(--page2)', paddingTop: 0 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(var(--safe-top) + 16px) 12px 8px 20px', background: 'var(--surface)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>설정</h1>
        <button aria-label="닫기" onClick={() => go({ name: 'home' })} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0 var(--safe-bot)' }}>
        <Section title="내 기록">
          <Row label="1RM 설정" value={trio({ B: s.lifts.B.oneRM, D: s.lifts.D.oneRM, S: s.lifts.S.oneRM })} onClick={() => open('rm')} />
          <Row label="목표 중량" value={trio(st.goal)} onClick={() => open('goal')} />
          <Row label="백업 내보내기" value={st.lastBackup ? `마지막 ${md(st.lastBackup)} ›` : '›'} onClick={exportBackup} />
          <Row label="백업 불러오기" value="›" onClick={() => fileRef.current?.click()} />
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files?.[0])} />
        </Section>
        <Section title="운동 환경">
          <Row label="원판 최소 단위" value={`${st.minPlate} ${u} ›`} onClick={() => open('plate')} />
          <Row label="바 무게" value={`${fmt(st.bar)} ${u} ›`} onClick={() => open('bar')} />
          <Row label="장비 설정" value={`${st.gear.length ? st.gear.join(' · ') : '없음'} ›`} onClick={() => open('gear')} />
          <div style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 16 }}>단위</span>
            <SegToggle options={['kg', 'lb'] as Unit[]} value={u} onChange={(v) => changeUnit(v)} minWidth={52} height={38} />
          </div>
          <div style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 16, whiteSpace: 'nowrap' }}>쉬는 시간 알림음</span>
            <SegToggle options={['켬', '끔']} value={st.sound === false ? '끔' : '켬'} onChange={(v) => set({ sound: v === '켬' })} minWidth={52} height={38} />
          </div>
        </Section>
        <Section title="앱">
          <div style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 16 }}>테마</span>
            <SegToggle
              options={['라이트', '다크', '시스템']}
              value={({ light: '라이트', dark: '다크', system: '시스템' } as const)[st.theme ?? 'light']}
              onChange={(v) => set({ theme: v === '라이트' ? 'light' : v === '다크' ? 'dark' : 'system', themeChosen: true })}
              minWidth={52}
              height={38}
            />
          </div>
          <div style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 16 }}>언어</span>
            <span style={{ fontSize: 14, color: 'var(--sub)' }}>한국어</span>
          </div>
          <Row label="사용법 보기" value="›" onClick={() => go({ name: 'tutorial', back: 'menu' })} />
          <Row label="모든 기록 지우기" value="›" onClick={() => setPop('reset')} color="#D92B3A" />
        </Section>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--faint)', padding: '4px 0' }}>ST LOG v0.3</div>
      </main>

      {pop === 'rm' && (
        <Sheet onClose={() => setPop(null)} title="1RM 설정" gap={20}>
          <DialSet vals={rm} unit={u} onChange={setRm} />
          <button
            style={saveBtn}
            onClick={() => {
              CARD_ORDER.forEach((k) => rm[k] !== s.lifts[k].oneRM && setOneRM(k, rm[k]))
              setPop(null)
            }}
          >
            저장
          </button>
        </Sheet>
      )}
      {pop === 'goal' && (
        <Sheet onClose={() => setPop(null)} title="목표 중량" gap={20}>
          <DialSet vals={goal} unit={u} onChange={setGoal} />
          <button
            style={saveBtn}
            onClick={() => {
              set({ goal })
              setPop(null)
            }}
          >
            저장
          </button>
        </Sheet>
      )}
      {pop === 'plate' && (
        <Sheet onClose={() => setPop(null)} title="원판 최소 단위" gap={20}>
          <PlatePicker value={plate} unit={u} onChange={setPlate} />
          <div style={{ background: 'var(--fill2)', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 700 }}>
            한 번에 {plate * 2}
            {u}씩 올려요
          </div>
          <button
            style={saveBtn}
            onClick={() => {
              set({ minPlate: plate })
              setPop(null)
            }}
          >
            저장
          </button>
        </Sheet>
      )}
      {pop === 'bar' && (
        <Sheet onClose={() => setPop(null)} title="바 무게" gap={20}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 12 }}>
            {[-5, 5].map((d, i) => (
              <button
                key={d}
                aria-label={d < 0 ? '바 무게 줄이기' : '바 무게 늘리기'}
                onClick={() => setBar(Math.max(0, bar + d))}
                style={{ order: i ? 2 : 0, width: 56, height: 56, borderRadius: 28, border: '1.5px solid var(--line2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d={d < 0 ? 'M5 12h14' : 'M12 5v14M5 12h14'} />
                </svg>
              </button>
            ))}
            <div style={{ order: 1, width: 150, height: 96, borderRadius: 18, border: '2px solid var(--ink)', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
              <span className="num" style={{ fontSize: 44, fontWeight: 800, lineHeight: '92px' }}>
                {fmt(bar)}
              </span>
              <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--sub)' }}>{u}</span>
            </div>
          </div>
          <button
            style={saveBtn}
            onClick={() => {
              set({ bar })
              setPop(null)
            }}
          >
            저장
          </button>
        </Sheet>
      )}
      {pop === 'gear' && (
        <Sheet onClose={() => setPop(null)} gap={20}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>장비 설정</h2>
            <button onClick={() => setDeleting(!deleting)} style={{ height: 36, padding: '0 12px', borderRadius: 10, background: 'var(--fill)', fontSize: 14, fontWeight: 700, color: deleting ? 'var(--ink)' : '#D92B3A' }}>
              {deleting ? '완료' : '삭제'}
            </button>
          </div>
          <GearGrid
            all={allGear(st)}
            sel={gear}
            deleting={deleting}
            onToggle={(g) => setGear(gear.includes(g) ? gear.filter((x) => x !== g) : [...gear, g])}
            onAdd={() => setPop('addGear')}
            onDelete={(g) => {
              setGear(gear.filter((x) => x !== g))
              set({
                gear: st.gear.filter((x) => x !== g),
                customGear: st.customGear.filter((x) => x !== g),
                removedGear: GEAR.includes(g) ? [...(st.removedGear ?? []), g] : st.removedGear,
              })
            }}
          />
          {!deleting && (
            <button
              style={saveBtn}
              onClick={() => {
                set({ gear })
                setPop(null)
              }}
            >
              저장
            </button>
          )}
        </Sheet>
      )}
      {pop === 'addGear' && (
        <AddGearSheet
          onClose={() => setPop('gear')}
          onAdd={(n) => {
            if (GEAR.includes(n)) set({ removedGear: (st.removedGear ?? []).filter((x) => x !== n) })
            else if (!st.customGear.includes(n)) set({ customGear: [...st.customGear, n] })
            if (!gear.includes(n)) setGear([...gear, n])
            setPop('gear')
          }}
        />
      )}
      {pop === 'restore' && backup && (
        <Confirm
          eyebrow="백업 불러오기"
          title="이 백업으로 바꿀까요?"
          rows={[
            ['백업 날짜', backup.exportedAt ? md(backup.exportedAt.slice(0, 10)) : '모름'],
            ['훈련 기록', `${backup.data.sessions.length}회`],
            ['1RM 테스트', `${backup.data.tests?.length ?? 0}회`],
            ['지금 기록', `${s.sessions.length}회는 지워져요`],
          ]}
          cta="덮어쓰기"
          onCancel={() => setPop(null)}
          onOk={() => {
            restoreBackup(backup.data)
            setBackup(null)
            setPop(null)
            go({ name: 'home' })
          }}
        />
      )}
      {pop === 'badFile' && (
        <Sheet onClose={() => setPop(null)} title="ST LOG 백업 파일이 아니에요">
          <button style={saveBtn} onClick={() => setPop(null)}>
            확인
          </button>
        </Sheet>
      )}
      {pop === 'reset' && (
        <Confirm
          eyebrow="설정"
          title="모든 기록을 지울까요?"
          rows={[
            ['훈련 기록', `${s.sessions.length}회`],
            ['1RM 테스트', `${s.tests.length}회`],
          ]}
          cta="지우기"
          onCancel={() => setPop(null)}
          onOk={() => {
            resetAll()
            setPop(null)
          }}
        />
      )}
    </div>
  )
}
