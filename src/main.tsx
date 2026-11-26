import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 화면 가장자리에서 밀어도 브라우저 뒤로·앞으로 가기 제스처가 아예 안 먹히게:
// 가장자리에서 시작한 터치는 기본 동작을 막는다.
// 막으면 탭(클릭)도 안 생기니, 거의 안 움직이고 뗐으면 직접 눌러 준다.
const EDGE = 24
let edgeTouch: { x: number; y: number; el: EventTarget | null } | null = null
document.addEventListener(
  'touchstart',
  (e) => {
    const t = e.touches[0]
    if (!t || e.touches.length > 1) return
    if (t.clientX > EDGE && t.clientX < window.innerWidth - EDGE) return
    e.preventDefault()
    edgeTouch = { x: t.clientX, y: t.clientY, el: e.target }
  },
  { passive: false },
)
document.addEventListener('touchend', (e) => {
  const st = edgeTouch
  edgeTouch = null
  const t = e.changedTouches[0]
  if (!st || !t) return
  if (Math.abs(t.clientX - st.x) < 10 && Math.abs(t.clientY - st.y) < 10)
    st.el?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: t.clientX, clientY: t.clientY }))
})

// 그래도 뒤로 가기가 일어나면(안드로이드 뒤로 버튼 등) 앱 밖으로 나가지 않게
const trap = () => {
  try {
    history.pushState({ stlog: true }, '')
  } catch {
    /* 무시 */
  }
}
trap()
// 사용자가 처음 만졌을 때 한 번 더 (브라우저가 손대기 전 쌓은 칸을 건너뛰는 경우 대비)
window.addEventListener('pointerdown', trap, { once: true })
window.addEventListener('popstate', trap)

// 오프라인 캐시 (배포 환경에서만)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {})
  })
}
