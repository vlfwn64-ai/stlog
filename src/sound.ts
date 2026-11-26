// 쉬는 시간 끝 알림음 (Web Audio). 아이폰은 손으로 누른 순간에 소리를 켜 둬야 나중에 울릴 수 있다.

type Ctx = AudioContext
let ctx: Ctx | null = null

/** 버튼을 누를 때마다 불러서 소리를 쓸 수 있게 열어 둔다 */
export function unlockAudio() {
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!C) return
      ctx = new C()
    }
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* 소리를 못 쓰는 환경이면 조용히 넘어간다 */
  }
}

/** 짧은 삐삐삐 */
export function beep() {
  if (!ctx) return
  try {
    const c = ctx
    const t = c.currentTime + 0.02
    ;[0, 0.22, 0.44].forEach((d) => {
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, t + d)
      g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16)
      o.connect(g).connect(c.destination)
      o.start(t + d)
      o.stop(t + d + 0.18)
    })
  } catch {
    /* 무시 */
  }
}
