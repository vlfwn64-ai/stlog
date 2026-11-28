import { AccountSheet } from './Account'
import { cloudReady, isAdmin, providerOf, signOut, useCloud } from '../cloud'
import { L, getLang, isEn, timesLabel } from '../i18n'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { LiftKey, Unit } from '../logic/program'
import { stepOf } from '../logic/program'
import type { Level, ProgramId } from '../logic/programs'
import { levelName, mainSet, programOf } from '../logic/programs'
import { changeUnit, liftsAtPlate, setBody, setMinPlate, setOneRM, setProgram } from '../actions'
import { AddGearSheet, BODY_DEFAULT, BodyPicker, DialSet, GearGrid, PlatePicker } from '../dial'
import type { Body } from '../store'
import { LevelTabs, ProgramCards } from './ProgramPicker'
import { GEAR, allGear, progOf, setState, useApp } from '../store'
import { CARD_ORDER, TH, fmt, gearName } from '../theme'
import { Confirm, SegToggle, Sheet, SummaryRows } from '../ui'
import type { Go } from '../App'

type Pop = null | 'rm' | 'goal' | 'plate' | 'bar' | 'gear' | 'addGear' | 'reset' | 'account' | 'plateAdjust' | 'program' | 'body'

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
  const cloud = useCloud()
  // 관리자 계정일 때만 '관리자' 메뉴
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    if (cloud.session) void isAdmin().then(setAdmin)
  }, [cloud.session])
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
    setLv(prog.level)
    setPick(prog.id)
    setBodyDraft(bodyOf())
    setPop(p)
  }
  const prog = progOf(s)
  const [lv, setLv] = useState<Level>(prog.level)
  const [pick, setPick] = useState<ProgramId>(prog.id)
  const bodyOf = (): Body => st.body ?? { sex: 'm', height: BODY_DEFAULT.m.height, weight: u === 'kg' ? BODY_DEFAULT.m.kg : Math.round(BODY_DEFAULT.m.kg * 2.2046) }
  const [body, setBodyDraft] = useState<Body>(bodyOf)
  /** 새 원판 단위로 바꿀 때 달라지는 처방 무게 [종목, 대표 무게 전→후, 백오프 전→후] */
  const plateChanges = (mp: number) => {
    const sp = stepOf(mp)
    const cur = stepOf(st.minPlate)
    const nl = liftsAtPlate(s, mp)
    return CARD_ORDER.map((k) => {
      const a = mainSet(prog, k, s.lifts[k], cur)
      const b = mainSet(prog, k, nl[k], sp)
      return { k, top: [a?.weight ?? s.lifts[k].top, b?.weight ?? nl[k].top], bo: [s.lifts[k].backoff, nl[k].backoff] }
    }).filter((c) => c.top[0] !== c.top[1] || (prog.id === 'stlog' && c.bo[0] !== c.bo[1]))
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
          <Row label={L('내 정보', 'About me')} value={st.body ? `${st.body.height}cm · ${fmt(st.body.weight)}${u} ›` : `${L('입력', 'Add')} ›`} onClick={() => open('body')} />
        </Section>
        <Section title={L('운동 환경', 'Training')}>
          <Row label={L('프로그램', 'Program')} value={`${levelName(prog.level)} · ${prog.name()} ›`} onClick={() => open('program')} />
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
          <Row label={L('개인정보처리방침', 'Privacy policy')} value="›" onClick={() => window.open(`${import.meta.env.BASE_URL}privacy.html${isEn() ? '#en' : ''}`, '_blank')} />
          {cloudReady && cloud.session && (
            <Row label={L('계정', 'Account')} value={`${providerOf(cloud.session) === 'kakao' ? L('카카오로 로그인됨', 'Signed in with Kakao') : L('Google로 로그인됨', 'Signed in with Google')} ›`} onClick={() => setPop('account')} />
          )}
          {cloudReady && cloud.session && <Row label={L('로그아웃', 'Sign out')} value="›" onClick={() => setPop('reset')} color="#D92B3A" />}
          {admin && <Row label={L('관리자', 'Admin')} value={`${L('사용자 기록', 'User data')} ›`} onClick={() => go({ name: 'admin' })} />}
        </Section>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--faint)', padding: '4px 0' }}>ST LOG v0.5</div>
      </main>

      {pop === 'rm' && (
        <Sheet onClose={() => setPop(null)} title={L('1RM 설정', '1RM')} gap={20}>
          <DialSet vals={rm} unit={u} step={stepOf(st.minPlate)} onChange={setRm} />
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
          <DialSet vals={goal} unit={u} step={stepOf(st.minPlate)} onChange={setGoal} />
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
              if (plate === st.minPlate) return setPop(null)
              // 지금 처방 무게가 새 단위로 안 맞으면 맞출지 묻는다
              if (plateChanges(plate).length) return setPop('plateAdjust')
              setMinPlate(plate, false)
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
      {pop === 'account' && cloud.session && <AccountSheet onClose={() => setPop(null)} />}
      {pop === 'plateAdjust' && (
        <Sheet onClose={() => setPop('plate')} eyebrow={L('원판 최소 단위', 'Smallest plate')} title={L('프로그램 무게도 바꿀까요?', 'Update program weights too?')}>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--sub)', padding: '0 4px', marginTop: -4 }}>
            {L(`지금 처방 중 ${plate}${u} 원판으로 못 맞추는 무게가 있어요. 바꾸면 가까운 아래 무게로 맞춰요.`, `Some of your current weights can’t be loaded with ${plate}${u} plates. Updating rounds them down to the nearest weight you can load.`)}
          </p>
          <SummaryRows
            rows={plateChanges(plate).flatMap((c) => {
              const r: [string, string][] = []
              const name = TH[c.k].name
              if (c.top[0] !== c.top[1]) r.push([`${name} ${prog.id === 'stlog' ? L('탑세트', 'top set') : L('본세트', 'main set')}`, `${fmt(c.top[0])} → ${fmt(c.top[1])}${u}`])
              if (prog.id === 'stlog' && c.bo[0] !== c.bo[1]) r.push([`${name} ${L('백오프', 'back-off')}`, `${fmt(c.bo[0])} → ${fmt(c.bo[1])}${u}`])
              return r
            })}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                setMinPlate(plate, false)
                setPop(null)
              }}
              style={{ width: 110, flexShrink: 0, height: 56, borderRadius: 14, background: 'var(--fill)', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}
            >
              {L('그대로', 'Keep')}
            </button>
            <button
              onClick={() => {
                setMinPlate(plate, true)
                setPop(null)
              }}
              style={{ ...saveBtn, flex: 1 }}
            >
              {L('무게 바꾸기', 'Update weights')}
            </button>
          </div>
        </Sheet>
      )}
      {pop === 'program' && (
        <Sheet onClose={() => setPop(null)} title={L('프로그램', 'Program')}>
          <LevelTabs value={lv} onChange={setLv} />
          <ProgramCards level={lv} value={pick} current={prog.id} compact onChange={setPick} />
          {/* 고른 프로그램 설명 (높이 고정: 수준·프로그램을 바꿔도 창이 들썩이지 않게) */}
          <div style={{ background: 'var(--fill2)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 168, boxSizing: 'border-box' }}>
            {s.active ? (
              <>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{L('기록 중인 훈련이 있어요', 'A workout is in progress')}</span>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--sub)' }}>{L('기록을 끝내거나 취소한 뒤에 바꿀 수 있어요.', 'Finish or discard it first.')}</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  {programOf(pick).name()}
                  {pick === prog.id && <span style={{ fontWeight: 600, color: 'var(--mute)' }}> · {L('지금 하는 중', 'current')}</span>}
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--sub)' }}>{programOf(pick).desc()}</span>
                {pick !== prog.id && (
                  <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--mute)', marginTop: 'auto', paddingTop: 4 }}>
                    {L('바꾸면 세 종목 모두 새 사이클로 시작해요. 지금 사이클 기록은 이전 사이클에 남아요.', 'Switching starts a new cycle for all three lifts. Your current cycle stays in Past cycles.')}
                  </span>
                )}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPop(null)} style={{ width: 110, flexShrink: 0, height: 56, borderRadius: 14, background: 'var(--fill)', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}>
              {L('취소', 'Cancel')}
            </button>
            <button
              disabled={pick === prog.id || !!s.active}
              onClick={() => {
                setProgram(pick)
                setPop(null)
              }}
              style={{ ...saveBtn, flex: 1, ...(pick === prog.id || s.active ? { background: 'var(--line)', color: 'var(--faint)' } : {}) }}
            >
              {pick === prog.id || s.active ? L('바꾸기', 'Switch') : L(`${programOf(pick).name()} 시작`, `Start ${programOf(pick).name()}`)}
            </button>
          </div>
        </Sheet>
      )}
      {pop === 'body' && (
        <Sheet onClose={() => setPop(null)} title={L('내 정보', 'About me')} gap={20}>
          <BodyPicker value={body} unit={u} onChange={setBodyDraft} />
          <button
            style={saveBtn}
            onClick={() => {
              setBody(body)
              setPop(null)
            }}
          >
            {L('저장', 'Save')}
          </button>
        </Sheet>
      )}
      {pop === 'reset' && (
        <Confirm
          eyebrow={L('계정', 'Account')}
          title={L('로그아웃할까요?', 'Sign out?')}
          rows={[
            [L('로그인', 'Signed in with'), providerOf(cloud.session) === 'kakao' ? L('카카오', 'Kakao') : 'Google'],
            [L('기록', 'Your log'), L(`${timesLabel(s.sessions.length)} · 계정에 저장됨`, `${timesLabel(s.sessions.length)} · saved to your account`)],
          ]}
          cta={L('로그아웃', 'Sign out')}
          onCancel={() => setPop(null)}
          onOk={() => {
            setPop(null)
            void signOut()
          }}
        />
      )}
    </div>
  )
}
