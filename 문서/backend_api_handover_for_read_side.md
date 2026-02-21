# 3000 생존 대시보드 - 백엔드 전달 문서 (조회 + 어드민 입력)

작성일: 2026-02-21  
대상: 운영 서버에 API를 얹는 백엔드 팀  
프론트 코드 기준: `/Users/hajihun/habibi/ppanzziri/frontend`

## 1. 목적
프론트엔드가 운영 서버의 API로 대시보드 **조회 + 어드민 입력**을 수행하기 위한 계약 문서입니다.

## 2. 프론트 연동 방식
- 조회 Repository: `/src/services/dashboardRepository.js`
- 어드민 Repository: `/src/services/adminRepository.js`
- 환경변수:
  - `VITE_DASHBOARD_USE_MOCK=true|false`
  - `VITE_DASHBOARD_API_BASE_URL=/api`

## 3. 조회 API
### 3.1 대시보드 집계 조회
- `GET {BASE}/dashboard`
- 응답 필드
  - `startCapital`
  - `records[]`
  - `certifications[]`

> 상세 응답 예시는 기존 문서 `/Users/hajihun/habibi/ppanzziri/문서/dashboard_api_contract.md` 참고

## 4. 어드민 입력 API (PRD 기준)
PRD 기준 구현 대상:
- `GET /budget/records`
- `POST /budget/records`
- `DELETE /budget/records/{id}`
- `GET /budget/tags`
- `POST /budget/certifications`

기본 경로: `{BASE}` = `VITE_DASHBOARD_API_BASE_URL`

### 4.1 GET `{BASE}/budget/records`
응답: records 배열

records item 필드:
- `id`
- `type` (`income` | `expense`)
- `transaction_date` (`YYYY-MM-DD`)
- `amount` (number)
- `memo` (string, optional)
- `photo_url` (string, optional)
- `tags[]`: `{ name, amount }`
- `effective_segments[]`: `{ from, to, amount }` 또는 `{ effective_from, effective_to, segment_amount }`

### 4.2 POST `{BASE}/budget/records`
요청 바디:
```json
{
  "type": "expense",
  "transaction_date": "2026-02-21",
  "amount": 24000,
  "memo": "태국 음식",
  "photo_url": "https://...",
  "tags": [
    { "name": "생활", "amount": 10000 },
    { "name": "경험", "amount": 14000 }
  ],
  "effective_segments": [
    { "effective_from": "2026-02-21", "effective_to": "2026-02-21", "segment_amount": 24000 }
  ]
}
```

검증 필요:
- `sum(tags.amount) == amount`
- `sum(effective_segments.segment_amount) == amount`

### 4.3 DELETE `{BASE}/budget/records/{id}`
- 성공 시 200/204

### 4.4 GET `{BASE}/budget/tags`
응답 예시:
```json
[
  { "name": "생활", "amount": 603000 },
  { "name": "경험", "amount": 144000 }
]
```

### 4.5 POST `{BASE}/budget/certifications`
요청 바디:
```json
{
  "date": "2026-02-21",
  "photo_url": "https://..."
}
```

## 5. 입력 인증 (단일 비밀번호)
PRD: "입력은 단일 비밀번호".

프론트 구현:
- 어드민 입력 요청 시 헤더 `X-Admin-Password` 전송
- 대상: POST/DELETE 계열

백엔드 처리 권장:
- 비밀번호 검증 실패 시 `401` 또는 `403`
- 응답 바디 예시:
```json
{ "code": "ADMIN_PASSWORD_INVALID", "message": "invalid admin password" }
```

## 6. 에러 응답 가이드
- 400: 유효성 실패 (합계 불일치/필수값 누락)
- 401/403: 인증 실패
- 404: 삭제 대상 없음
- 500: 서버 오류

## 7. QA 체크리스트
- 조회: 홈/기록/인증 탭 데이터 정상 렌더
- 입력: 기록 저장 시 즉시 목록 반영
- 입력: 삭제 동작 정상
- 입력: 인증 저장 동작 정상
- 검증: 태그/유효구간 합계 검증 실패 시 4xx
- 인증: 비밀번호 오류 시 401/403

## 8. 프론트 전환 절차
1. `.env` 설정
   - `VITE_DASHBOARD_USE_MOCK=false`
   - `VITE_DASHBOARD_API_BASE_URL=https://<server-base>`
2. `/` 조회 화면 확인
3. `/admin` 입력 화면 확인
