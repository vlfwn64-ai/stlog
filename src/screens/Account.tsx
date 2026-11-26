import type { CSSProperties } from 'react'
import { choose, providerOf, push, signIn, signOut, useCloud } from '../cloud'
import { L, timesLabel } from '../i18n'
import type { AppState } from '../store'
import { useApp } from '../store'
import { md } from '../theme'
import { Sheet, SummaryRows } from '../ui'

const big: CSSProperties = { height: 56, borderRadius: 14, fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }

/** 로그인 버튼 두 개 (카카오는 카카오 노란색) */
export function LoginSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose} title={L('로그인', 'Sign in')}>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--sub)', padding: '0 4px' }}>
        {L('로그인하면 기록이 클라우드에 저장되고 다른 기기와 맞춰져요.', 'Sign in to keep your log in the cloud and in sync across devices.')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => signIn('kakao')} style={{ ...big, background: '#FEE500', color: 'rgba(0,0,0,0.85)' }}>
          {L('카카오로 계속하기', 'Continue with Kakao')}
        </button>
        <button onClick={() => signIn('google')} style={{ ...big, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line2)' }}>
          {L('Google로 계속하기', 'Continue with Google')}
        </button>
      </div>
    </Sheet>
  )
}

const timeOf = (t?: number) => {
  if (!t) return '–'
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 로그인한 뒤 계정 화면 */
export function AccountSheet({ onClose }: { onClose: () => void }) {
  const c = useCloud()
  const p = providerOf(c.session)
  const who = (c.session?.user.user_metadata?.full_name as string | undefined) ?? (c.session?.user.user_metadata?.name as string | undefined) ?? c.session?.user.email ?? ''
  const status = c.status === 'syncing' ? L('맞추는 중…', 'Syncing…') : c.status === 'error' ? L('연결 안 됨', 'Offline') : timeOf(c.lastSync)
  return (
    <Sheet onClose={onClose} title={L('계정', 'Account')}>
      <SummaryRows
        rows={[
          [L('로그인', 'Signed in with'), p === 'kakao' ? L('카카오', 'Kakao') : 'Google'],
          ...(who ? ([[L('이름', 'Name'), who]] as [string, string][]) : []),
          [L('마지막 동기화', 'Last sync'), status],
        ]}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={async () => {
            await signOut()
            onClose()
          }}
          style={{ width: 110, flexShrink: 0, height: 56, borderRadius: 14, background: 'var(--fill)', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}
        >
          {L('로그아웃', 'Sign out')}
        </button>
        <button onClick={() => void push()} style={{ ...big, flex: 1, background: 'var(--ink)', color: 'var(--onInk)' }}>
          {L('지금 동기화', 'Sync now')}
        </button>
      </div>
    </Sheet>
  )
}

const summary = (s: AppState): string => {
  const last = [...s.sessions].map((x) => x.date).sort().pop()
  return `${L('훈련', 'Workouts')} ${timesLabel(s.sessions.length)}${last ? ` · ${L('마지막', 'last')} ${md(last)}` : ''}`
}

/** 처음 로그인했는데 이 기기·클라우드 둘 다 기록이 있을 때 */
export function ChoiceSheet() {
  const c = useCloud()
  const s = useApp()
  if (!c.choice) return null
  return (
    <Sheet onClose={() => {}} locked eyebrow={L('로그인 완료', 'Signed in')} title={L('어느 기록을 쓸까요?', 'Which log should we keep?')}>
      <SummaryRows
        rows={[
          [L('이 기기', 'This device'), summary(s)],
          [L('클라우드', 'Cloud'), summary(c.choice.remote)],
        ]}
      />
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--sub)', padding: '0 4px' }}>{L('고르지 않은 쪽 기록은 지워져요. 걱정되면 먼저 설정 › 백업 내보내기를 해 두세요.', 'The other log will be replaced. If unsure, export a backup first in Settings.')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => void choose('remote')} style={{ ...big, background: 'var(--ink)', color: 'var(--onInk)' }}>
          {L('클라우드 기록 쓰기', 'Use cloud log')}
        </button>
        <button onClick={() => void choose('local')} style={{ ...big, background: 'var(--fill)', color: 'var(--ink2)' }}>
          {L('이 기기 기록 쓰기', 'Use this device')}
        </button>
      </div>
    </Sheet>
  )
}
