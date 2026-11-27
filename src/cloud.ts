// 로그인(구글·카카오)과 클라우드 동기화 (Supabase)
// - 기록 전체를 사용자별 한 줄(user_data.data)로 저장
// - 처음 로그인할 때 이 기기·클라우드 둘 다 기록이 있으면 어느 쪽을 쓸지 묻는다
// - 그 뒤로는 바뀔 때마다 올리고, 앱을 열거나 돌아올 때 더 새 쪽을 받는다
import { useSyncExternalStore } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import type { AppState } from './store'
import { getState, onChange, resetAll, setState } from './store'

export const cloudReady = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

const sb: SupabaseClient | null = cloudReady
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } })
  : null

export type Provider = 'google' | 'kakao'

export interface CloudState {
  session: Session | null
  status: 'off' | 'idle' | 'syncing' | 'error'
  lastSync?: number
  /** 앱 시작 때 저장된 로그인 확인을 마쳤는지 */
  checked: boolean
  /** 로그인한 사용자의 기록을 이 기기에 맞춰 뒀는지 (처음 로그인이면 첫 동기화 뒤) */
  ready: boolean
  /** 처음 로그인했는데 양쪽 다 기록이 있을 때 */
  choice?: { remote: AppState; remoteAt: number }
}

let cs: CloudState = { session: null, status: cloudReady ? 'idle' : 'off', checked: !cloudReady, ready: false }
const subs = new Set<() => void>()
const emit = (p: Partial<CloudState>) => {
  cs = { ...cs, ...p }
  subs.forEach((f) => f())
}
export const useCloud = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => cs,
  )

/** 이 기기가 어느 사용자와 연결됐는지 (처음 동기화를 마친 뒤) */
const LINK = 'stlog:linked'
const linkedTo = () => {
  try {
    return localStorage.getItem(LINK)
  } catch {
    return null
  }
}
const setLinked = (id: string | null) => {
  try {
    if (id) localStorage.setItem(LINK, id)
    else localStorage.removeItem(LINK)
  } catch {
    /* 무시 */
  }
}

/** 기록이 사실상 비어 있는지 (새 기기·막 온보딩만 한 상태) */
export const isEmpty = (s: AppState) => !s.onboarded || (s.sessions.length === 0 && s.tests.length === 0 && !s.active)

const isProvider = (p: unknown): p is Provider => p === 'google' || p === 'kakao'

/**
 * 이번에 로그인한 방법.
 * 카카오·구글 이메일이 같으면 서버가 한 계정으로 합쳐서 app_metadata.provider는 처음 가입한 쪽으로 남고,
 * 연결별 마지막 로그인 시각도 믿을 수 없어서, 이 기기에서 누른 버튼을 먼저 본다.
 */
export const providerOf = (s: Session | null): Provider | null => {
  if (!s) return null
  let picked: string | null = null
  try {
    picked = localStorage.getItem(PICKED)
  } catch {
    /* 무시 */
  }
  if (isProvider(picked) && linkedProviders(s).includes(picked)) return picked
  const ids = (s?.user?.identities ?? []).filter((i) => isProvider(i.provider))
  const latest = [...ids].sort((a, b) => (b.last_sign_in_at ?? '').localeCompare(a.last_sign_in_at ?? ''))[0]
  if (latest) return latest.provider as Provider
  const p = s?.user?.app_metadata?.provider
  return isProvider(p) ? p : null
}

/** 이 계정에 연결된 로그인 방법 전부 */
export const linkedProviders = (s: Session | null): Provider[] => {
  const list = (s?.user?.app_metadata?.providers as string[] | undefined) ?? (s?.user?.identities ?? []).map((i) => i.provider)
  return [...new Set(list)].filter(isProvider)
}

/** 사용자가 누른 로그인 버튼 (서버 기록보다 정확해서 이걸로 표시) */
const PICKED = 'stlog:provider'

export async function signIn(provider: Provider) {
  if (!sb) return
  try {
    localStorage.setItem(PICKED, provider)
  } catch {
    /* 무시 */
  }
  await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin + import.meta.env.BASE_URL,
      // 카카오는 이메일 없이 (비즈 앱 전환 없이도 되게)
      scopes: provider === 'kakao' ? 'profile_nickname profile_image' : undefined,
      // 저장된 로그인으로 바로 넘어가지 않게: 카카오는 다시 로그인, 구글은 계정 고르기
      // (같은 기기에서 다른 계정으로 로그인할 수 있게)
      queryParams: { prompt: provider === 'kakao' ? 'login' : 'select_account' },
    },
  })
}

/** 로그아웃: 마지막으로 올리고, 이 기기 기록은 비운다 (다음 사람이 볼 수 없게) */
export async function signOut() {
  if (!sb) return
  const linked = !!cs.session && linkedTo() === cs.session.user.id
  if (linked) await push()
  // 못 올렸으면 이 기기 기록은 남겨 둔다 (다음 로그인 때 어느 쪽을 쓸지 묻는다)
  const saved = !linked || cs.status !== 'error'
  clearTimeout(timer)
  try {
    localStorage.removeItem(PICKED)
  } catch {
    /* 무시 */
  }
  // 이 기기만 로그아웃. 서버에 못 닿아도 저장된 로그인은 확실히 지운다
  // (안 지우면 다음에 앱을 열 때 예전 로그인으로 다시 들어가짐)
  try {
    await sb.auth.signOut({ scope: 'local' })
  } catch {
    /* 무시 */
  }
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-') && k.includes('-auth-token'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* 무시 */
  }
  handled = null
  setLinked(null)
  emit({ session: null, choice: undefined, lastSync: undefined, status: 'idle', ready: false })
  if (saved) resetAll()
}

async function fetchRemote(): Promise<{ data: AppState; at: number } | null | 'error'> {
  if (!sb || !cs.session) return 'error'
  const { data, error } = await sb.from('user_data').select('data, updated_at').eq('user_id', cs.session.user.id).maybeSingle()
  if (error) return 'error'
  if (!data) return null
  return { data: data.data as AppState, at: new Date(data.updated_at as string).getTime() }
}

/** 지금 기기 기록을 클라우드에 올린다 */
export async function push() {
  if (!sb || !cs.session) return
  emit({ status: 'syncing' })
  const s = getState()
  const at = s.updatedAt ?? Date.now()
  const { error } = await sb.from('user_data').upsert({ user_id: cs.session.user.id, data: s, updated_at: new Date(at).toISOString() })
  emit(error ? { status: 'error' } : { status: 'idle', lastSync: Date.now() })
}

function applyRemote(remote: AppState, at: number) {
  setState(() => ({ ...remote, updatedAt: at }), { fromCloud: true })
}

/** 로그인 직후: 어느 기록을 쓸지 정한다 */
async function firstSync() {
  emit({ status: 'syncing' })
  const r = await fetchRemote()
  if (r === 'error') return emit({ status: 'error' })
  const uid = cs.session!.user.id
  const local = getState()
  if (!r || isEmpty(r.data)) {
    // 클라우드가 비었으면 이 기기 기록을 올린다
    setLinked(uid)
    emit({ ready: true })
    return push()
  }
  if (isEmpty(local)) {
    applyRemote(r.data, r.at)
    setLinked(uid)
    return emit({ status: 'idle', lastSync: Date.now(), ready: true })
  }
  // 둘 다 기록이 있으면 사용자에게 묻는다
  emit({ status: 'idle', choice: { remote: r.data, remoteAt: r.at } })
}

/** 처음 로그인 때 고른 쪽으로 맞춘다 */
export async function choose(which: 'local' | 'remote') {
  const c = cs.choice
  if (!c || !cs.session) return
  emit({ choice: undefined, ready: true })
  setLinked(cs.session.user.id)
  if (which === 'remote') {
    applyRemote(c.remote, c.remoteAt)
    emit({ lastSync: Date.now() })
  } else await push()
}

/** 앱을 열거나 돌아왔을 때: 더 새 쪽으로 맞춘다 */
export async function pull() {
  if (!sb || !cs.session || linkedTo() !== cs.session.user.id || cs.choice) return
  const r = await fetchRemote()
  if (r === 'error') return emit({ status: 'error' })
  const localAt = getState().updatedAt ?? 0
  if (!r) return push()
  if (r.at > localAt) {
    applyRemote(r.data, r.at)
    emit({ status: 'idle', lastSync: Date.now() })
  } else if (r.at < localAt) await push()
  else emit({ status: 'idle', lastSync: Date.now() })
}

/** 첫 동기화가 서버 연결 실패로 멈췄을 때 다시 시도 */
export function retrySync() {
  if (cs.session && !cs.ready && !cs.choice) void firstSync()
}

let timer: ReturnType<typeof setTimeout> | undefined
let started = false
let handled: string | null = null

/** 앱 시작 때 한 번 */
export function startCloud() {
  if (!sb || started) return
  started = true
  const handle = (session: Session | null) => {
    emit({ session, checked: true })
    if (!session || handled === session.user.id) return
    handled = session.user.id
    if (linkedTo() === session.user.id) {
      // 이 기기에 이미 이 사용자 기록이 있으니 바로 쓰고, 뒤에서 최신으로 맞춘다
      emit({ ready: true })
      void pull()
    } else void firstSync()
  }
  sb.auth
    .getSession()
    .then(({ data }) => handle(data.session))
    .catch(() => emit({ checked: true }))
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      handled = null
      return emit({ session: null, ready: false })
    }
    handle(session)
  })
  // 기록이 바뀌면 잠깐 모았다가 올린다
  onChange((fromCloud) => {
    if (fromCloud || !cs.session || linkedTo() !== cs.session.user.id) return
    clearTimeout(timer)
    timer = setTimeout(() => void push(), 1500)
  })
  // 앱으로 돌아오면 다른 기기에서 바뀐 게 있는지 확인
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void pull()
    else if (timer) {
      clearTimeout(timer)
      void push()
    }
  })
}
