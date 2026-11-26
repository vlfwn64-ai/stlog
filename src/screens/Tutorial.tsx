import { useState } from 'react'
import type { CSSProperties } from 'react'
import { TH } from '../theme'

const STEPS: [string, string][] = [
  ['훈련 시작', '오늘 할 웜업, 탑세트, 백오프 무게를 알려줘요. 세트가 끝나면 RPE만 고르세요. 다음 무게는 앱이 정해요.'],
  ['기록 중', 'W는 웜업, T는 탑세트, B는 백오프예요. 무게와 횟수는 눌러서 고칠 수 있고, 탑세트·백오프는 완료를 누르면 RPE를 골라요. 웜업을 다 하면 한 줄로 접히고, 아래 타이머가 쉬는 시간을 재줘요. 무게나 횟수를 누르면 세트를 추가하거나 지울 수도 있어요.'],
  ['디로드', '오늘 컨디션이 안 좋다면 디로딩을 해보아요. 오늘만 65% 무게로 가볍게 하고, 다음 훈련은 원래 무게로 돌아가요.'],
  ['다음 단계로', '5회 → 3회 → 2회 → 테스트 순서로 진행돼요. 2회 연속 무게가 안 오르면 자동으로 다음 단계로 넘어가요. 버튼으로 직접 넘길 수도 있어요.'],
  ['TEST하기', '당신의 한계를 시험해보세요. 언제든 1RM 테스트를 할 수 있고, 끝나면 새 사이클을 시작할지 지금 사이클을 이어갈지 고를 수 있어요.'],
  ['1RM 추이', '그래프를 누르면 추정 1RM과 테스트로 잰 실제 1RM이 번갈아 보여요.'],
]

const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', borderRadius: 12, padding: '8px 12px' }
const chip = (bg: string, fg: string): CSSProperties => ({ width: 28, height: 28, borderRadius: 7, background: bg, color: fg, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' })

function Picture({ i }: { i: number }) {
  const b = TH.B
  if (i === 0)
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          ['탑세트', '115kg × 3'],
          ['백오프', '95kg × 6 × 3'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--sub)', background: 'var(--surface)', borderRadius: 12, padding: '12px 14px' }}>
            <span>{k}</span>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{v}</span>
          </div>
        ))}
        <div style={{ height: 56, borderRadius: 14, background: b.acc, color: b.on, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700 }}>훈련 시작</div>
      </div>
    )
  if (i === 1)
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={row}>
          <span style={chip('var(--fill)', 'var(--sub)')}>W</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>웜업 5세트 완료</span>
          <span style={{ fontSize: 12, color: 'var(--mute)' }}>접힘</span>
        </div>
        <div style={row}>
          <span style={chip(b.acc, b.on)}>T</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>115kg × 3</span>
          <span style={{ width: 28, height: 28, borderRadius: 14, background: b.acc, color: b.on, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>9</span>
        </div>
        <div style={row}>
          <span style={chip(b.tint, b.deep)}>B</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>95kg × 6</span>
          <span style={{ width: 28, height: 28, borderRadius: 14, border: '2px solid var(--line2)' }} />
        </div>
        <div style={{ ...row, justifyContent: 'space-between', padding: '10px 12px' }}>
          <span style={{ fontSize: 12, color: 'var(--mute)' }}>쉬는 시간</span>
          <span className="num" style={{ fontSize: 20, fontWeight: 800 }}>
            1:12
          </span>
        </div>
      </div>
    )
  if (i === 2)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 15, color: 'var(--sub)' }}>오늘만</span>
          <span style={{ fontSize: 48, fontWeight: 800 }}>65%</span>
        </div>
        <div style={{ width: 120, height: 56, borderRadius: 14, border: '1px solid var(--line2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}>디로드</div>
      </div>
    )
  if (i === 3)
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
          {['5회', '3회', '2회', 'TEST'].map((t, k) => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {k > 0 && <span style={{ color: 'var(--faint)' }}>→</span>}
              <span style={{ padding: '8px 12px', borderRadius: 10, background: k === 1 ? b.acc : 'var(--surface)', color: k === 1 ? b.on : 'var(--sub)' }}>{t}</span>
            </span>
          ))}
        </div>
        <div style={{ width: 160, height: 44, borderRadius: 12, border: '1px solid var(--line2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--ink2)' }}>다음 단계로</div>
      </div>
    )
  if (i === 4)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 180, height: 120, borderRadius: 18, background: b.acc, color: b.on, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>1차 시도</span>
          <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>120</span>
        </div>
        <div style={{ width: 160, height: 44, borderRadius: 12, border: `1.5px solid ${b.line}`, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: b.deep }}>TEST하기</div>
      </div>
    )
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 2, padding: 4, borderRadius: 999, background: 'var(--line)' }}>
        <span style={{ height: 32, padding: '0 14px', borderRadius: 999, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, background: 'var(--surface)' }}>추정</span>
        <span style={{ height: 32, padding: '0 14px', borderRadius: 999, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>실제</span>
      </div>
      <svg width="280" height="110" viewBox="0 0 280 110" aria-hidden="true">
        <defs>
          <linearGradient id="tutFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={b.acc} stopOpacity="0.28" />
            <stop offset="100%" stopColor={b.acc} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="10,90 55,80 100,74 145,60 190,52 235,40 270,28 270,100 10,100" fill="url(#tutFill)" />
        <polyline points="10,90 55,80 100,74 145,60 190,52 235,40 270,28" fill="none" stroke={b.acc} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="270" cy="28" r="5" fill={b.acc} />
      </svg>
    </div>
  )
}

export default function Tutorial({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const last = i === STEPS.length - 1
  return (
    <div className="screen">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 0 20px' }}>
        <span className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--sub)' }}>
          사용법 {i + 1} / {STEPS.length}
        </span>
        <button onClick={onDone} style={{ height: 44, padding: '0 8px', fontSize: 15, fontWeight: 600, color: 'var(--sub)' }}>
          건너뛰기
        </button>
      </header>
      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '16px 20px 0' }}>
        <div key={i} style={{ height: 300, flexShrink: 0, borderRadius: 24, background: 'var(--fill2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 220ms ease' }}>
          <Picture i={i} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>{STEPS[i][0]}</h1>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--sub)' }}>{STEPS[i][1]}</p>
        </div>
      </main>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '12px 20px var(--safe-bot)' }}>
        <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
          {STEPS.map((_, k) => (
            <span key={k} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, background: k === i ? 'var(--ink)' : 'var(--line2)', transition: 'width 200ms ease' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          {i > 0 && (
            <button onClick={() => setI(i - 1)} style={{ width: 96, height: 56, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}>
              이전
            </button>
          )}
          <button onClick={() => (last ? onDone() : setI(i + 1))} style={{ flex: 1, height: 56, borderRadius: 14, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 17, fontWeight: 700 }}>
            {last ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
