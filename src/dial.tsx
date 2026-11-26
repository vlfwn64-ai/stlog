import { L } from './i18n'
import { useRef, useState } from 'react'
import { Sheet } from './ui'
import type { LiftKey } from './logic/program'
import { CARD_ORDER, TH, fmt, gearName } from './theme'

/** 세로 다이얼: 위아래로 끌거나 위·아래 숫자를 눌러 바꾼다 */
export function Dial({ lift, value, step, unit, onChange }: { lift: LiftKey; value: number; step: number; unit: string; onChange: (v: number) => void }) {
  const th = TH[lift]
  const ROW = 56
  // 위는 작은 수, 아래는 큰 수. 손가락을 올리면 아래 큰 수가 가운데로 올라온다
  const drag = useRef<{ y: number; v: number; moved: boolean } | null>(null)
  const [off, setOff] = useState(0)
  const [snap, setSnap] = useState(false)

  const shift = (n: number, from = n * ROW) => {
    const v = Math.max(0, value + n * step)
    if (v === value) {
      setSnap(true)
      setOff(0)
      return
    }
    onChange(v)
    // 새 값이 원래 자리에서 가운데로 미끄러져 오게
    setSnap(false)
    setOff(from)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setSnap(true)
        setOff(0)
      }),
    )
  }

  const items = [-2, -1, 0, 1, 2].map((i) => value + i * step)
  return (
    <div
      onPointerDown={(e) => {
        drag.current = { y: e.clientY, v: value, moved: false }
        setSnap(false)
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        const dy = e.clientY - d.y
        if (Math.abs(dy) > 4) d.moved = true
        // 위로 끌면(dy<0) 값이 커진다
        const n = Math.trunc(-dy / ROW)
        const v = Math.max(0, d.v + n * step)
        if (v !== value) onChange(v)
        const used = (v - d.v) / step
        setOff(dy + used * ROW)
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (!d) return
        if (!d.moved) {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const y = e.clientY - r.top
          if (y < r.height / 3) shift(-1)
          else if (y > (r.height * 2) / 3) shift(1)
          return
        }
        // 반 칸 넘게 끌었으면 한 칸 더 넘긴다
        if (off < -ROW / 2) shift(1, off + ROW)
        else if (off > ROW / 2) shift(-1, off - ROW)
        else {
          setSnap(true)
          setOff(0)
        }
      }}
      onPointerCancel={() => {
        drag.current = null
        setSnap(true)
        setOff(0)
      }}
      role="spinbutton"
      aria-label={`${th.name} ${value}${unit}`}
      aria-valuenow={value}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') shift(-1)
        if (e.key === 'ArrowDown') shift(1)
      }}
      style={{ position: 'relative', height: 168, borderRadius: 14, border: `2px solid ${th.boxLine}`, overflow: 'hidden', touchAction: 'none', cursor: 'ns-resize', userSelect: 'none' }}
    >
      <span style={{ position: 'absolute', left: 0, right: 0, top: ROW, height: ROW, borderTop: '1px solid var(--fill)', borderBottom: '1px solid var(--fill)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: -ROW, transform: `translateY(${off}px)`, transition: snap ? 'transform 220ms cubic-bezier(0.2,0.8,0.2,1)' : 'none' }}>
        {items.map((v, i) => {
          // 가운데에서 떨어진 정도 (0 = 가운데)
          const dist = Math.min(1, Math.abs((i - 2) * ROW + off) / ROW)
          return (
            <div key={i} style={{ height: ROW, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {v >= 0 && (
                <span className="num" style={{ fontSize: 30 - 15 * dist, fontWeight: dist < 0.5 ? 800 : 400, color: dist < 0.5 ? th.text : 'var(--mute)', lineHeight: 1 }}>
                  {fmt(v)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 세 종목 다이얼 + 3대 합계 (온보딩 1·2단계, 설정의 1RM·목표) */
export function DialSet({ vals, unit, onChange }: { vals: Record<LiftKey, number>; unit: string; onChange: (v: Record<LiftKey, number>) => void }) {
  const step = unit === 'kg' ? 5 : 10
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {CARD_ORDER.map((k) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: 76, borderRadius: 14, background: TH[k].tint, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, color: TH[k].text }}>{k}</span>
              <span style={{ fontSize: 12, color: 'var(--sub)' }}>{TH[k].name}</span>
            </div>
            <Dial lift={k} value={vals[k]} step={step} unit={unit} onChange={(v) => onChange({ ...vals, [k]: v })} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, paddingTop: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--sub)' }}>{L('3대', 'Total')}</span>
        <span className="num" style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
          {fmt(vals.B + vals.D + vals.S)}
        </span>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--sub)' }}>{unit}</span>
      </div>
    </>
  )
}

/** 원판 최소 단위 고르기 (− [2.5kg] +) */
export const PLATES = { kg: [0.5, 1, 1.25, 2.5, 5], lb: [1, 2.5, 5, 10] }

export function PlatePicker({ value, unit, onChange }: { value: number; unit: 'kg' | 'lb'; onChange: (v: number) => void }) {
  const list = PLATES[unit]
  const i = Math.max(0, list.indexOf(value))
  const round = { width: 56, height: 56, borderRadius: 28, border: '1.5px solid var(--line2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 12 }}>
      <button style={round} aria-label={L('원판 단위 줄이기', 'Smaller plate')} onClick={() => onChange(list[Math.max(0, i - 1)])}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
      <div style={{ width: 150, height: 96, borderRadius: 18, border: '2px solid var(--ink)', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <span className="num" style={{ fontSize: 44, fontWeight: 800, lineHeight: '92px' }}>
          {list[i]}
        </span>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--sub)' }}>{unit}</span>
      </div>
      <button style={round} aria-label={L('원판 단위 늘리기', 'Larger plate')} onClick={() => onChange(list[Math.min(list.length - 1, i + 1)])}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}

/** 장비 고르기 2열 + 기타 추가 */
export function GearGrid({ all, sel, onToggle, onAdd, deleting, onDelete }: { all: string[]; sel: string[]; onToggle: (g: string) => void; onAdd: () => void; deleting?: boolean; onDelete?: (g: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
      {all.map((g) => {
        const on = sel.includes(g)
        if (deleting)
          return (
            <button
              key={g}
              aria-label={L(`${g} 삭제`, `Delete ${gearName(g)}`)}
              onClick={() => onDelete?.(g)}
              style={{ height: 56, borderRadius: 14, border: '1.5px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 0 16px' }}
            >
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink2)' }}>{gearName(g)}</span>
              <span style={{ width: 24, height: 24, borderRadius: 12, background: '#D92B3A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14" />
                </svg>
              </span>
            </button>
          )
        return (
          <button
            key={g}
            aria-pressed={on}
            onClick={() => onToggle(g)}
            style={{ height: 56, borderRadius: 14, border: `1.5px solid ${on ? 'var(--ink)' : 'var(--line)'}`, background: on ? 'var(--ink)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}
          >
            <span style={{ fontSize: 15, fontWeight: on ? 700 : 500, color: on ? 'var(--onInk)' : 'var(--ink2)' }}>{gearName(g)}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: on ? 1 : 0 }}>
              <path d="M5 12l5 5 9-10" />
            </svg>
          </button>
        )
      })}
      {!deleting && (
      <button onClick={onAdd} style={{ height: 56, borderRadius: 14, border: '1.5px dashed var(--line3)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15, color: 'var(--sub)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {L('기타 추가', 'Add other')}
      </button>
      )}
    </div>
  )
}

/** 장비 이름 직접 입력 */
export function AddGearSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState('')
  const ok = name.trim().length > 0
  return (
    <Sheet onClose={onClose} title={L('장비 추가', 'Add gear')}>
      <input
        autoFocus
        value={name}
        maxLength={12}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && ok) onAdd(name.trim())
        }}
        placeholder={L('장비 이름', 'Gear name')}
        style={{ height: 56, borderRadius: 14, border: '1.5px solid var(--ink)', padding: '0 16px', fontSize: 17, outline: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ width: 110, height: 56, borderRadius: 14, background: 'var(--fill)', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}>
          {L('취소', 'Cancel')}
        </button>
        <button disabled={!ok} onClick={() => onAdd(name.trim())} style={{ flex: 1, height: 56, borderRadius: 14, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 17, fontWeight: 700, opacity: ok ? 1 : 0.4 }}>
          {L('추가', 'Add')}
        </button>
      </div>
    </Sheet>
  )
}
