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

// 카카오·구글 로그인 화면에서 뒤로 왔을 때 브라우저가 예전 화면을 그대로 되살리면(뒤로-앞으로 캐시)
// 로그인 상태와 안 맞는 화면이 보일 수 있어서, 처음부터 다시 연다 (첫 화면 → 로그인 선택)
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload()
})

// 오프라인 캐시 (배포 환경에서만)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {})
  })
}
