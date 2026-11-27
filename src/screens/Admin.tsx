// 관리자 화면: 사용자 전체 요약 (관리자 계정만, 서버 함수 admin_users)
import { useEffect, useState } from 'react'
import type { Go } from '../App'
import type { AdminRow } from '../cloud'
import { adminUsers } from '../cloud'
import { L } from '../i18n'
import type { LiftKey } from '../logic/program'
import { programOf } from '../logic/programs'
import { TIERS, tierInfo } from '../logic/tiers'
import type { AppState } from '../store'
import { step as stepOf, today } from '../store'
import { CARD_ORDER, TH, fmt, md } from '../theme'
import { Badge } from './Tier'

const DAY = 86400000
const total = (d: AppState) => CARD_ORDER.reduce((a, k) => a + (d.lifts[k]?.oneRM ?? 0), 0)
const tierOfUser = (d: AppState) => {
  const b = d.settings?.body
  if (!b || !d.onboarded) return null
  return tierInfo(total(d), b.weight, b.sex, d.settings.unit, stepOf(d))
}
const lastSession = (d: AppState) => d.sessions?.reduce<string | null>((a, x) => (!a || x.date > a ? x.date : a), null) ?? null
const daysAgo = (date: string) => Math.round((new Date(today()).getTime() - new Date(date).getTime()) / DAY)
const ago = (iso: string | null) => {
  if (!iso) return '–'
  const n = daysAgo(iso.slice(0, 10))
  return n <= 0 ? L('오늘', 'Today') : n === 1 ? L('어제', 'Yesterday') : L(`${n}일 전`, `${n}d ago`)
}

export default function Admin({ go }: { go: Go }) {
  const [rows, setRows] = useState<AdminRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    adminUsers()
      .then(setRows)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
  }, [])

  const users = rows ?? []
  const withData = users.filter((r) => r.data?.onboarded)
  const active7 = withData.filter((r) => {
    const l = r.data && lastSession(r.data)
    return l !== null && l !== undefined && daysAgo(l) <= 7
  })
  const totals = withData.map((r) => total(r.data as AppState)).filter((t) => t > 0)
  const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0
  const tierCount = TIERS.map((t) => withData.filter((r) => tierOfUser(r.data as AppState)?.tier.i === t.i).length)
  const maxCount = Math.max(1, ...tierCount)

  const card = (label: string, value: string) => (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--fill2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 13, color: 'var(--sub)' }}>{label}</span>
      <span className="num" style={{ fontSize: 24, fontWeight: 800 }}>
        {value}
      </span>
    </div>
  )

  return (
    <div className="screen" style={{ background: 'var(--bg)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 12px 8px 8px' }}>
        <button aria-label={L('설정으로', 'Back to settings')} onClick={() => go({ name: 'menu' })} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#191F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>{L('관리자', 'Admin')}</h1>
      </header>
      <main className="scroll" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px 20px var(--safe-bot)' }}>
        {err && (
          <p style={{ padding: 16, borderRadius: 14, background: 'var(--fill2)', fontSize: 14, lineHeight: 1.6, color: '#D92B3A' }}>
            {L('불러오지 못했어요. 관리자 계정인지, Supabase에 admin.sql을 실행했는지 확인해 주세요.', 'Could not load. Check the admin account and admin.sql.')}
            <br />
            <span style={{ color: 'var(--mute)', fontSize: 12 }}>{err}</span>
          </p>
        )}
        {!rows && !err && <p style={{ padding: 24, textAlign: 'center', color: 'var(--mute)' }}>{L('불러오는 중…', 'Loading…')}</p>}
        {rows && (
          <>
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {card(L('가입한 사용자', 'Signed up'), `${users.length}`)}
              {card(L('기록 있는 사용자', 'With data'), `${withData.length}`)}
              {card(L('최근 7일 훈련', 'Trained in 7 days'), `${active7.length}`)}
              {card(L('평균 3대', 'Average total'), avg ? `${fmt(Math.round(avg))}kg` : '–')}
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>{L('티어 분포', 'Tiers')}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', borderRadius: 16, background: 'var(--fill2)' }}>
                {[...TIERS].reverse().map((t) => {
                  const n = tierCount[t.i]
                  return (
                    <div key={t.i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Badge tier={t} size={20} inner={false} />
                      <span style={{ width: 56, fontSize: 13, fontWeight: 600 }}>{t.name()}</span>
                      <span style={{ flex: 1, height: 10, borderRadius: 5, background: 'var(--line)', overflow: 'hidden' }}>
                        <span style={{ display: 'block', width: `${(n / maxCount) * 100}%`, height: '100%', borderRadius: 5, background: t.i === 6 ? 'var(--ink)' : t.color }} />
                      </span>
                      <span className="num" style={{ width: 28, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>
                        {n}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>{L('사용자', 'Users')}</h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {users.map((r) => {
                  const d = r.data
                  const b = d?.settings?.body
                  const t = d ? tierOfUser(d) : null
                  const u = d?.settings?.unit ?? 'kg'
                  const isOpen = open === r.user_id
                  const name = r.email || `${r.provider ?? ''} · ${r.user_id.slice(0, 8)}`
                  const last = d ? lastSession(d) : null
                  return (
                    <li key={r.user_id}>
                      <button onClick={() => setOpen(isOpen ? null : r.user_id)} aria-expanded={isOpen} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 14, background: 'var(--fill2)', textAlign: 'left' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                          {t ? <Badge tier={t.tier} size={28} /> : <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--line)' }} />}
                          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                            <span className="num" style={{ fontSize: 12, color: 'var(--sub)' }}>
                              {b ? `${b.sex === 'f' ? L('여', 'F') : L('남', 'M')} · ${b.height}cm · ${fmt(b.weight)}${u}` : L('정보 없음', 'No profile')}
                              {d?.onboarded ? ` · 3대 ${fmt(total(d))}${u}` : ''}
                            </span>
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--mute)', whiteSpace: 'nowrap' }}>{ago(r.updated_at)}</span>
                        </span>
                        {isOpen && d && (
                          <span className="num" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, paddingTop: 8, borderTop: '1px solid var(--line)', width: '100%' }}>
                            <span style={{ display: 'flex', gap: 12 }}>
                              {(['B', 'D', 'S'] as LiftKey[]).map((k) => (
                                <span key={k}>
                                  <b style={{ color: TH[k].text }}>{k}</b> {fmt(d.lifts[k]?.oneRM ?? 0)}
                                </span>
                              ))}
                            </span>
                            <span style={{ color: 'var(--sub)' }}>
                              {t ? `${t.tier.name()} · DOTS ${Math.round(t.score)} · ` : ''}
                              {programOf(d.settings?.program).name()}
                            </span>
                            <span style={{ color: 'var(--sub)' }}>
                              {L('훈련', 'Sessions')} {d.sessions?.length ?? 0}
                              {L('회', '')} · {L('테스트', 'Tests')} {d.tests?.length ?? 0}
                              {L('회', '')}
                              {last ? ` · ${L('마지막 훈련', 'Last')} ${md(last)}` : ''}
                            </span>
                            <span style={{ color: 'var(--mute)' }}>
                              {L('가입', 'Joined')} {md(r.created_at.slice(0, 10))} · {r.provider ?? ''}
                            </span>
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--mute)' }}>
              {L('개인정보처리방침 2번에 적은 목적(문의 대응, 앱 개선, 익명 통계)으로만 열람해 주세요. 개별 기록을 캡처하거나 공유하지 않아요.', 'View only for the purposes in the privacy policy.')}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
