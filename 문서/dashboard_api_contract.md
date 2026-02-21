# Dashboard API Contract

대상 클라이언트: `/Users/hajihun/habibi/ppanzziri/frontend`

## Endpoint
- `GET {VITE_DASHBOARD_API_BASE_URL}/dashboard`

## Response (200)
```json
{
  "startCapital": 30000000,
  "records": [
    {
      "id": 1,
      "type": "expense",
      "transaction_date": "2026-01-20",
      "amount": 200000,
      "memo": "4회차 모임 선결제",
      "tags": [
        { "name": "관계", "amount": 120000 },
        { "name": "경험", "amount": 80000 }
      ],
      "effective_segments": [
        { "from": "2026-01-22", "to": "2026-01-22", "amount": 50000 }
      ]
    }
  ],
  "certifications": [
    {
      "date": "2026-02-17",
      "balance": 0,
      "photo_url": "/assets/proof-2026-02-17.svg"
    }
  ]
}
```

## Field Rules
- `type`: `income | expense`
- `transaction_date`, `from`, `to`, `date`: `YYYY-MM-DD`
- `amount`, `startCapital`, `balance`: number (원 단위)
- `tags[].amount` 합계는 원칙적으로 `record.amount`와 같아야 함
- `effective_segments[].amount` 총합은 원칙적으로 `record.amount`와 같아야 함

## Client Env Vars
- `VITE_DASHBOARD_USE_MOCK`
  - `true`: mock repository 사용
  - `false`: HTTP repository 사용
- `VITE_DASHBOARD_API_BASE_URL`
  - 예: `/api`, `https://api.example.com`
