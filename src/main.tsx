import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 왼쪽 가장자리에서 밀어도(브라우저 뒤로가기) 앱 밖 이전 페이지로 나가지 않게:
// 같은 화면을 한 칸 더 쌓아 두고, 뒤로 가면 다시 쌓는다
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
