# prototype.html 컴포넌트 분석

대상 파일: `/Users/hajihun/habibi/ppanzziri/문서/prototype.html`

## 1) 문서 개요
- 단일 HTML 파일에 `style + markup + script`를 모두 포함한 프로토타입 구조
- 데이터 소스는 정적 더미 데이터(`records`, `certifications`)
- 화면은 탭 기반 3개 섹션(`home`, `records`, `proof`)으로 전환
- 핵심 시각화는 Chart.js 선 그래프(`balanceChart`)

## 2) 상위 레이아웃 컴포넌트

### `AppShell` (`.device`)
- 역할: 앱 전체 프레임(모바일 디바이스 느낌), 고정 높이, 내부 스크롤 컨테이너 구성
- 하위:
  - `TopBar` (`.topbar`)
  - `ContentViewport` (`.content`)
  - `TabBar` (`.tabbar`)

### `TopBar` (`.topbar`)
- 요소:
  - 타이틀 그룹 (`.title` + `.character` + 제목 텍스트)
  - 기준일 (`#asOf`) 
- 동작: `asOfDate`를 `fmtDateKRFull()`로 변환해 표시

### `ContentViewport` (`.content`)
- 역할: 실제 스크롤 영역(세로 스크롤), 탭 컨텐츠 표시
- 섹션:
  - `#screen-home`
  - `#screen-records`
  - `#screen-proof`

### `TabBar` (`.tabbar`)
- 탭 버튼: `home`, `records`, `proof`
- 동작: `setTab(name)`로 active 상태 전환 + 스크롤 상단 복귀

## 3) 홈 화면 컴포넌트 (`#screen-home`)

홈은 카드 기반 컴포지션이며, 반응형에서 그리드 영역(`grid-template-areas`)으로 재배치됨.

### 3.1 `QuickLinksCard` (`.card.quick-links`)
- 외부 링크 버튼 카드
- 현재 활성 링크:
  - YouTube `@ppanzziri`
  - Instagram `@ppanzziri`
- 아이콘은 SVG 인라인

### 3.2 `HeroBalanceCard` (`.card.hero`)
- 필드:
  - 현재 잔액 `#balanceValue`
  - 초기자금 대비 비율 `#remainPct`
  - 누적 수입 `#incomeTotal`
  - 누적 지출 `#expenseTotal`
  - 상위 태그 칩 `#topTagsChips`
- 데이터: `totalIncome`, `totalExpense`, `currentBalance`, `tagTotals30`

### 3.3 `SurvivalCurveCard` (`생존 곡선`)
- 요소:
  - 기간 토글: `#range30`, `#rangeAll`
  - 차트 캔버스: `#balanceChart`
  - 최소/최대 잔액: `#minBalance`, `#maxBalance`
- 동작:
  - `buildChart(range)`가 Chart.js 인스턴스 생성/재생성
  - 태블릿 구간은 min/max를 `만원` 단위 축약(`fmtKRWMan`)

### 3.4 `TagUsageCard` (`어디에 쓰고 있나`)
- 요소:
  - 누적 비율 바 `#tagBar`
  - 범례 `#tagLegend`
- 동작: `renderTagBar()`
  - 최근 30일 유효지출 기준 태그 분배
  - 상위 5개 + 기타 그룹핑

### 3.5 `DailyCostCard` (`하루 비용`)
- 요소:
  - 전체 평균 `#avgDailyAll`
  - 최근 30일 `#avgDaily30`
  - 런웨이 문구 `#runwayText`
- 계산: `averageDailyFromMap()` + `runwayDays`

### 3.6 `RecentRecordsCard` (`최근 기록`)
- 요소:
  - 요약 리스트 `#recentRecords`
  - CTA `#goRecords`
- 동작: `renderRecentRecords()`
  - 최근 7일 거래를 날짜별 `details/summary`로 렌더

### 3.7 `LatestProofCard` (`잔액 인증`)
- 요소:
  - 썸네일 `#latestProof`
  - CTA `#goProof`
- 동작: `renderProof()`에서 최신 1건 표시

## 4) 기록 탭 컴포넌트 (`#screen-records`)

### `RecordsByDayList` (`#recordsByDay`)
- 동작: `renderRecordsTab()`
- 구조:
  - 날짜별 accordion
  - 거래 행 + 유효구간 상세 행
- 그룹 로직: `groupByTransactionDate()`

## 5) 인증 탭 컴포넌트 (`#screen-proof`)

### `ProofList` (`#proofList`)
- 동작: `renderProof()`
- 구조: 날짜별 카드 + 인증 이미지

## 6) 데이터 모델(스크립트 기준)

### `records[]`
- 필드:
  - `id`, `type(income|expense)`, `transaction_date`, `amount`, `memo`
  - `tags[]`: `{name, amount}`
  - `effective_segments[]`: `{from, to, amount}`
- 특징: 거래일과 유효일이 분리됨(분석 정확도 향상)

### `certifications[]`
- 필드: `date`, `balance`, `photo_url`

## 7) 계산/유틸 컴포넌트(함수 계층)

### 날짜/포맷 유틸
- `parseDate`, `addDays`, `toISODate`, `daysBetweenInclusive`
- `fmtDateKR`, `fmtDateKRFull`, `fmtKRW`, `fmtKRWMan`

### 도메인 계산
- `buildDailyEffectiveMap(type)`
- `averageDailyFromMap(map, startISO, endISO)`
- `tagTotalsEffectiveLast30()`
- `recordsInLastNDays(n)`
- `groupByTransactionDate()`

### 렌더 함수
- `renderTopTagsChips()`
- `renderTagBar()`
- `renderRecentRecords()`
- `renderProof()`
- `renderRecordsTab()`
- `buildChart(range)`

## 8) 상태/이벤트 흐름

### 초기 렌더 순서
1. 정적 데이터 선언
2. 계산값 산출(`currentBalance`, `avg30`, `tagTotals30` 등)
3. 텍스트 DOM 주입(`asOf`, 잔액/비율/평균)
4. 카드 렌더 함수 실행
5. 차트 초기 렌더(`buildChart('30')`)
6. 이벤트 바인딩(기간 버튼, 리사이즈, 탭, CTA)

### 인터랙션
- 기간 버튼 클릭: 차트 데이터 범위 재계산 + min/max 텍스트 갱신
- 윈도우 리사이즈: 현재 차트 범위 재렌더
- 탭 클릭/CTA 클릭: `setTab()`으로 화면 전환

## 9) 컴포넌트 경계 관점 제안(리팩토링 기준)

현재는 전부 단일 파일이므로, 실제 컴포넌트화 시 아래 단위로 분리하기 좋음.

- `layout/AppShell`
- `layout/TopBar`
- `layout/TabBar`
- `home/QuickLinksCard`
- `home/HeroBalanceCard`
- `home/SurvivalCurveCard`
- `home/TagUsageCard`
- `home/DailyCostCard`
- `home/RecentRecordsCard`
- `home/LatestProofCard`
- `records/RecordsByDayList`
- `proof/ProofList`
- `domain/calc` (계산 로직)
- `domain/format` (포맷 유틸)
- `state/viewModel` (파생 상태 집계)

## 10) 분석 요약
- 이 프로토타입은 “데이터 계산 + DOM 렌더 함수” 패턴으로 구성된 단일 파일 아키텍처
- UI는 이미 카드 단위의 명확한 컴포넌트 경계를 갖고 있어 프레임워크 기반 분리(React/Vue/Svelte) 시 이식성이 높음
- 우선 분리 대상은 `buildChart`, `renderRecordsTab`, `tagTotalsEffectiveLast30`처럼 길고 책임이 큰 함수
