import { L, getLang, timesLabel } from '../i18n'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LiftKey, Unit } from '../logic/program'
import { backupJson, changeUnit, parseBackup, restoreBackup, setOneRM } from '../actions'
import { AddGearSheet, DialSet, GearGrid, PlatePicker } from '../dial'
import type { AppState } from '../store'
import { GEAR, allGear, resetAll, setState, today, useApp } from '../store'
import { CARD_ORDER, fmt, gearName, md } from '../theme'
import { Confirm, SegToggle, Sheet } from '../ui'
import type { Go } from '../App'

type Pop = null | 'rm' | 'goal' | 'plate' | 'bar' | 'gear' | 'addGear' | 'reset' | 'restore' | 'badFile' | 'account'

/** 피드백을 받을 인스타그램 계정 */
const FEEDBACK_IG = 'pharmaco_lifting_stlog'

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
    const name = `${L('stlog-백업', 'stlog-backup')}-${today()}.json`
    const file = new File([backupJson()], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: L('ST LOG 백업', 'ST LOG backup') })
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
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>{L('설정', 'Settings')}</h1>
        <button aria-label={L('닫기', 'Close')} onClick={() => go({ name: 'home' })} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0 var(--safe-bot)' }}>
        <Section title={L('내 기록', 'My records')}>
          <Row label={L('1RM 설정', '1RM')} value={trio({ B: s.lifts.B.oneRM, D: s.lifts.D.oneRM, S: s.lifts.S.oneRM })} onClick={() => open('rm')} />
          <Row label={L('목표 중량', 'Goals')} value={trio(st.goal)} onClick={() => open('goal')} />
          <Row label={L('백업 내보내기', 'Export backup')} value={st.lastBackup ? `${L('마지막', 'Last')} ${md(st.lastBackup)} ›` : '›'} onClick={exportBackup} />
          <Row label={L('백업 불러오기', 'Import backup')} value="›" onClick={() => fileRef.current?.click()} />
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files?.[0])} />
        </Section>
        <Section title={L('운동 환경', 'Training')}>
          <Row label={L('원판 최소 단위', 'Smallest plate')} value={`${st.minPlate} ${u} ›`} onClick={() => open('plate')} />
          <Row label={L('바 무게', 'Bar weight')} value={`${fmt(st.bar)} ${u} ›`} onClick={() => open('bar')} />
          <Row label={L('장비 설정', 'Gear')} value={`${st.gear.length ? st.gear.map(gearName).join(' · ') : L('없음', 'None')} ›`} onClick={() => open('gear')} />
          <div style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 16 }}>{L('단위', 'Units')}</span>
            <SegToggle options={['kg', 'lb'] as Unit[]} value={u} onChange={(v) => changeUnit(v)} minWidth={52} height={38} />
          </div>
          <div style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 16, whiteSpace: 'nowrap' }}>{L('쉬는 시간 알림음', 'Rest timer sound')}</span>
            <SegToggle options={[L('켬', 'On'), L('끔', 'Off')]} value={st.sound === false ? L('끔', 'Off') : L('켬', 'On')} onChange={(v) => set({ sound: v === L('켬', 'On') })} minWidth={52} height={38} />
          </div>
        </Section>
        <Section title={L('앱', 'App')}>
          <div style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 16 }}>{L('테마', 'Theme')}</span>
            <SegToggle
              options={[L('라이트', 'Light'), L('다크', 'Dark'), L('시스템', 'System')]}
              value={{ light: L('라이트', 'Light'), dark: L('다크', 'Dark'), system: L('시스템', 'System') }[st.theme ?? 'system']}
              onChange={(v) => set({ theme: v === L('라이트', 'Light') ? 'light' : v === L('다크', 'Dark') ? 'dark' : 'system', themeChosen: true })}
              minWidth={52}
              height={38}
            />
          </div>
          <div style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 16 }}>{L('언어', 'Language')}</span>
            <SegToggle options={['한국어', 'English']} value={getLang() === 'en' ? 'English' : '한국어'} onChange={(v) => set({ lang: v === 'English' ? 'en' : 'ko' })} minWidth={52} height={38} />
          </div>
          <Row label={L('사용법 보기', 'How to use')} value="›" onClick={() => go({ name: 'tutorial', back: 'menu' })} />
          <Row label={L('제작자에게 피드백', 'Send feedback')} value={`@${FEEDBACK_IG} ›`} onClick={() => window.open(`https://ig.me/m/${FEEDBACK_IG}`, '_blank')} />
          <Row label={L('계정', 'Account')} value={`${L('로그인 준비 중', 'Sign-in coming soon')} ›`} onClick={() => setPop('account')} />
          <Row label={L('모든 기록 지우기', 'Erase all data')} value="›" onClick={() => setPop('reset')} color="#D92B3A" />
        </Section>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--faint)', padding: '4px 0' }}>ST LOG v0.3</div>
      </main>

      {pop === 'rm' && (
        <Sheet onClose={() => setPop(null)} title={L('1RM 설정', '1RM')} gap={20}>
          <DialSet vals={rm} unit={u} onChange={setRm} />
          <button
            style={saveBtn}
            onClick={() => {
              CARD_ORDER.forEach((k) => rm[k] !== s.lifts[k].oneRM && setOneRM(k, rm[k]))
              setPop(null)
            }}
          >
            {L('저장', 'Save')}
          </button>
        </Sheet>
      )}
      {pop === 'goal' && (
        <Sheet onClose={() => setPop(null)} title={L('목표 중량', 'Goals')} gap={20}>
          <DialSet vals={goal} unit={u} onChange={setGoal} />
          <button
            style={saveBtn}
            onClick={() => {
              set({ goal })
              setPop(null)
            }}
          >
            {L('저장', 'Save')}
          </button>
        </Sheet>
      )}
      {pop === 'plate' && (
        <Sheet onClose={() => setPop(null)} title={L('원판 최소 단위', 'Smallest plate')} gap={20}>
          <PlatePicker value={plate} unit={u} onChange={setPlate} />
          <div style={{ background: 'var(--fill2)', borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 700 }}>
            {L(`한 번에 ${plate * 2}${u}씩 올려요`, `Weights go up by ${plate * 2}${u}`)}
          </div>
          <button
            style={saveBtn}
            onClick={() => {
              set({ minPlate: plate })
              setPop(null)
            }}
          >
            {L('저장', 'Save')}
          </button>
        </Sheet>
      )}
      {pop === 'bar' && (
        <Sheet onClose={() => setPop(null)} title={L('바 무게', 'Bar weight')} gap={20}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 12 }}>
            {[-5, 5].map((d, i) => (
              <button
                key={d}
                aria-label={d < 0 ? L('바 무게 줄이기', 'Lighter bar') : L('바 무게 늘리기', 'Heavier bar')}
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
            {L('저장', 'Save')}
          </button>
        </Sheet>
      )}
      {pop === 'gear' && (
        <Sheet onClose={() => setPop(null)} gap={20}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>{L('장비 설정', 'Gear')}</h2>
            <button onClick={() => setDeleting(!deleting)} style={{ height: 36, padding: '0 12px', borderRadius: 10, background: 'var(--fill)', fontSize: 14, fontWeight: 700, color: deleting ? 'var(--ink)' : '#D92B3A' }}>
              {deleting ? L('완료', 'Done') : L('삭제', 'Delete')}
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
              {L('저장', 'Save')}
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
          eyebrow={L('백업 불러오기', 'Import backup')}
          title={L('이 백업으로 바꿀까요?', 'Replace with this backup?')}
          rows={[
            [L('백업 날짜', 'Backup date'), backup.exportedAt ? md(backup.exportedAt.slice(0, 10)) : '–'],
            [L('훈련 기록', 'Workouts'), timesLabel(backup.data.sessions.length)],
            [L('1RM 테스트', '1RM tests'), timesLabel(backup.data.tests?.length ?? 0)],
            [L('지금 기록', 'Current data'), L(`${s.sessions.length}회는 지워져요`, `${s.sessions.length} workouts will be replaced`)],
          ]}
          cta={L('덮어쓰기', 'Replace')}
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
        <Sheet onClose={() => setPop(null)} title={L('ST LOG 백업 파일이 아니에요', 'Not an ST LOG backup file')}>
          <button style={saveBtn} onClick={() => setPop(null)}>
            {L('확인', 'OK')}
          </button>
        </Sheet>
      )}
      {pop === 'account' && (
        <Sheet onClose={() => setPop(null)} title={L('계정', 'Account')}>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--sub)', padding: '0 4px' }}>
            {L('구글·애플·카카오 로그인과 기기 간 동기화는 곧 추가돼요. 지금 기록은 이 기기에만 있으니 백업 내보내기로 보관해 주세요.', 'Sign in with Google, Apple, or Kakao and syncing are coming soon. For now your data lives on this device only, so export a backup to keep it safe.')}
          </p>
          <button
            style={saveBtn}
            onClick={() => {
              setPop(null)
              exportBackup()
            }}
          >
            {L('백업 내보내기', 'Export backup')}
          </button>
        </Sheet>
      )}
      {pop === 'reset' && (
        <Confirm
          eyebrow={L('설정', 'Settings')}
          title={L('모든 기록을 지울까요?', 'Erase all data?')}
          rows={[
            [L('훈련 기록', 'Workouts'), timesLabel(s.sessions.length)],
            [L('1RM 테스트', '1RM tests'), timesLabel(s.tests.length)],
          ]}
          cta={L('지우기', 'Erase')}
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
