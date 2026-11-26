import { L } from '../i18n'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { TH } from '../theme'

const steps = (): [string, string][] => [
  [L('훈련 시작', 'Start a workout'), L('오늘 할 웜업, 탑세트, 백오프 무게를 알려줘요. 세트가 끝나면 RPE만 고르세요. 다음 무게는 앱이 정해요.', 'See today’s warm-up, top set and back-off weights. After each set, just pick an RPE. The app sets your next weights.')],
  [L('기록 중', 'Logging'), L('W는 웜업, T는 탑세트, B는 백오프예요. 무게와 횟수는 눌러서 고칠 수 있고, 탑세트·백오프는 완료를 누르면 RPE를 골라요. 웜업을 다 하면 한 줄로 접히고, 아래 타이머가 쉬는 시간을 재줘요. 무게나 횟수를 누르면 세트를 추가하거나 지울 수도 있어요.', 'W is warm-up, T is top set, B is back-off. Tap weight or reps to change them, and tap done on a top or back-off set to pick its RPE. Finished warm-ups fold into one line, and the timer below tracks your rest. Tapping weight or reps also lets you add or delete sets.')],
  [L('디로드', 'Deload'), L('오늘 컨디션이 안 좋다면 디로딩을 해보아요. 오늘만 65% 무게로 가볍게 하고, 다음 훈련은 원래 무게로 돌아가요.', 'Not feeling it today? Deload. Go light at 65% just for today, and your next workout returns to the usual weights.')],
  [L('다음 단계로', 'Next stage'), L('5회 → 3회 → 2회 → 테스트 순서로 진행돼요. 2회 연속 무게가 안 오르면 자동으로 다음 단계로 넘어가요. 버튼으로 직접 넘길 수도 있어요.', 'You go from 5s → 3s → 2s → test. If the weight stalls two sessions in a row, you move to the next stage automatically. You can also move on with the button.')],
  [L('TEST하기', 'Test now'), L('당신의 한계를 시험해보세요. 언제든 1RM 테스트를 할 수 있고, 끝나면 새 사이클을 시작할지 지금 사이클을 이어갈지 고를 수 있어요.', 'Test your limit. You can run a 1RM test anytime, then choose to start a new cycle or keep the current one.')],
  [L('1RM 추이', '1RM trend'), L('그래프를 누르면 추정 1RM과 테스트로 잰 실제 1RM이 번갈아 보여요.', 'Tap the chart to switch between your estimated 1RM and the actual 1RM from tests.')],
]

const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', borderRadius: 12, padding: '8px 12px' }
const chip = (bg: string, fg: string): CSSProperties => ({ width: 28, height: 28, borderRadius: 7, background: bg, color: fg, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' })

function Picture({ i }: { i: number }) {
  const b = TH.B
  if (i === 0)
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          [L('탑세트', 'Top set'), '115kg × 3'],
          [L('백오프', 'Back-off'), '95kg × 6 × 3'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--sub)', background: 'var(--surface)', borderRadius: 12, padding: '12px 14px' }}>
            <span>{k}</span>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{v}</span>
          </div>
        ))}
        <div style={{ height: 56, borderRadius: 14, background: b.acc, color: b.on, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700 }}>{L('훈련 시작', 'Start workout')}</div>
      </div>
    )
  if (i === 1)
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={row}>
          <span style={chip('var(--fill)', 'var(--sub)')}>W</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{L('웜업 5세트 완료', 'Warm-up · 5 sets done')}</span>
          <span style={{ fontSize: 12, color: 'var(--mute)' }}>{L('접힘', 'Folded')}</span>
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
          <span style={{ fontSize: 12, color: 'var(--mute)' }}>{L('쉬는 시간', 'Rest')}</span>
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
          <span style={{ fontSize: 15, color: 'var(--sub)' }}>{L('오늘만', 'Today only')}</span>
          <span style={{ fontSize: 48, fontWeight: 800 }}>65%</span>
        </div>
        <div style={{ width: 120, height: 56, borderRadius: 14, border: '1px solid var(--line2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}>{L('디로드', 'Deload')}</div>
      </div>
    )
  if (i === 3)
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700 }}>
          {[L('5회', '5s'), L('3회', '3s'), L('2회', '2s'), 'TEST'].map((t, k) => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {k > 0 && <span style={{ color: 'var(--faint)' }}>→</span>}
              <span style={{ padding: '8px 12px', borderRadius: 10, background: k === 1 ? b.acc : 'var(--surface)', color: k === 1 ? b.on : 'var(--sub)' }}>{t}</span>
            </span>
          ))}
        </div>
        <div style={{ width: 160, height: 44, borderRadius: 12, border: '1px solid var(--line2)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--ink2)' }}>{L('다음 단계로', 'Next stage')}</div>
      </div>
    )
  if (i === 4)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 180, height: 120, borderRadius: 18, background: b.acc, color: b.on, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{L('1차 시도', 'Attempt 1')}</span>
          <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>120</span>
        </div>
        <div style={{ width: 160, height: 44, borderRadius: 12, border: `1.5px solid ${b.line}`, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: b.deep }}>{L('TEST하기', 'Test now')}</div>
      </div>
    )
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 2, padding: 4, borderRadius: 999, background: 'var(--line)' }}>
        <span style={{ height: 32, padding: '0 14px', borderRadius: 999, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, background: 'var(--surface)' }}>{L('추정', 'Est.')}</span>
        <span style={{ height: 32, padding: '0 14px', borderRadius: 999, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>{L('실제', 'Actual')}</span>
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
  const STEPS = steps()
  const last = i === STEPS.length - 1
  return (
    <div className="screen">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 0 20px' }}>
        <span className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--sub)' }}>
          {L('사용법', 'How to')} {i + 1} / {STEPS.length}
        </span>
        <button onClick={onDone} style={{ height: 44, padding: '0 8px', fontSize: 15, fontWeight: 600, color: 'var(--sub)' }}>
          {L('건너뛰기', 'Skip')}
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
              {L('이전', 'Back')}
            </button>
          )}
          <button onClick={() => (last ? onDone() : setI(i + 1))} style={{ flex: 1, height: 56, borderRadius: 14, background: 'var(--ink)', color: 'var(--onInk)', fontSize: 17, fontWeight: 700 }}>
            {last ? L('시작하기', 'Get started') : L('다음', 'Next')}
          </button>
        </div>
      </div>
    </div>
  )
}
