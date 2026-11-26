# ST LOG

스쿼트·벤치·데드 3대만 기록하고, RPE로 다음 세션 무게를 자동으로 정하는 웹앱(PWA).

- 앱 주소: https://vlfwn64-ai.github.io/stlog/
- 아이폰·아이패드: 사파리로 열고 공유 › 홈 화면에 추가

## v0.1 범위
- 로그인(카카오·Google)부터 시작, 기록은 클라우드(Supabase)에 저장·동기화
- 온보딩: 최소 원판, 목표 1RM, 현재 1RM, 보유 장비
- 홈: 달력, 3대 기록 그래프, 종목 카드
- 종목: 오늘 처방, 1RM 추이, 이번 사이클, TEST하기 · 다음 단계로 · 디로드
- 기록: 웜업 자동 계산·접기, 세트 편집, 세트 종류, RPE, 장비, 쉬는 시간 타이머
- 결과: 오늘 기록, 추정 1RM, 다음 훈련
- 1RM 테스트

## 개발
```
npm install
npm run dev      # 개발 서버
npx vitest run   # 로직 테스트
npm run build
```

훈련 로직은 `src/logic/program.ts`에 있다. main에 올리면 GitHub Actions가 GitHub Pages로 배포한다.
