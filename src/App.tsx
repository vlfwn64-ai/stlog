import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { LiftKey } from './logic/program'
import { useApp } from './store'
import { TH, setDark } from './theme'
import Home from './screens/Home'
import Lift from './screens/Lift'
import Menu from './screens/Menu'
import Onboarding from './screens/Onboarding'
import Result from './screens/Result'
import Test from './screens/Test'
import Tutorial from './screens/Tutorial'
import Workout from './screens/Workout'

export type Route =
  | { name: 'home' }
  | { name: 'menu' }
  | { name: 'tutorial'; back?: 'menu' }
  | { name: 'lift'; lift: LiftKey; from?: 'home' }
  | { name: 'workout'; lift?: LiftKey }
  | { name: 'result'; id: string }
  | { name: 'test'; lift: LiftKey }

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
  const sysDark = useSystemDark()
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const go: Go = useCallback((r) => setRoute(r), [])

  const pref = s.settings.theme ?? 'system'
  const dark = pref === 'dark' || (pref === 'system' && sysDark)
  // 렌더 전에 종목 색 표를 맞춘다
  setDark(dark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    const base = dark ? '#17171C' : '#FFFFFF'
    if (s.onboarded && route.name === 'test') setStatusColor(TH[route.lift].testBg)
    else if (s.onboarded && route.name === 'menu') setStatusColor(dark ? '#202027' : '#FFFFFF')
    else setStatusColor(base)
  }, [route, dark, s.onboarded])

  let view
  if (!s.onboarded) view = <Onboarding onDone={() => go({ name: 'tutorial' })} />
  else if (route.name === 'menu') view = <Menu go={go} />
  else if (route.name === 'tutorial') view = <Tutorial onDone={() => go({ name: route.back ?? 'home' })} />
  else if (route.name === 'lift') view = <Lift key={route.lift} lift={route.lift} go={go} enter={route.from === 'home'} />
  else if (route.name === 'workout') view = <Workout go={go} />
  else if (route.name === 'result') view = <Result id={route.id} go={go} />
  else if (route.name === 'test') view = <Test lift={route.lift} go={go} />
  else view = <Home go={go} />

  return <div className="app">{view}</div>
}
