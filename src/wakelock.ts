import { useEffect } from 'react'

/**
 * 운동 기록 중 화면이 꺼지지 않게 (Screen Wake Lock API).
 * - 앱을 내리면 브라우저가 잠금을 풀어서, 돌아오면 다시 건다
 * - 사파리처럼 터치가 있어야 걸리는 경우를 위해, 실패하면 다음 터치 때 다시 시도
 * - 지원하지 않는 브라우저에서는 아무것도 하지 않음
 */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let alive = true
    let busy = false

    const acquire = async () => {
      if (!alive || busy || document.visibilityState !== 'visible') return
      if (lock && !lock.released) return
      busy = true
      try {
        const l = await navigator.wakeLock.request('screen')
        if (alive) lock = l
        else void l.release()
      } catch {
        // 권한·배터리 절약 모드 등으로 거절 → 다음 터치 때 다시
      } finally {
        busy = false
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    const onTouch = () => void acquire()

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    document.addEventListener('pointerdown', onTouch, { passive: true })
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('pointerdown', onTouch)
      if (lock && !lock.released) void lock.release()
      lock = null
    }
  }, [on])
}
