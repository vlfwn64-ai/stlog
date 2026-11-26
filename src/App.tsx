import { useState } from 'react'
import type { LiftKey } from './logic/program'
import { useApp } from './store'
import Home from './screens/Home'
import Lift from './screens/Lift'
import Menu from './screens/Menu'
import Onboarding from './screens/Onboarding'
import Result from './screens/Result'
import Test from './screens/Test'
import Workout from './screens/Workout'

export type Route =
  | { name: 'home' }
  | { name: 'menu' }
  | { name: 'lift'; lift: LiftKey }
  | { name: 'workout'; lift?: LiftKey }
  | { name: 'result'; id: string }
  | { name: 'test'; lift: LiftKey }

export type Go = (r: Route) => void

export default function App() {
  const s = useApp()
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const go: Go = (r) => {
    setRoute(r)
    window.scrollTo(0, 0)
  }

  let view
  if (!s.onboarded) view = <Onboarding />
  else if (route.name === 'menu') view = <Menu go={go} />
  else if (route.name === 'lift') view = <Lift key={route.lift} lift={route.lift} go={go} />
  else if (route.name === 'workout') view = <Workout go={go} />
  else if (route.name === 'result') view = <Result id={route.id} go={go} />
  else if (route.name === 'test') view = <Test lift={route.lift} go={go} />
  else view = <Home go={go} />

  return <div className="app">{view}</div>
}
