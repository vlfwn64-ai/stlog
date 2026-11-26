import { L, monthTitle, weekHead } from '../i18n'
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { LiftKey } from '../logic/program'
import { atTest, mainSet, repsText } from '../logic/programs'
import type { AppState } from '../store'
import { progOf, step as stepOf, useApp } from '../store'
import { CARD_ORDER, TH, fmt, md } from '../theme'
import { HomeChart, PillToggle, ts } from '../ui'
import type { Pt } from '../ui'
import type { Go } from '../App'
import DaySheet from './DaySheet'

/** 종목별 추정(세션 e1RM) / 실제(1RM 기록) 점 */
export function liftPoints(s: AppState, lift: LiftKey, mode: 'est' | 'act'): Pt[] {
  if (mode === 'est') {
    const e = s.sessions.filter((x) => x.lift === lift && x.e1rm).map((x) => ({ x: ts(x.date), y: x.e1rm as number, date: md(x.date) }))
    // 추정 기록이 아직 없으면 실제 1RM으로 보여준다
    if (e.length) return e
  }
  return s.rmHistory.filter((x) => x.lift === lift).map((x) => ({ x: ts(x.date), y: x.rm, date: md(x.date) }))
}

export function latestEst(s: AppState, lift: LiftKey): number | null {
  const l = s.sessions.filter((x) => x.lift === lift && x.e1rm)
  return l.length ? (l[l.length - 1].e1rm as number) : null
}

const arrowBtn: CSSProperties = { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }

function Calendar({ s, onPick }: { s: AppState; onPick: (date: string) => void }) {
  const [off, setOff] = useState(0)
  // 달이 넘어간 방향 (새 달이 그쪽에서 들어온다)
  const [dir, setDir] = useState<'fromRight' | 'fromLeft' | null>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const move = (n: number) => {
    setDir(n > 0 ? 'fromRight' : 'fromLeft')
    setOff(off + n)
  }
  const base = new Date()
  const d0 = new Date(base.getFullYear(), base.getMonth() + off, 1)
  const y = d0.getFullYear()
  const m = d0.getMonth()
  const days = new Date(y, m + 1, 0).getDate()
  const lead = d0.getDay()
  const byDate = new Map<string, LiftKey[]>()
  const add = (date: string, k: LiftKey) => byDate.set(date, [...new Set([...(byDate.get(date) ?? []), k])])
  s.sessions.forEach((x) => add(x.date, x.lift))
  s.tests.forEach((x) => add(x.date, x.lift))
  const key = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const todayKey = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
  return (
    <section
      onTouchStart={(e) => {
        const t = e.touches[0]
        swipe.current = { x: t.clientX, y: t.clientY }
      }}
      onTouchEnd={(e) => {
        const st0 = swipe.current
        swipe.current = null
        if (!st0) return
        const t = e.changedTouches[0]
        const dx = t.clientX - st0.x
        const dy = t.clientY - st0.y
        // 옆으로 확실히 민 경우만 (세로 스크롤과 구분). 왼쪽으로 밀면 다음 달
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
        move(dx < 0 ? 1 : -1)
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 className="num" style={{ fontSize: 18, fontWeight: 800 }}>
          {monthTitle(y, m)}
        </h2>
        <div style={{ display: 'flex' }}>
          <button style={arrowBtn} aria-label={L('이전 달', 'Previous month')} onClick={() => move(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button style={arrowBtn} aria-label={L('다음 달', 'Next month')} onClick={() => move(1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
      <div key={off} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', animation: dir ? `${dir} 240ms cubic-bezier(0.2,0.8,0.2,1) both` : undefined }}>
        {weekHead().map((w, wi) => (
          <span key={wi} style={{ fontSize: 12, color: 'var(--mute)', paddingBottom: 2 }}>
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={'e' + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const k = key(i + 1)
          const lifts = byDate.get(k) ?? []
          const bg =
            lifts.length === 0
              ? 'transparent'
              : lifts.length === 1
                ? TH[lifts[0]].acc
                : `linear-gradient(135deg, ${lifts.map((l, j) => `${TH[l].acc} ${(j / lifts.length) * 100}% ${((j + 1) / lifts.length) * 100}%`).join(', ')})`
          const fg = lifts.length === 1 ? TH[lifts[0]].on : lifts.length ? '#ffffff' : 'var(--ink)'
          return (
            <span
              key={k}
              className="num"
              role={lifts.length ? 'button' : undefined}
              aria-label={lifts.length ? L(`${m + 1}월 ${i + 1}일 기록 보기`, `View ${k}`) : undefined}
              onClick={lifts.length ? () => onPick(k) : undefined}
              style={{
                cursor: lifts.length ? 'pointer' : undefined,
                height: 36,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: k === todayKey || lifts.length ? 800 : 500,
                background: bg,
                color: fg,
                boxShadow: k === todayKey && !lifts.length ? 'inset 0 0 0 2px var(--ink)' : undefined,
              }}
            >
              {i + 1}
            </span>
          )
        })}
      </div>
    </section>
  )
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

const EASE = 'cubic-bezier(0.2,0.8,0.2,1)'

export default function Home({ go }: { go: Go }) {
  const s = useApp()
  const [mode, setMode] = useState<'est' | 'act'>('est')
  const [day, setDay] = useState<string | null>(null)
  const [anim, setAnim] = useState<null | { lift: LiftKey; from: Box[]; to: Box[]; phase: 0 | 1 }>(null)
  const root = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLButtonElement | null)[]>([])
  const u = s.settings.unit
  const toggle = () => setMode(mode === 'est' ? 'act' : 'est')
  const series = (['S', 'B', 'D'] as LiftKey[]).map((k) => ({ lift: k, pts: liftPoints(s, k, mode).map((p) => ({ t: p.x, y: p.y })) }))
  const val = (k: LiftKey) => (mode === 'est' ? (latestEst(s, k) ?? s.lifts[k].oneRM) : s.lifts[k].oneRM)
  const sum = CARD_ORDER.reduce((a, k) => a + val(k), 0)

  /** 카드를 누르면 세 카드가 작아지며 위로 올라가 종목 탭이 된다 (목업 HomeFlow) */
  const open = (k: LiftKey) => {
    if (anim) return
    if (s.active?.lift === k) return go({ name: 'workout' })
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return go({ name: 'lift', lift: k })
    const r0 = el.getBoundingClientRect()
    const safeTop = parseFloat(getComputedStyle(el).paddingTop) || 0
    const from = cards.current.map((c) => {
      const r = c!.getBoundingClientRect()
      return { x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height }
    })
    // 종목 화면 탭 위치: 헤더 왼쪽 8 + 뒤로 44 + 4, 오른쪽 12, 탭 사이 4
    const navX = 56
    const navW = r0.width - navX - 12
    const tw = (navW - 8) / 3
    const to = [0, 1, 2].map((i) => ({ x: navX + i * (tw + 4), y: safeTop + 12, w: tw, h: 44 }))
    setAnim({ lift: k, from, to, phase: 0 })
    requestAnimationFrame(() => requestAnimationFrame(() => setAnim((a) => a && { ...a, phase: 1 })))
    setTimeout(() => go({ name: 'lift', lift: k, from: 'home' }), 470)
  }

  const moving = anim?.phase === 1
  const fade: CSSProperties = { opacity: moving ? 0 : 1, transform: moving ? 'translateY(40px)' : undefined, transition: `opacity 220ms ease, transform 380ms ${EASE}` }

  return (
    <div className="screen" ref={root}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 12px 4px 20px', opacity: moving ? 0 : 1, transition: 'opacity 220ms ease' }}>
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>ST LOG</span>
        <button aria-label={L('메뉴 열기', 'Open menu')} onClick={() => go({ name: 'menu' })} style={arrowBtn}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>
      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 20px var(--safe-bot)' }}>
        <div style={fade}>
          <Calendar s={s} onPick={setDay} />
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 6, ...fade }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {L('3대 기록', 'Big 3')}
              <span className="num" style={{ fontSize: 13, fontWeight: 500, color: 'var(--mute)' }}>
                {L('합계', 'Total')} {fmt(sum)}
                {u}
              </span>
            </h2>
            <PillToggle value={mode === 'est' ? 0 : 1} onToggle={toggle} a={L('추정', 'Est.')} b={L('실제', 'Actual')} label={L('그래프 기준 바꾸기', 'Switch chart')} />
          </div>
          <button type="button" onClick={toggle} aria-label={L('눌러서 추정과 실제 전환', 'Tap to switch estimated and actual')} style={{ display: 'block', width: '100%' }}>
            <HomeChart series={series} />
          </button>
        </section>

        <section style={fade}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{L('훈련 기록하기', 'Log a workout')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CARD_ORDER.map((k, i) => (
              <button
                key={k}
                ref={(el) => {
                  cards.current[i] = el
                }}
                onClick={() => open(k)}
                style={{ borderRadius: 16, background: TH[k].acc, color: TH[k].on, padding: 14, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 148, visibility: anim ? 'hidden' : undefined }}
              >
                <CardFace k={k} p={s.lifts[k]} live={s.active?.lift === k} main={mainText(s, k)} />
              </button>
            ))}
          </div>
        </section>
      </main>

      {anim &&
        CARD_ORDER.map((k, i) => {
          const b = moving ? anim.to[i] : anim.from[i]
          const on = anim.lift === k
          const t = `460ms ${EASE}`
          return (
            <div
              key={k}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                borderRadius: moving ? 0 : 16,
                background: moving ? 'transparent' : TH[k].acc,
                color: TH[k].on,
                overflow: 'hidden',
                zIndex: 5,
                transition: `left ${t}, top ${t}, width ${t}, height ${t}, border-radius 460ms ease, background-color 300ms ease`,
              }}
            >
              <div style={{ position: 'absolute', inset: 0, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, opacity: moving ? 0 : 1, transition: 'opacity 180ms ease' }}>
                <CardFace k={k} p={s.lifts[k]} live={false} main={mainText(s, k)} />
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 8, opacity: moving ? 1 : 0, transition: `opacity 260ms ease ${moving ? 200 : 0}ms` }}>
                <span style={{ fontSize: 16, fontWeight: on ? 700 : 500, color: on ? TH[k].text : 'var(--sub)' }}>{TH[k].tab}</span>
                <span style={{ width: on ? '100%' : '60%', height: 3, borderRadius: 2, background: TH[k].acc }} />
              </div>
            </div>
          )
        })}
      {day && <DaySheet date={day} go={go} back={{ name: 'home' }} onClose={() => setDay(null)} />}
      {anim && <div style={{ position: 'absolute', left: 0, right: 0, top: anim.to[0].y + 44, height: 1, background: 'var(--fill)', opacity: moving ? 1 : 0, transition: 'opacity 250ms ease' }} />}
    </div>
  )
}

/** 카드에 보일 이번 훈련 (테스트 날이면 null) */
function mainText(s: AppState, k: LiftKey): string | null {
  const prog = progOf(s)
  const p = s.lifts[k]
  if (atTest(prog, p)) return null
  const m = mainSet(prog, k, p, stepOf(s))
  return m ? `${fmt(m.weight)} × ${repsText(m)}` : null
}

function CardFace({ k, p, live, main }: { k: LiftKey; p: AppState['lifts'][LiftKey]; live: boolean; main: string | null }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 900 }}>{k}</span>
        <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>
          {fmt(p.oneRM)}
        </span>
      </div>
      <span style={{ height: 1, background: 'currentColor', opacity: 0.35 }} />
      <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{live ? L('기록 중', 'In progress') : L('이번 훈련', 'Next')}</span>
      {main === null ? (
        <span style={{ fontSize: 17, fontWeight: 800 }}>{L('1RM 테스트', '1RM test')}</span>
      ) : (
        <span className="num" style={{ fontSize: 17, fontWeight: 800 }}>
          {main}
        </span>
      )}
    </>
  )
}
