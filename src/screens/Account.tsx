import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { choose, linkedProviders, providerOf, push, retrySync, signIn, signOut, useCloud } from '../cloud'
import type { Provider } from '../cloud'
import { L, isEn, timesLabel } from '../i18n'
import type { AppState } from '../store'
import { resetAll, useApp } from '../store'
import { md } from '../theme'
import { Confirm, Sheet, SummaryRows } from '../ui'

const big: CSSProperties = { height: 56, borderRadius: 14, fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }

/** 로고 + 부제 (시작 화면과 로그인 화면이 같은 자리에) */
function Brand() {
  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: '0 24px' }}>
      <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>ST LOG</span>
      <p style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 600, color: 'var(--sub)' }}>{L('3대 500 약대생의 파워리프팅 전용 앱', 'A powerlifting app by a pharmacy student with a 500kg total')}</p>
    </main>
  )
}

/** 로그인 화면: 시작 화면에 버튼만 나타난다 (카카오는 카카오 노란색) */
export function LoginScreen() {
  const [busy, setBusy] = useState<Provider | null>(null)
  // 카카오·구글 로그인 화면에서 뒤로 오면 (페이지가 그대로 복원돼도) 버튼을 다시 누를 수 있게
  useEffect(() => {
    const reset = () => setBusy(null)
    const vis = () => document.visibilityState === 'visible' && reset()
    window.addEventListener('pageshow', reset)
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('pageshow', reset)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])
  const go = (p: Provider) => {
    setBusy(p)
    void signIn(p).catch(() => setBusy(null))
  }
  return (
    <div className="screen">
      <Brand />
      <div style={{ animation: 'up 420ms cubic-bezier(0.2,0.8,0.2,1) both' }}>
        <LoginButtons busy={busy} onPick={go} />
      </div>
    </div>
  )
}

/** 로그인 버튼 + 안내. 시작 화면에서는 안 보이게 자리만 차지한다 (로고 위치를 맞추려고) */
function LoginButtons({ busy, onPick }: { busy: Provider | null; onPick: (p: Provider) => void }) {
  return (
    <div style={{ padding: '12px 20px var(--safe-bot)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button disabled={!!busy} onClick={() => onPick('kakao')} style={{ ...big, background: '#FEE500', color: 'rgba(0,0,0,0.85)', opacity: busy && busy !== 'kakao' ? 0.5 : 1 }}>
        {busy === 'kakao' ? L('연결 중…', 'Connecting…') : L('카카오로 시작하기', 'Continue with Kakao')}
      </button>
      <button disabled={!!busy} onClick={() => onPick('google')} style={{ ...big, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line2)', opacity: busy && busy !== 'google' ? 0.5 : 1 }}>
        {busy === 'google' ? L('연결 중…', 'Connecting…') : L('Google로 시작하기', 'Continue with Google')}
      </button>
      <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--faint)', textAlign: 'center', paddingTop: 4 }}>
        {L('로그인하면 기록이 클라우드에 저장돼요. ', 'Your log is saved to the cloud. ')}
        <a href={`${import.meta.env.BASE_URL}privacy.html${isEn() ? '#en' : ''}`} target="_blank" rel="noreferrer" style={{ color: 'var(--mute)', textDecoration: 'underline' }}>
          {L('개인정보처리방침', 'Privacy policy')}
        </a>
      </p>
    </div>
  )
}

/** 시작 화면: 로고 + 부제. 로그인 확인·첫 동기화 중에도 이 화면 (서버 연결 실패면 다시 시도) */
export function Splash({ loading }: { loading?: boolean }) {
  const c = useCloud()
  const failed = c.status === 'error' && !!c.session && !c.ready
  return (
    <div className="screen">
      <Brand />
      <div style={{ position: 'relative' }}>
        <div aria-hidden="true" style={{ visibility: 'hidden' }}>
          <LoginButtons busy={null} onPick={() => {}} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 20px var(--safe-bot)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12 }}>
        {(failed || loading) && (
          <span style={{ fontSize: 14, color: 'var(--sub)', textAlign: 'center', animation: 'fadeIn 300ms ease both' }}>
            {failed ? L('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.', 'Couldn’t reach the server. Check your connection.') : L('기록을 불러오는 중…', 'Loading your log…')}
          </span>
        )}
        {failed && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => void signOut()} style={{ width: 110, flexShrink: 0, height: 56, borderRadius: 14, background: 'var(--fill)', fontSize: 16, fontWeight: 700, color: 'var(--ink2)' }}>
              {L('로그아웃', 'Sign out')}
            </button>
            <button onClick={retrySync} style={{ ...big, flex: 1, background: 'var(--ink)', color: 'var(--onInk)' }}>
              {L('다시 시도', 'Try again')}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
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
  const s = useApp()
  const [wipe, setWipe] = useState(false)
  const p = providerOf(c.session)
  const who = (c.session?.user.user_metadata?.full_name as string | undefined) ?? (c.session?.user.user_metadata?.name as string | undefined) ?? c.session?.user.email ?? ''
  const status = c.status === 'syncing' ? L('맞추는 중…', 'Syncing…') : c.status === 'error' ? L('연결 안 됨', 'Offline') : timeOf(c.lastSync)
  if (wipe)
    return (
      <Confirm
        eyebrow={L('계정 · 초기화', 'Account · Reset')}
        title={L('정말 초기화할까요?', 'Really reset everything?')}
        rows={[
          [L('훈련 기록', 'Workouts'), timesLabel(s.sessions.length)],
          [L('1RM 테스트', '1RM tests'), timesLabel(s.tests.length)],
          [L('지워지는 곳', 'Erased from'), L('이 기기와 계정 모두', 'This device and your account')],
          [L('되돌리기', 'Undo'), <span key="undo" style={{ color: '#D92B3A', fontWeight: 800 }}>{L('불가', 'Not possible')}</span>],
        ]}
        cta={L('초기화', 'Reset')}
        onCancel={() => setWipe(false)}
        onOk={() => {
          resetAll()
          onClose()
        }}
      />
    )
  return (
    <Sheet onClose={onClose} title={L('계정', 'Account')}>
      <SummaryRows
        rows={[
          [L('로그인', 'Signed in with'), p === 'kakao' ? L('카카오', 'Kakao') : 'Google'],
          ...(linkedProviders(c.session).length > 1
            ? ([[L('연결된 로그인', 'Linked'), linkedProviders(c.session).map((x) => (x === 'kakao' ? L('카카오', 'Kakao') : 'Google')).join(' · ')]] as [string, string][])
            : []),
          ...(who ? ([[L('이름', 'Name'), who]] as [string, string][]) : []),
          [L('마지막 동기화', 'Last sync'), status],
        ]}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setWipe(true)} style={{ width: 110, flexShrink: 0, height: 56, borderRadius: 14, background: 'var(--fill)', fontSize: 16, fontWeight: 700, color: '#D92B3A' }}>
          {L('초기화', 'Reset')}
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
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--sub)', padding: '0 4px' }}>{L('고르지 않은 쪽 기록은 지워져요.', 'The other log will be replaced.')}</p>
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
