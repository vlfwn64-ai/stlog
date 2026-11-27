// 티어 화면 조각: 배지, 홈·성장 탭 카드, 종목별 티어, 내 티어 시트, 승급 화면, 공유 이미지
import { useState } from 'react'
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

/** 육각형 배지 (안쪽 선은 'white'라 다크 모드 색 바꾸기에 안 걸림) */
export function Badge({ tier, size, inner = true }: { tier: Tier; size: number; inner?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={HEX} fill={tier.color} />
      {inner && <path d={HEX_IN} fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.75" />}
    </svg>
  )
}

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
    <button onClick={onOpen} aria-label={`${L('내 티어', 'My tier')} ${t.tier.name()}, ${nextText(t, u)}`} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 16, background: 'var(--fill2)', textAlign: 'left' }}>
      <Badge tier={t.tier} size={36} />
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>
            {t.tier.name()}{' '}
            <span className="num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--mute)' }}>
              DOTS {Math.round(t.score)}
            </span>
          </span>
          <span className="num" style={{ fontSize: 13, fontWeight: 700, color: t.tier.text }}>
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
export function GrowthTiers({ s, go, onOpen }: { s: AppState; go: Go; onOpen: () => void }) {
  const t = overallTier(s)
  const b = s.settings.body
  if (!t || !b) return <NeedBody go={go} />
  const u = s.settings.unit
  return (
    <>
      <button onClick={onOpen} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, background: 'var(--fill2)', textAlign: 'left' }}>
        <Badge tier={t.tier} size={56} />
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.tier.text }}>{L('3대 티어', 'Big 3 tier')}</span>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>
            {t.tier.name()}{' '}
            <span className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--mute)' }}>
              DOTS {Math.round(t.score)}
            </span>
          </span>
          <span className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--sub)' }}>
              {L('3대', 'Total')} {fmt(total(s))}
              {u} · {fmt(b.weight)}
              {u}
            </span>
            <span style={{ fontWeight: 700, color: t.tier.text }}>{nextText(t, u)}</span>
          </span>
          <Bar t={t} />
        </span>
      </button>
      <section style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{L('종목별 티어', 'Tier by lift')}</h2>
        {(['B', 'D', 'S'] as LiftKey[]).map((k) => {
          const lt = tierInfo(s.lifts[k].oneRM, b.weight, b.sex, u, stepOf(s), k)
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--fill)' }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: TH[k].acc, color: TH[k].on, fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k}</span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 800 }}>
                    <Badge tier={lt.tier} size={18} inner={false} />
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
            </div>
          )
        })}
      </section>
    </>
  )
}

/** 내 티어 시트: 지금 티어, 다음까지, 티어 표 */
export function TierSheet({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const t = overallTier(s)
  const b = s.settings.body
  const [busy, setBusy] = useState(false)
  if (!t || !b) return null
  const u = s.settings.unit
  const table = tierTable(b.weight, b.sex, u, stepOf(s)).reverse()
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 4px' }}>
        <Badge tier={t.tier} size={64} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.tier.text }}>{L('내 티어', 'My tier')}</span>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{t.tier.name()}</span>
          <span className="num" style={{ fontSize: 13, color: 'var(--sub)' }}>
            DOTS {Math.round(t.score)} · {L('3대', 'Total')} {fmt(total(s))}
            {u} · {L('체중', 'BW')} {fmt(b.weight)}
            {u}
          </span>
        </div>
      </div>
      {t.next && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderRadius: 14, background: 'var(--fill2)' }}>
          <div className="num" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{nextText(t, u)}</span>
            <span style={{ fontSize: 12, color: 'var(--mute)' }}>{L(`3대 ${fmt(total(s) + t.need)}${u}이면 승급`, `Tier up at ${fmt(total(s) + t.need)}${u}`)}</span>
          </div>
          <Bar t={t} h={8} />
        </div>
      )}
      <ol aria-label={L('티어 표', 'Tier table')} style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
        {table.map(({ tier, from }, i) => {
          const me = tier.i === t.tier.i
          return (
            <li key={tier.i} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 40, padding: '0 10px', borderRadius: 12, background: me ? 'var(--fill)' : 'transparent' }}>
              <Badge tier={tier} size={22} inner={false} />
              <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: me ? 800 : 500, color: me ? tier.text : 'var(--ink2)', whiteSpace: 'nowrap' }}>
                {tier.name()}
                {me && <span style={{ height: 20, padding: '0 7px', borderRadius: 6, background: 'var(--surface)', color: 'var(--ink2)', fontSize: 11, fontWeight: 700, lineHeight: '20px' }}>{L('지금', 'You')}</span>}
              </span>
              <span className="num" style={{ width: 76, textAlign: 'right', fontSize: 13, color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                DOTS {tier.min}
                {i === 0 ? '+' : ''}
              </span>
              <span className="num" style={{ width: 72, textAlign: 'right', fontSize: 14, fontWeight: me ? 800 : 500, whiteSpace: 'nowrap' }}>
                {from === 0 ? `~${fmt(table[i - 1]?.from ? table[i - 1].from - stepOf(s) : 0)}${u}` : `${fmt(from)}${u}~`}
              </span>
            </li>
          )
        })}
      </ol>
      <p style={{ marginTop: -4, padding: '0 4px', fontSize: 12, lineHeight: 1.6, color: 'var(--mute)' }}>
        {L('DOTS는 체중과 성별을 보정한 파워리프팅 점수예요. 티어는 지금 1RM으로 계산해요.', 'DOTS is a powerlifting score adjusted for bodyweight and sex. Your tier uses your current 1RMs.')}
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await shareCard(s)
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

/** 1RM 테스트 뒤 티어가 오르면 보이는 화면 */
export function TierUp({ lift, prevRM, newRM, from, go }: { lift: LiftKey; prevRM: number; newRM: number; from: number; go: Go }) {
  const s = useApp()
  const [busy, setBusy] = useState(false)
  const t = overallTier(s)
  const b = s.settings.body
  if (!t || !b) return null
  const u = s.settings.unit
  const prevTotal = total(s) - newRM + prevRM
  const prevScore = dots(prevTotal, b.weight, b.sex, u)
  const rows: [string, string][] = [
    [`${TH[lift].name} 1RM`, `${fmt(prevRM)} → ${fmt(newRM)}${u}`],
    [L('3대 합계', 'Big 3 total'), `${fmt(prevTotal)} → ${fmt(total(s))}${u}`],
    ['DOTS', `${Math.round(prevScore)} → ${Math.round(t.score)}`],
    [L('다음 티어', 'Next tier'), nextText(t, u)],
  ]
  return (
    <div className="screen" style={{ background: t.tier.deep, color: '#FFFFFF' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 24px', textAlign: 'center', animation: 'fadeIn 400ms ease both' }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, opacity: 0.9 }}>TIER UP</span>
        <svg width="148" height="148" viewBox="0 0 48 48" aria-hidden="true" style={{ animation: 'up 520ms cubic-bezier(0.2,0.8,0.2,1) both' }}>
          <path d={HEX} fill={t.tier.i === 6 ? '#2C2C35' : t.tier.color} stroke="white" strokeWidth="1.6" />
          <path d={HEX_IN} fill="none" stroke="white" strokeWidth="2.2" strokeOpacity="0.85" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>{t.tier.name()}</h1>
          <span style={{ fontSize: 16, fontWeight: 600, opacity: 0.92 }}>{L(`${TIERS[from].name()}에서 ${t.tier.i - from}단계 올랐어요`, `Up ${t.tier.i - from} from ${TIERS[from].name()}`)}</span>
        </div>
        <div style={{ width: '100%', marginTop: 8, padding: '16px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.14)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(([a, v]) => (
            <div key={a} className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
              <span style={{ opacity: 0.88 }}>{a}</span>
              <span style={{ fontWeight: 800 }}>{v}</span>
            </div>
          ))}
        </div>
      </main>
      <div style={{ padding: '12px 20px var(--safe-bot)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await shareCard(s)
            setBusy(false)
          }}
          style={{ height: 56, borderRadius: 14, background: '#FFFFFF', color: t.tier.deep, fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <ShareIcon color={t.tier.deep} />
          {busy ? L('만드는 중…', 'Making…') : L('인스타 스토리에 공유', 'Share to Instagram story')}
        </button>
        <button onClick={() => go({ name: 'lift', lift })} style={{ height: 52, borderRadius: 14, color: '#FFFFFF', fontSize: 16, fontWeight: 700 }}>
          {L('확인', 'Done')}
        </button>
      </div>
    </div>
  )
}

/** 인스타 스토리 공유 카드 (1080×1920) 그려서 공유 시트로, 안 되면 내려받기 */
export async function shareCard(s: AppState) {
  const t = overallTier(s)
  const b = s.settings.body
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
  c.fillStyle = '#12161C'
  c.fillRect(0, 0, W, H)
  // 위: 로고, 날짜
  c.fillStyle = '#FFFFFF'
  c.font = font(800, 54)
  c.textBaseline = 'top'
  c.fillText('ST LOG', 86, 150)
  c.font = font(500, 36)
  c.fillStyle = '#B0B8C1'
  c.textAlign = 'right'
  const d = today().split('-')
  c.fillText(`${d[0]}. ${+d[1]}. ${+d[2]}`, W - 86, 160)
  c.textAlign = 'center'
  // 배지
  const cx = W / 2
  const by = 520
  const sc = 7.2
  const hex = (path: [number, number][]) => {
    c.beginPath()
    path.forEach(([x, y], i) => (i ? c.lineTo(cx + (x - 24) * sc, by + (y - 24) * sc) : c.moveTo(cx + (x - 24) * sc, by + (y - 24) * sc)))
    c.closePath()
  }
  const outer: [number, number][] = [
    [24, 3],
    [43, 14],
    [43, 34],
    [24, 45],
    [5, 34],
    [5, 14],
  ]
  const inner: [number, number][] = [
    [24, 12],
    [35, 18.5],
    [35, 29.5],
    [24, 36],
    [13, 29.5],
    [13, 18.5],
  ]
  hex(outer)
  c.fillStyle = t.tier.i === 6 ? '#2C2C35' : t.tier.color
  c.fill()
  if (t.tier.i === 6) {
    c.strokeStyle = '#FFFFFF'
    c.lineWidth = 6
    c.stroke()
  }
  hex(inner)
  c.strokeStyle = 'rgba(255,255,255,0.8)'
  c.lineWidth = 16
  c.stroke()
  // 티어 이름, 합계
  // 어두운 배경에서 잘 보이는 티어 색 (다크 모드 글자 색과 같음)
  c.fillStyle = ['#B0B8C1', '#E39A6A', '#C3CBD8', '#F2C14E', '#4FD1CE', '#7FB0FF', '#F2F4F6'][t.tier.i]
  c.font = font(700, 40)
  c.fillText(t.tier.en.toUpperCase().split('').join(' '), cx, 730)
  c.fillStyle = '#FFFFFF'
  c.font = font(900, 200)
  const totalText = fmt(total(s))
  c.fillText(totalText, cx - 40, 800)
  const tw = c.measureText(totalText).width
  c.font = font(700, 76)
  c.fillStyle = '#B0B8C1'
  c.textAlign = 'left'
  c.fillText(u, cx - 40 + tw / 2 + 16, 900)
  c.textAlign = 'center'
  c.font = font(500, 40)
  c.fillText(`${isEn() ? 'Big 3 total' : '3대 합계'} · DOTS ${Math.round(t.score)} · ${isEn() ? 'BW' : '체중'} ${fmt(b.weight)}${u}`, cx, 1040)
  // 종목 칸
  const bw = (W - 86 * 2 - 2 * 24) / 3
  const colors: Record<LiftKey, string> = { S: '#3DD68C', B: '#FF6B78', D: '#FFC93D' }
  ;(['S', 'B', 'D'] as LiftKey[]).forEach((k, i) => {
    const x = 86 + i * (bw + 24)
    c.fillStyle = '#1E242C'
    c.beginPath()
    c.roundRect(x, 1150, bw, 200, 36)
    c.fill()
    c.fillStyle = colors[k]
    c.font = font(800, 38)
    c.fillText(k, x + bw / 2, 1180)
    c.fillStyle = '#FFFFFF'
    c.font = font(800, 66)
    c.fillText(fmt(s.lifts[k].oneRM), x + bw / 2, 1240)
  })
  // 아래: 부제, 계정
  c.fillStyle = '#B0B8C1'
  c.font = font(500, 36)
  c.fillText(isEn() ? 'A powerlifting app by a pharmacy student with a 500kg total' : '3대 500 약대생의 파워리프팅 전용 앱', cx, 1700)
  c.fillStyle = '#FFFFFF'
  c.font = font(700, 40)
  c.fillText('@pharmaco_lifting_stlog', cx, 1760)

  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, 'image/png'))
  if (!blob) return
  const file = new File([blob], 'stlog-tier.png', { type: 'image/png' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
      return
    }
  } catch {
    // 취소했거나 공유가 안 되면 아래에서 내려받기
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'stlog-tier.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
