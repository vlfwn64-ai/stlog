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

let tickBuf: AudioBuffer | null = null

/** 다이얼 한 칸 넘길 때 짧은 딸깍 (빠르게 돌리면 드르륵) */
export function tick() {
  if (!ctx) return
  try {
    const c = ctx
    if (!tickBuf) {
      // 12ms짜리 빠르게 사라지는 잡음
      const n = Math.floor(c.sampleRate * 0.012)
      tickBuf = c.createBuffer(1, n, c.sampleRate)
      const d = tickBuf.getChannelData(0)
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4)
    }
    const src = c.createBufferSource()
    src.buffer = tickBuf
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2600
    bp.Q.value = 1.2
    const g = c.createGain()
    g.gain.value = 0.9
    src.connect(bp).connect(g).connect(c.destination)
    src.start()
  } catch {
    /* 무시 */
  }
  // 안드로이드는 짧은 진동도 같이
  try {
    navigator.vibrate?.(4)
  } catch {
    /* 무시 */
  }
}
