import { useEffect, useRef, useState } from 'react'
import type { RestState } from './store'
import { beep, unlockAudio } from './sound'

export const REST_STEP = 10

/**
 * 쉬는 시간 타이머. 남은 초를 세지 않고 "끝나는 시각"을 들고 있어서
 * 앱을 내리거나 화면이 꺼졌다 돌아와도 실제 남은 시간이 맞다.
 * - 멈춘 상태의 ±: 총시간 변경 / 도는 중의 ±: 남은 시간만 변경
 */
export function useRestTimer(state: RestState, save: (r: RestState) => void, opts: { sound: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  const [flash, setFlash] = useState(false)
  const fired = useRef<number | null>(null)

  useEffect(() => {
    if (!state.endAt) return
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 250)
    // 앱으로 돌아오면 바로 다시 계산
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [state.endAt])

  const running = state.endAt !== null
  // now는 다시 그리기용, 계산은 지금 시각으로
  void now
  const remain = running ? Math.max(0, Math.ceil(((state.endAt as number) - Date.now()) / 1000)) : state.left

  // 끝났을 때: 멈추고, 방금 끝난 거면 소리·깜빡임 (한참 뒤에 돌아온 거면 조용히)
  useEffect(() => {
    if (!running || remain > 0 || fired.current === state.endAt) return
    fired.current = state.endAt
    const late = Date.now() - (state.endAt as number)
    save({ ...state, endAt: null, left: 0 })
    if (late < 3000) {
      if (opts.sound) beep()
      setFlash(true)
      setTimeout(() => setFlash(false), 1600)
    }
  }, [running, remain, state, save, opts.sound])

  return {
    base: state.base,
    remain,
    running,
    flash,
    minus: () => {
      unlockAudio()
      if (running) {
        const endAt = (state.endAt as number) - REST_STEP * 1000
        save(endAt <= Date.now() ? { ...state, endAt: null, left: 0 } : { ...state, endAt })
      } else {
        const b = Math.max(REST_STEP, state.base - REST_STEP)
        save({ base: b, endAt: null, left: b })
      }
    },
    plus: () => {
      unlockAudio()
      if (running) save({ ...state, endAt: (state.endAt as number) + REST_STEP * 1000, base: Math.max(state.base, remain + REST_STEP) })
      else {
        const b = state.base + REST_STEP
        save({ base: b, endAt: null, left: b })
      }
    },
    toggle: () => {
      unlockAudio()
      if (running) save({ ...state, endAt: null, left: remain })
      else {
        const left = state.left > 0 ? state.left : state.base
        save({ ...state, endAt: Date.now() + left * 1000, left })
      }
    },
    reset: () => {
      unlockAudio()
      save({ ...state, endAt: null, left: state.base })
    },
    restart: () => {
      unlockAudio()
      save({ ...state, endAt: Date.now() + state.base * 1000, left: state.base })
    },
  }
}
