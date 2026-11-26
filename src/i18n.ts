// 한국어 / 영어. 화면 글자는 L('한국어', 'English')로 쓴다.

export type Lang = 'ko' | 'en'
let lang: Lang = 'ko'

export const getLang = () => lang
export const isEn = () => lang === 'en'

export function setLang(l: Lang) {
  lang = l
  if (typeof document !== 'undefined') document.documentElement.lang = l
}

/** 기기 언어가 한국어면 한국어, 아니면 영어 */
export const deviceLang = (): Lang => ((typeof navigator !== 'undefined' ? navigator.language : 'ko') || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en'

export const L = (ko: string, en: string) => (lang === 'en' ? en : ko)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026년 11월" / "November 2026" (m은 0부터) */
export const monthTitle = (y: number, m: number) => (lang === 'en' ? `${MONTHS[m]} ${y}` : `${y}년 ${m + 1}월`)

/** 달력 요일 머리 */
export const weekHead = () => (lang === 'en' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['일', '월', '화', '수', '목', '금', '토'])

/** "11월 26일 (목)" / "Thu, Nov 26" */
export function dayTitle(d: string) {
  const t = new Date(d + 'T12:00:00')
  if (lang === 'en') return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][t.getDay()]}, ${MON[t.getMonth()]} ${t.getDate()}`
  return `${t.getMonth() + 1}월 ${t.getDate()}일 (${'일월화수목금토'[t.getDay()]})`
}

/** "1단계" / "Stage 1" */
export const stageLabel = (n: number) => (lang === 'en' ? `Stage ${n}` : `${n}단계`)

/** "5회" / "5 reps" (짧게: "5회" / "5RM") */
export const repsLabel = (n: number) => (lang === 'en' ? `${n} reps` : `${n}회`)

/** 사이클 줄 이름 "5회" / "5s" (1회는 "1RM") */
export const shortReps = (n: number) => (lang === 'en' ? (n === 1 ? '1RM' : `${n}s`) : `${n}회`)

/** "5회 탑" / "Top 5" */
export const topLabel = (n: number) => (lang === 'en' ? `Top ${n}` : `${n}회 탑`)

/** "1차 시도" / "Attempt 1" */
export const attemptLabel = (n: number) => (lang === 'en' ? `Attempt ${n}` : `${n}차 시도`)

/** "3세트" / "3 sets" */
export const setsLabel = (n: number) => (lang === 'en' ? `${n} ${n === 1 ? 'set' : 'sets'}` : `${n}세트`)

/** "2회" (횟수) / "2 times" */
export const timesLabel = (n: number) => (lang === 'en' ? `${n}` : `${n}회`)
