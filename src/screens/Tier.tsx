// 티어 화면 조각: 배지, 홈·성장 탭 카드, 종목별 티어, 내 티어 시트, 승급 화면, 공유 이미지
import { useEffect, useState } from 'react'
import type React from 'react'
import { L, isEn } from '../i18n'
import type { LiftKey } from '../logic/program'
import type { Tier, TierInfo } from '../logic/tiers'
import { TIERS, dots, tierInfo, tierTable } from '../logic/tiers'
import type { AppState } from '../store'
import { step as stepOf, today, useApp } from '../store'
import { CARD_ORDER, TH, fmt } from '../theme'
import { Sheet } from '../ui'
import type { Go } from '../App'

const HEX = 'M24 3 L43 14 L43 34 L24 45 L5 34 L5 14 Z'
const HEX_IN = 'M24 12 L35 18.5 L35 29.5 L24 36 L13 29.5 L13 18.5 Z'
/** 배지 모양: 3대는 육각형, 벤치 역삼각형, 데드 오각형(뒤집힌), 스쿼트 마름모(45도 돌린 정사각형) */
const SHAPES: Record<'all' | LiftKey, [string, string]> = {
  all: [HEX, HEX_IN],
  B: ['M4 7 L44 7 L24 43 Z', 'M14 13 L34 13 L24 31 Z'],
  D: ['M24 46 L4.03 31.49 L11.66 8.01 L36.34 8.01 L43.97 31.49 Z', 'M24 36.55 L13.02 28.57 L17.21 15.66 L30.79 15.66 L34.98 28.57 Z'],
  S: ['M24 3 L45 24 L24 45 L3 24 Z', 'M24 13.08 L34.92 24 L24 34.92 L13.08 24 Z'],
}

/** 티어 배지 (안쪽 선은 'white'라 다크 모드 색 바꾸기에 안 걸림) */
export function Badge({ tier, size, inner = true, lift }: { tier: Tier; size: number; inner?: boolean; lift?: LiftKey }) {
  const [out, inn] = SHAPES[lift ?? 'all']
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={out} fill={tier.color} />
      {inner && <path d={inn} fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.75" strokeLinejoin="round" />}
    </svg>
  )
}

/** 종목 티어 */
export function liftTier(s: AppState, lift: LiftKey, rm = s.lifts[lift].oneRM): TierInfo | null {
  const b = s.settings.body
  if (!b) return null
  return tierInfo(rm, b.weight, b.sex, s.settings.unit, stepOf(s), lift)
}

/** 티어별 대략 상위 % (추정치, 티어가 시작하는 무게 기준) */
const TOP = [100, 75, 50, 30, 15, 5, 1]
const topText = (i: number) => (i === 0 ? '' : L(`상위 ${TOP[i]}%`, `Top ${TOP[i]}%`))

/** 체중 대비 몇 배 */
const ratioText = (w: number, bw: number, d = 2) => L(`체중의 ${(w / bw).toFixed(d)}배`, `${(w / bw).toFixed(d)}× BW`)

export type Gain = { lift: LiftKey; d: number }
/** 최근 2주 안 1RM 테스트로 오른 무게 (공유 카드에 표시) */
export function recentGain(s: AppState, lift?: LiftKey): Gain | undefined {
  const lim = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  const t = [...s.tests].reverse().find((x) => x.date >= lim && x.newRM > x.prevRM && (!lift || x.lift === lift))
  return t ? { lift: t.lift, d: +(t.newRM - t.prevRM).toFixed(2) } : undefined
}

/** 티어가 오를 때 쓰는 밝은 종목 색 (짙은 배경 위) */
const BRIGHT: Record<LiftKey, string> = { S: '#5BE39E', B: '#FF8A94', D: '#FFD45C' }

const total = (s: AppState) => CARD_ORDER.reduce((a, k) => a + s.lifts[k].oneRM, 0)

/** 3대 티어 (내 정보가 없으면 null) */
export function overallTier(s: AppState): TierInfo | null {
  const b = s.settings.body
  if (!b) return null
  return tierInfo(total(s), b.weight, b.sex, s.settings.unit, stepOf(s))
}

/** 1RM이 바뀌었을 때 3대 티어 (승급 확인용) */
export function tierWith(s: AppState, lift: LiftKey, rm: number): TierInfo | null {
  const b = s.settings.body
  if (!b) return null
  const t = total(s) - s.lifts[lift].oneRM + rm
  return tierInfo(t, b.weight, b.sex, s.settings.unit, stepOf(s))
}

const nextText = (t: TierInfo, u: string) => (t.next ? L(`${t.next.name()}까지 +${fmt(t.need)}${u}`, `+${fmt(t.need)}${u} to ${t.next.name()}`) : L('최고 티어', 'Top tier'))

function Bar({ t, h = 6 }: { t: TierInfo; h?: number }) {
  return (
    <span style={{ height: h, borderRadius: h / 2, background: 'var(--line)', overflow: 'hidden', display: 'block' }}>
      <span style={{ display: 'block', width: `${Math.round(t.progress * 100)}%`, height: '100%', borderRadius: h / 2, background: t.tier.color }} />
    </span>
  )
}

/** 내 정보가 없을 때 */
function NeedBody({ go }: { go: Go }) {
  return (
    <button onClick={() => go({ name: 'menu' })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: 'var(--fill2)', textAlign: 'left' }}>
      <Badge tier={TIERS[0]} size={36} inner={false} />
      <span style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: 'var(--sub)' }}>{L('설정 › 내 정보에 성별·몸무게를 넣으면 티어가 나와요.', 'Add your sex and weight in Settings › About me to see your tier.')}</span>
      <Chevron />
    </button>
  )
}

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
)

/** 홈 탭 티어 카드 (작게) */
export function TierCard({ s, go, onOpen }: { s: AppState; go: Go; onOpen: () => void }) {
  const t = overallTier(s)
  if (!t) return <NeedBody go={go} />
  const u = s.settings.unit
  return (
    <button onClick={onOpen} aria-label={`${L('내 티어', 'My tier')} ${t.tier.name()}, ${nextText(t, u)}`} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 14px 16px 16px', borderRadius: 18, background: 'var(--fill2)', textAlign: 'left' }}>
      <Badge tier={t.tier} size={56} />
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.tier.text }}>{L('3대 티어', 'Big 3 tier')}</span>
          <span className="num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--mute)' }}>
            DOTS {Math.round(t.score)}
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, whiteSpace: 'nowrap' }}>{t.tier.name()}</span>
          <span className="num" style={{ fontSize: 14, fontWeight: 700, color: t.tier.text, whiteSpace: 'nowrap' }}>
            {nextText(t, u)}
          </span>
        </span>
        <Bar t={t} />
      </span>
      <Chevron />
    </button>
  )
}

/** 성장 탭: 3대 티어 (크게) + 종목별 티어 */
export function GrowthTiers({ s, go, onOpen }: { s: AppState; go: Go; onOpen: (lift?: LiftKey) => void }) {
  const t = overallTier(s)
  const b = s.settings.body
  if (!t || !b) return <NeedBody go={go} />
  const u = s.settings.unit
  return (
    <>
      {/* 전체 티어: 홈 티어 카드와 같은 모양 */}
      <TierCard s={s} go={go} onOpen={() => onOpen()} />
      <section style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{L('종목별 티어', 'Tier by lift')}</h2>
        {(['B', 'D', 'S'] as LiftKey[]).map((k) => {
          const lt = tierInfo(s.lifts[k].oneRM, b.weight, b.sex, u, stepOf(s), k)
          return (
            <button key={k} onClick={() => onOpen(k)} aria-label={`${TH[k].name} ${lt.tier.name()}, ${nextText(lt, u)}`} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--fill)', textAlign: 'left' }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: TH[k].acc, color: TH[k].on, fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k}</span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 800 }}>
                    <Badge tier={lt.tier} size={18} inner={false} lift={k} />
                    {lt.tier.name()}
                    <span className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--mute)' }}>
                      1RM {fmt(s.lifts[k].oneRM)}
                      {u}
                    </span>
                  </span>
                  <span className="num" style={{ fontSize: 12, fontWeight: 700, color: lt.tier.text, whiteSpace: 'nowrap' }}>
                    {nextText(lt, u)}
                  </span>
                </span>
                <Bar t={lt} h={5} />
              </span>
              <Chevron />
            </button>
          )
        })}
      </section>
    </>
  )
}

/** 내 티어 시트: 지금 티어, 다음까지, 티어 표 (lift가 있으면 그 종목 티어) */
export function TierSheet({ onClose, lift }: { onClose: () => void; lift?: LiftKey }) {
  const s = useApp()
  const t = lift ? liftTier(s, lift) : overallTier(s)
  const b = s.settings.body
  const [busy, setBusy] = useState(false)
  if (!t || !b) return null
  const u = s.settings.unit
  const cur = lift ? s.lifts[lift].oneRM : total(s)
  const table = tierTable(b.weight, b.sex, u, stepOf(s), lift).reverse()
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 4px' }}>
        <Badge tier={t.tier} size={64} lift={lift} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: lift ? TH[lift].text : t.tier.text }}>{lift ? L(`${TH[lift].name} 티어`, `${TH[lift].name} tier`) : L('내 티어', 'My tier')}</span>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{t.tier.name()}</span>
          <span className="num" style={{ fontSize: 13, color: 'var(--sub)' }}>
            {lift ? `1RM ${fmt(cur)}${u}` : `DOTS ${Math.round(t.score)} · ${L('3대', 'Total')} ${fmt(cur)}${u}`} · {ratioText(cur, b.weight, lift ? 2 : 1)}
          </span>
        </div>
      </div>
      {t.next && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderRadius: 14, background: 'var(--fill2)' }}>
          <div className="num" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{nextText(t, u)}</span>
            <span style={{ fontSize: 12, color: 'var(--mute)' }}>
              {lift ? L(`1RM ${fmt(cur + t.need)}${u}이면 승급`, `Tier up at ${fmt(cur + t.need)}${u}`) : L(`3대 ${fmt(cur + t.need)}${u}이면 승급`, `Tier up at ${fmt(cur + t.need)}${u}`)}
            </span>
          </div>
          <Bar t={t} h={8} />
        </div>
      )}
      <ol aria-label={L('티어 표', 'Tier table')} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
        {table.map(({ tier, from }, i) => {
          const me = tier.i === t.tier.i
          return (
            <li key={tier.i} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, padding: '0 8px', borderRadius: 12, background: me ? 'var(--fill)' : 'transparent' }}>
              <Badge tier={tier} size={22} inner={false} lift={lift} />
              <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: me ? 800 : 500, color: me ? tier.text : 'var(--ink2)', whiteSpace: 'nowrap' }}>
                {tier.name()}
                {me && <span style={{ height: 20, padding: '0 7px', borderRadius: 6, background: 'var(--surface)', color: 'var(--ink2)', fontSize: 11, fontWeight: 700, lineHeight: '20px' }}>{L('지금', 'You')}</span>}
              </span>
              {!lift && (
                <span className="num" style={{ width: 76, textAlign: 'right', fontSize: 13, color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                  DOTS {tier.min}
                  {i === 0 ? '+' : ''}
                </span>
              )}
              <span className="num" style={{ width: 72, textAlign: 'right', fontSize: 14, fontWeight: me ? 800 : 500, whiteSpace: 'nowrap' }}>
                {from === 0 ? `~${fmt(table[i - 1]?.from ? table[i - 1].from - stepOf(s) : 0)}${u}` : `${fmt(from)}${u}~`}
              </span>
              {lift && (
                <span className="num" style={{ width: 62, textAlign: 'right', fontSize: 12, fontWeight: me ? 800 : 500, color: me ? tier.text : 'var(--mute)', whiteSpace: 'nowrap' }}>
                  {topText(tier.i)}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <p style={{ marginTop: -4, padding: '0 4px', fontSize: 12, lineHeight: 1.6, color: 'var(--mute)' }}>
        {lift
          ? L(
              `종목별 티어는 3대 티어 기준을 종목 비율(스쿼트 36%, 벤치 24%, 데드 40%)로 나눠서 정해요. 상위 %는 대략적인 추정이에요.`,
              'Lift tiers split the Big 3 tier totals by typical share (squat 36%, bench 24%, deadlift 40%). Top % is a rough estimate.',
            )
          : L('DOTS는 체중과 성별을 보정한 파워리프팅 점수예요. 티어는 지금 1RM으로 계산해요.', 'DOTS is a powerlifting score adjusted for bodyweight and sex. Your tier uses your current 1RMs.')}
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await shareCard(s, lift, recentGain(s, lift))
          setBusy(false)
        }}
        style={{ height: 52, borderRadius: 14, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <ShareIcon color="currentColor" />
        {busy ? L('만드는 중…', 'Making…') : L('인스타 스토리에 공유', 'Share to Instagram story')}
      </button>
    </Sheet>
  )
}

const ShareIcon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
)

/**
 * 1RM 테스트 뒤 티어가 오르면 보이는 화면.
 * 종목 티어가 올랐으면 그것 먼저, 3대 티어도 올랐으면 이어서.
 */
export function TierUp({ lift, prevRM, newRM, fromLift, fromAll, go }: { lift: LiftKey; prevRM: number; newRM: number; fromLift?: number; fromAll?: number; go: Go }) {
  const [step, setStep] = useState<'lift' | 'all'>(fromLift !== undefined ? 'lift' : 'all')
  const from = step === 'lift' ? fromLift : fromAll
  if (from === undefined) return null
  return <TierUpView key={step} step={step} lift={lift} prevRM={prevRM} newRM={newRM} from={from} more={step === 'lift' && fromAll !== undefined} onNext={() => setStep('all')} go={go} />
}

/** 승급 한 장면: 원래 티어로 시작해서 0.9초 뒤 새 티어로 바뀐다 */
function TierUpView({ step, lift, prevRM, newRM, from, more, onNext, go }: { step: 'lift' | 'all'; lift: LiftKey; prevRM: number; newRM: number; from: number; more: boolean; onNext: () => void; go: Go }) {
  const s = useApp()
  const [ph, setPh] = useState<0 | 1>(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setPh(1), 900)
    return () => clearTimeout(t)
  }, [])
  const b = s.settings.body
  const t = step === 'lift' ? liftTier(s, lift) : overallTier(s)
  if (!t || !b) return null
  const u = s.settings.unit
  const d = +(newRM - prevRM).toFixed(2)
  const plus = (k: LiftKey) =>
    k === lift && d > 0 ? (
      <span style={{ color: BRIGHT[k], fontWeight: 800 }}>
        {' '}
        (+{fmt(d)})
      </span>
    ) : null
  const prevTotal = total(s) - newRM + prevRM
  const rows: [string, React.ReactNode][] =
    step === 'lift'
      ? [
          [`${TH[lift].name} 1RM`, <>{`${fmt(prevRM)} → ${fmt(newRM)}${u}`}{plus(lift)}</>],
          [L('체중 대비', 'vs bodyweight'), ratioText(newRM, b.weight)],
          [L('다음 티어', 'Next tier'), nextText(t, u)],
        ]
      : [
          ...(['B', 'D', 'S'] as LiftKey[]).map((k): [string, React.ReactNode] => [
            `${TH[k].name} 1RM`,
            <>
              {`${fmt(s.lifts[k].oneRM)}${u}`}
              {plus(k)}
            </>,
          ]),
          [
            L('3대 합계', 'Big 3 total'),
            <>
              {`${fmt(prevTotal)} → ${fmt(total(s))}${u}`}
              {plus(lift)}
            </>,
          ],
          ['DOTS', `${Math.round(dots(prevTotal, b.weight, b.sex, u))} → ${Math.round(t.score)}`],
          [L('다음 티어', 'Next tier'), nextText(t, u)],
        ]
  const shape = step === 'lift' ? lift : undefined
  const [out, inn] = SHAPES[shape ?? 'all']
  const shown = ph === 0 ? TIERS[from] : t.tier
  const fill = shown.i === 6 ? '#2C2C35' : shown.color
  const share = async () => {
    setBusy(true)
    await shareCard(s, step === 'lift' ? lift : undefined, { lift, d })
    setBusy(false)
  }
  const later = { opacity: ph, transform: ph ? 'none' : 'translateY(12px)', transition: 'opacity 400ms ease 250ms, transform 400ms ease 250ms' }
  return (
    <div className="screen" style={{ background: shown.deep, color: '#FFFFFF', transition: 'background-color 700ms ease' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 24px', textAlign: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, opacity: 0.9 }}>{step === 'lift' ? `${TH[lift].tab.toUpperCase()} TIER UP` : 'BIG 3 TIER UP'}</span>
        <svg width="148" height="148" viewBox="0 0 48 48" aria-hidden="true" style={{ animation: ph ? 'tierPop 700ms cubic-bezier(0.2,0.8,0.2,1) both' : 'up 520ms cubic-bezier(0.2,0.8,0.2,1) both' }}>
          <path d={out} fill={fill} stroke="white" strokeWidth="1.6" strokeLinejoin="round" style={{ transition: 'fill 500ms ease 150ms' }} />
          <path d={inn} fill="none" stroke="white" strokeWidth="2.2" strokeOpacity="0.85" strokeLinejoin="round" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 84 }}>
          <h1 key={shown.i} aria-live="polite" style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, animation: ph ? 'up 420ms cubic-bezier(0.2,0.8,0.2,1) both' : undefined, opacity: ph ? 1 : 0.75 }}>
            {shown.name()}
          </h1>
          <span style={{ fontSize: 16, fontWeight: 600, opacity: ph ? 0.92 : 0, transition: 'opacity 400ms ease 200ms' }}>
            {step === 'lift'
              ? L(`${TH[lift].name} ${TIERS[from].name()}에서 ${t.tier.i - from}단계 올랐어요`, `${TH[lift].name}: up ${t.tier.i - from} from ${TIERS[from].name()}`)
              : L(`3대 ${TIERS[from].name()}에서 ${t.tier.i - from}단계 올랐어요`, `Big 3: up ${t.tier.i - from} from ${TIERS[from].name()}`)}
          </span>
        </div>
        <div style={{ width: '100%', marginTop: 8, padding: '16px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.14)', display: 'flex', flexDirection: 'column', gap: 10, ...later }}>
          {rows.map(([a, v]) => (
            <div key={a} className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
              <span style={{ opacity: 0.88 }}>{a}</span>
              <span style={{ fontWeight: 800 }}>{v}</span>
            </div>
          ))}
        </div>
      </main>
      <div style={{ padding: '12px 20px var(--safe-bot)', display: 'flex', flexDirection: 'column', gap: 8, ...later }}>
        <button disabled={busy || !ph} onClick={share} style={{ height: 56, borderRadius: 14, background: '#FFFFFF', color: t.tier.deep, fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ShareIcon color={t.tier.deep} />
          {busy ? L('만드는 중…', 'Making…') : L('인스타 스토리에 공유', 'Share to Instagram story')}
        </button>
        <button disabled={!ph} onClick={() => (more ? onNext() : go({ name: 'lift', lift }))} style={{ height: 52, borderRadius: 14, color: '#FFFFFF', fontSize: 16, fontWeight: 700 }}>
          {more ? L('3대 티어도 올랐어요 ›', 'Your Big 3 tier went up too ›') : L('확인', 'Done')}
        </button>
      </div>
    </div>
  )
}

/** 어두운 배경에서 잘 보이는 티어 색 (다크 모드 글자 색과 같음) */
const ON_DARK = ['#B0B8C1', '#E39A6A', '#C3CBD8', '#F2C14E', '#4FD1CE', '#7FB0FF', '#F2F4F6']

/**
 * 인스타 스토리 공유 카드 (1080×1920) 그려서 공유 시트로, 안 되면 내려받기.
 * lift가 있으면 그 종목 카드. gain이 있으면 오른 무게를 (+무게)로.
 */
export async function shareCard(s: AppState, lift?: LiftKey, gain?: Gain) {
  const b = s.settings.body
  const t = lift ? liftTier(s, lift) : overallTier(s)
  if (!t || !b) return
  const u = s.settings.unit
  const W = 1080
  const H = 1920
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d')
  if (!c) return
  const font = (w: number, px: number) => `${w} ${px}px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`
  const g = gain && gain.d > 0 ? gain : undefined
  c.fillStyle = '#12161C'
  c.fillRect(0, 0, W, H)
  c.textBaseline = 'top'
  // 위: 로고, 날짜
  c.fillStyle = '#FFFFFF'
  c.font = font(800, 54)
  c.fillText('ST LOG', 86, 150)
  c.font = font(500, 36)
  c.fillStyle = '#B0B8C1'
  c.textAlign = 'right'
  const dd = today().split('-')
  c.fillText(`${dd[0]}. ${+dd[1]}. ${+dd[2]}`, W - 86, 160)
  c.textAlign = 'center'
  // 배지 (3대 육각형, 종목 모양)
  const cx = W / 2
  const sc = 7.2
  const [out, inn] = SHAPES[lift ?? 'all']
  c.save()
  c.translate(cx - 24 * sc, 520 - 24 * sc)
  c.scale(sc, sc)
  c.fillStyle = t.tier.i === 6 ? '#2C2C35' : t.tier.color
  c.fill(new Path2D(out))
  if (t.tier.i === 6) {
    c.strokeStyle = '#FFFFFF'
    c.lineWidth = 0.8
    c.stroke(new Path2D(out))
  }
  c.strokeStyle = 'rgba(255,255,255,0.8)'
  c.lineWidth = 2.2
  c.lineJoin = 'round'
  c.stroke(new Path2D(inn))
  c.restore()
  // 티어 이름
  c.fillStyle = ON_DARK[t.tier.i]
  c.font = font(700, 40)
  const head = lift ? `${TH[lift].tab.toUpperCase()} · ${t.tier.en.toUpperCase()}` : t.tier.en.toUpperCase().split('').join(' ')
  c.fillText(head, cx, 730)
  // 큰 숫자 + 단위 (+무게는 종목 카드에서만, 3대 카드는 종목 칸 딱지로)
  const big = fmt(lift ? s.lifts[lift].oneRM : total(s))
  c.font = font(900, 200)
  const bw = c.measureText(big).width
  c.font = font(700, 76)
  const uw = c.measureText(u).width
  const gainBig = g && lift && g.lift === lift ? ` +${fmt(g.d)}` : ''
  c.font = font(800, 64)
  const gw = gainBig ? c.measureText(gainBig).width : 0
  const x0 = cx - (bw + 16 + uw + gw) / 2
  c.textAlign = 'left'
  c.fillStyle = '#FFFFFF'
  c.font = font(900, 200)
  c.fillText(big, x0, 800)
  c.fillStyle = '#B0B8C1'
  c.font = font(700, 76)
  c.fillText(u, x0 + bw + 16, 900)
  if (gainBig && g) {
    c.fillStyle = BRIGHT[g.lift]
    c.font = font(800, 64)
    c.fillText(gainBig, x0 + bw + 16 + uw, 905)
  }
  c.textAlign = 'center'
  c.fillStyle = '#B0B8C1'
  c.font = font(500, 40)
  const sub = lift
    ? `${TH[lift].name} 1RM · ${ratioText(s.lifts[lift].oneRM, b.weight)}`
    : `${isEn() ? 'Big 3 total' : '3대 합계'} · DOTS ${Math.round(t.score)} · ${ratioText(total(s), b.weight, 1)}`
  c.fillText(sub, cx, 1040)
  // 종목 칸 (3대 카드만)
  if (!lift) {
    const bxw = (W - 86 * 2 - 2 * 24) / 3
    ;(['S', 'B', 'D'] as LiftKey[]).forEach((k, i) => {
      const x = 86 + i * (bxw + 24)
      c.fillStyle = '#1E242C'
      c.beginPath()
      c.roundRect(x, 1150, bxw, 220, 36)
      c.fill()
      c.fillStyle = BRIGHT[k]
      c.font = font(800, 38)
      c.fillText(k, x + bxw / 2, 1190)
      c.fillStyle = '#FFFFFF'
      c.font = font(800, 66)
      c.fillText(fmt(s.lifts[k].oneRM), x + bxw / 2, 1254)
      // 오른 종목: 칸 오른쪽 위 모서리에 +무게 딱지
      if (g && g.lift === k) {
        const txt = `+${fmt(g.d)}`
        c.font = font(900, 34)
        const pw = c.measureText(txt).width + 40
        const ph = 58
        const px = x + bxw - pw + 14
        const py = 1150 - ph / 2 + 4
        c.fillStyle = BRIGHT[k]
        c.beginPath()
        c.roundRect(px, py, pw, ph, ph / 2)
        c.fill()
        c.strokeStyle = '#12161C'
        c.lineWidth = 6
        c.stroke()
        c.fillStyle = '#12161C'
        c.textBaseline = 'middle'
        c.fillText(txt, px + pw / 2, py + ph / 2 + 2)
        c.textBaseline = 'top'
      }
    })
  } else {
    // 종목 카드: 다음 티어까지
    c.fillStyle = '#1E242C'
    c.beginPath()
    c.roundRect(86, 1150, W - 172, 160, 36)
    c.fill()
    c.fillStyle = '#FFFFFF'
    c.font = font(700, 44)
    c.fillText(t.next ? (isEn() ? `${fmt(t.need)}${u} to ${t.next.en}` : `${t.next.name()}까지 +${fmt(t.need)}${u}`) : isEn() ? 'Top tier' : '최고 티어', cx, 1205)
  }
  // 아래: 부제, 계정
  c.fillStyle = '#B0B8C1'
  c.font = font(500, 36)
  c.fillText(isEn() ? 'A powerlifting app by a pharmacy student with a 500kg total' : '3대 500 약대생의 파워리프팅 전용 앱', cx, 1700)
  c.fillStyle = '#FFFFFF'
  c.font = font(700, 40)
  c.fillText('@pharmaco_lifting_stlog', cx, 1760)

  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, 'image/png'))
  if (!blob) return
  const file = new File([blob], lift ? `stlog-${lift}-tier.png` : 'stlog-tier.png', { type: 'image/png' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
      return
    }
  } catch {
    // 취소했거나 공유가 안 되면 끝
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
