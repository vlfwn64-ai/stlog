import { useState } from 'react'
import { Sheet } from './ui'
import { useRef } from 'react'
import type { LiftKey } from './logic/program'
import { CARD_ORDER, TH, fmt } from './theme'

/** 세로 다이얼: 위아래로 끌거나 위·아래 숫자를 눌러 바꾼다 */
export function Dial({ lift, value, step, unit, onChange }: { lift: LiftKey; value: number; step: number; unit: string; onChange: (v: number) => void }) {
  const th = TH[lift]
  const drag = useRef<{ y: number; v: number; moved: boolean } | null>(null)
  const ROW = 22

  return (
    <div
      onPointerDown={(e) => {
        drag.current = { y: e.clientY, v: value, moved: false }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        const n = Math.round((d.y - e.clientY) / ROW)
        if (n !== 0) d.moved = true
        const v = Math.max(0, d.v + n * step)
        if (v !== value) onChange(v)
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (d && !d.moved) {
          // 눌렀으면 위 칸은 올리고 아래 칸은 내린다
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const y = e.clientY - r.top
          if (y < r.height / 3) onChange(value + step)
          else if (y > (r.height * 2) / 3) onChange(Math.max(0, value - step))
        }
      }}
      onPointerCancel={() => (drag.current = null)}
      role="spinbutton"
      aria-label={`${th.name} ${value}${unit}`}
      aria-valuenow={value}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') onChange(value + step)
        if (e.key === 'ArrowDown') onChange(Math.max(0, value - step))
      }}
      style={{ height: 168, borderRadius: 14, border: `2px solid ${th.boxLine}`, display: 'flex', flexDirection: 'column', alignItems: 'stretch', overflow: 'hidden', touchAction: 'none', cursor: 'ns-resize', userSelect: 'none' }}
    >
      <span className="num" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#6B7684' }}>
        {fmt(value + step)}
      </span>
      <span style={{ height: 56, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2, borderTop: '1px solid #F2F4F6', borderBottom: '1px solid #F2F4F6' }}>
        <span className="num" style={{ fontSize: 30, fontWeight: 800, lineHeight: '56px', color: th.text }}>
          {fmt(value)}
        </span>
      </span>
      <span className="num" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#6B7684' }}>
        {fmt(Math.max(0, value - step))}
      </span>
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
              <span style={{ fontSize: 12, color: '#4E5968' }}>{TH[k].name}</span>
            </div>
            <Dial lift={k} value={vals[k]} step={step} unit={unit} onChange={(v) => onChange({ ...vals, [k]: v })} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, paddingTop: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: '#4E5968' }}>3대</span>
        <span className="num" style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
          {fmt(vals.B + vals.D + vals.S)}
        </span>
        <span style={{ fontSize: 17, fontWeight: 600, color: '#4E5968' }}>{unit}</span>
      </div>
    </>
  )
}

/** 원판 최소 단위 고르기 (− [2.5kg] +) */
export const PLATES = { kg: [0.5, 1, 1.25, 2.5, 5], lb: [1, 2.5, 5, 10] }

export function PlatePicker({ value, unit, onChange }: { value: number; unit: 'kg' | 'lb'; onChange: (v: number) => void }) {
  const list = PLATES[unit]
  const i = Math.max(0, list.indexOf(value))
  const round = { width: 56, height: 56, borderRadius: 28, border: '1.5px solid #D1D6DB', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 12 }}>
      <button style={round} aria-label="원판 단위 줄이기" onClick={() => onChange(list[Math.max(0, i - 1)])}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
      <div style={{ width: 150, height: 96, borderRadius: 18, border: '2px solid #191F28', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <span className="num" style={{ fontSize: 44, fontWeight: 800, lineHeight: '92px' }}>
          {list[i]}
        </span>
        <span style={{ fontSize: 17, fontWeight: 600, color: '#4E5968' }}>{unit}</span>
      </div>
      <button style={round} aria-label="원판 단위 늘리기" onClick={() => onChange(list[Math.min(list.length - 1, i + 1)])}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}

/** 장비 고르기 2열 + 기타 추가 */
export function GearGrid({ all, sel, onToggle, onAdd }: { all: string[]; sel: string[]; onToggle: (g: string) => void; onAdd: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
      {all.map((g) => {
        const on = sel.includes(g)
        return (
          <button
            key={g}
            aria-pressed={on}
            onClick={() => onToggle(g)}
            style={{ height: 56, borderRadius: 14, border: `1.5px solid ${on ? '#191F28' : '#E5E8EB'}`, background: on ? '#191F28' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}
          >
            <span style={{ fontSize: 15, fontWeight: on ? 700 : 500, color: on ? '#FFFFFF' : '#333D4B' }}>{g}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: on ? 1 : 0 }}>
              <path d="M5 12l5 5 9-10" />
            </svg>
          </button>
        )
      })}
      <button onClick={onAdd} style={{ height: 56, borderRadius: 14, border: '1.5px dashed #B0B8C1', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15, color: '#4E5968' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        기타 추가
      </button>
    </div>
  )
}

/** 장비 이름 직접 입력 */
export function AddGearSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState('')
  const ok = name.trim().length > 0
  return (
    <Sheet onClose={onClose} title="장비 추가">
      <input
        autoFocus
        value={name}
        maxLength={12}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && ok) onAdd(name.trim())
        }}
        placeholder="장비 이름"
        style={{ height: 56, borderRadius: 14, border: '1.5px solid #191F28', padding: '0 16px', fontSize: 17, outline: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ width: 110, height: 56, borderRadius: 14, background: '#F2F4F6', fontSize: 16, fontWeight: 700, color: '#333D4B' }}>
          취소
        </button>
        <button disabled={!ok} onClick={() => onAdd(name.trim())} style={{ flex: 1, height: 56, borderRadius: 14, background: '#191F28', color: '#FFFFFF', fontSize: 17, fontWeight: 700, opacity: ok ? 1 : 0.4 }}>
          추가
        </button>
      </div>
    </Sheet>
  )
}
