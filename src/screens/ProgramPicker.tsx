import { L } from '../i18n'
import type { Level, ProgramId } from '../logic/programs'
import { byLevel, levelName } from '../logic/programs'

/** 수준 탭 (초급·중급·고급) */
export function LevelTabs({ value, rec, onChange }: { value: Level; rec?: Level; onChange: (lv: Level) => void }) {
  return (
    <div role="group" aria-label={L('수준', 'Level')} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', background: 'var(--fill)', borderRadius: 12, padding: 3 }}>
      {([0, 1, 2] as Level[]).map((lv) => {
        const on = lv === value
        return (
          <button
            key={lv}
            aria-pressed={on}
            onClick={() => onChange(lv)}
            style={{ height: 40, borderRadius: 10, fontSize: 15, background: on ? 'var(--pill)' : 'transparent', fontWeight: on ? 700 : 500, color: on ? 'var(--ink)' : 'var(--sub)', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : 'none', whiteSpace: 'nowrap' }}
          >
            {levelName(lv)}
            {rec === lv ? ` · ${L('추천', 'pick')}` : ''}
          </button>
        )
      })}
    </div>
  )
}

/** 프로그램 두 개 중 고르기. compact면 이름·흐름만 (설정) */
export function ProgramCards({ level, value, current, compact, onChange }: { level: Level; value: ProgramId; current?: ProgramId; compact?: boolean; onChange: (id: ProgramId) => void }) {
  return (
    <div role="radiogroup" aria-label={L('프로그램', 'Program')} style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 10 }}>
      {byLevel(level).map((p) => {
        const on = p.id === value
        return (
          <button
            key={p.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(p.id)}
            style={{
              textAlign: 'left',
              borderRadius: compact ? 14 : 16,
              border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
              background: 'var(--surface)',
              padding: compact ? '14px 16px' : 16,
              display: 'flex',
              gap: 12,
              alignItems: compact ? 'center' : 'flex-start',
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 22, height: 22, flexShrink: 0, marginTop: compact ? 0 : 1, borderRadius: 11, border: on ? 'none' : '2px solid var(--line2)', background: on ? 'var(--ink)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--onInk)', opacity: on ? 1 : 0 }} />
            </span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: compact ? 2 : 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: compact ? 16 : 17, fontWeight: 800, color: 'var(--ink)' }}>{p.name()}</span>
                {!compact && p.rec && <span style={{ height: 20, padding: '0 7px', borderRadius: 6, background: '#E8F0FE', color: '#1B64DA', fontSize: 12, fontWeight: 700, lineHeight: '20px' }}>{L('추천', 'Pick')}</span>}
                {current === p.id && <span style={{ height: 20, padding: '0 7px', borderRadius: 6, background: 'var(--fill)', color: 'var(--ink2)', fontSize: 12, fontWeight: 700, lineHeight: '20px' }}>{L('지금', 'Now')}</span>}
              </span>
              {!compact && <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--sub)' }}>{p.desc()}</span>}
              <span className="num" style={{ fontSize: 13, fontWeight: compact ? 400 : 700, color: compact ? 'var(--sub)' : 'var(--ink2)' }}>
                {p.flow()}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
