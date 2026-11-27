import { ChoiceSheet, LoginScreen, Splash } from './screens/Account'
import { cloudReady, startCloud, useCloud } from './cloud'
import { deviceLang, setLang } from './i18n'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { LiftKey } from './logic/program'
import { useApp } from './store'
import { TH, setDark } from './theme'
import Home from './screens/Home'
import { TierUp, TierView, liftTier, overallTier } from './screens/Tier'
import Lift from './screens/Lift'
import Menu from './screens/Menu'
import Onboarding from './screens/Onboarding'
import Result from './screens/Result'
import Test from './screens/Test'
import Tutorial from './screens/Tutorial'
import Workout from './screens/Workout'

export type Tab = 'grow' | 'home' | 'rec'

export type Route =
  | { name: 'home'; tab?: Tab }
  | { name: 'tierup'; lift: LiftKey; prevRM: number; newRM: number; fromLift?: number; fromAll?: number }
  | { name: 'tierview'; lift?: LiftKey }
  | { name: 'add'; date: string; lift: LiftKey; back: Route }
  | { name: 'menu' }
  | { name: 'tutorial'; back?: 'menu' }
  | { name: 'lift'; lift: LiftKey; from?: 'home' | 'left' | 'right' }
  | { name: 'workout'; lift?: LiftKey }
  | { name: 'result'; id: string }
  | { name: 'test'; lift: LiftKey }
  | { name: 'edit'; id: string; back: Route }

export type Go = (r: Route) => void

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const useSystemDark = () =>
  useSyncExternalStore(
    (cb) => {
      darkQuery.addEventListener('change', cb)
      return () => darkQuery.removeEventListener('change', cb)
    },
    () => darkQuery.matches,
  )

/** 상태줄(다이나믹 아일랜드 영역) 색 */
function setStatusColor(color: string) {
  let m = document.querySelector('meta[name="theme-color"]')
  if (!m) {
    m = document.createElement('meta')
    m.setAttribute('name', 'theme-color')
    document.head.appendChild(m)
  }
  m.setAttribute('content', color)
  document.documentElement.style.background = color
}

export default function App() {
  const s = useApp()
  const cloud = useCloud()
  const sysDark = useSystemDark()
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const go: Go = useCallback((r) => setRoute(r), [])

  // 언어는 테마보다 먼저 (종목 이름이 언어를 따른다)
  setLang(s.settings.lang ?? deviceLang())
  const pref = s.settings.theme ?? 'system'
  const dark = pref === 'dark' || (pref === 'system' && sysDark)
  // 렌더 전에 종목 색 표를 맞춘다
  setDark(dark)

  useEffect(() => {
    startCloud()
  }, [])

  // 앱을 열면 로고와 부제를 잠깐 보여준다
  const [intro, setIntro] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 1500)
    return () => clearTimeout(t)
  }, [])

  // 로그아웃하면 다음 로그인은 홈에서 시작
  const signedIn = !!cloud.session
  const [wasIn, setWasIn] = useState(signedIn)
  if (wasIn !== signedIn) {
    setWasIn(signedIn)
    if (!signedIn) setRoute({ name: 'home' })
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, [dark])

  const tierUpColor =
    route.name === 'tierup' ? (route.fromLift !== undefined ? liftTier(s, route.lift) : overallTier(s))?.tier.deep : route.name === 'tierview' ? (route.lift ? liftTier(s, route.lift) : overallTier(s))?.tier.deep : undefined
  useEffect(() => {
    const base = dark ? '#17171C' : '#FFFFFF'
    if (s.onboarded && route.name === 'test') setStatusColor(TH[route.lift].testBg)
    else if (s.onboarded && route.name === 'menu') setStatusColor(dark ? '#202027' : '#FFFFFF')
    else if (s.onboarded && (route.name === 'tierup' || route.name === 'tierview')) setStatusColor(tierUpColor ?? base)
    else setStatusColor(base)
  }, [route, dark, s.onboarded, tierUpColor])

  let view
  // 로그인부터: 저장된 로그인 확인 → 로그인 화면 → 기록 불러오기 → 온보딩(새 사용자) → 홈
  const syncing = cloudReady && (!cloud.checked || (!!cloud.session && !cloud.ready))
  if (intro || syncing) view = <Splash loading={!intro && syncing} />
  else if (cloudReady && !cloud.session) view = <LoginScreen />
  else if (!s.onboarded) view = <Onboarding onDone={() => go({ name: 'tutorial' })} />
  else if (route.name === 'menu') view = <Menu go={go} />
  else if (route.name === 'tutorial') view = <Tutorial onDone={() => go({ name: route.back ?? 'home' })} />
  else if (route.name === 'lift') view = <Lift key={route.lift} lift={route.lift} go={go} enter={route.from === 'home'} slide={route.from === 'left' || route.from === 'right' ? route.from : undefined} />
  else if (route.name === 'workout') view = <Workout go={go} />
  else if (route.name === 'edit') view = <Workout key={route.id} go={go} editId={route.id} back={route.back} />
  else if (route.name === 'add') view = <Workout key={`add-${route.date}-${route.lift}`} go={go} add={{ date: route.date, lift: route.lift }} back={route.back} />
  else if (route.name === 'result') view = <Result id={route.id} go={go} />
  else if (route.name === 'test') view = <Test lift={route.lift} go={go} />
  else if (route.name === 'tierview') view = <TierView key={route.lift ?? 'all'} lift={route.lift} go={go} />
  else if (route.name === 'tierup') view = <TierUp lift={route.lift} prevRM={route.prevRM} newRM={route.newRM} fromLift={route.fromLift} fromAll={route.fromAll} go={go} />
  else view = <Home go={go} tab={route.name === 'home' ? route.tab : undefined} />

  return (
    <div className="app">
      {view}
      <ChoiceSheet />
    </div>
  )
}
