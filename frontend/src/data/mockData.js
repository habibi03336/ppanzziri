export const START_CAPITAL = 30000000;

export const records = [
  {
    id: 1,
    type: 'expense',
    transaction_date: '2026-01-20',
    amount: 200000,
    memo: '4회차 모임 선결제',
    tags: [
      { name: '관계', amount: 120000 },
      { name: '경험', amount: 80000 },
    ],
    effective_segments: [
      { from: '2026-01-22', to: '2026-01-22', amount: 50000 },
      { from: '2026-01-29', to: '2026-01-29', amount: 50000 },
      { from: '2026-02-05', to: '2026-02-05', amount: 50000 },
      { from: '2026-02-12', to: '2026-02-12', amount: 50000 },
    ],
  },
  {
    id: 2,
    type: 'expense',
    transaction_date: '2026-01-28',
    amount: 480000,
    memo: '월세(2월)',
    tags: [{ name: '생활', amount: 480000 }],
    effective_segments: [{ from: '2026-02-01', to: '2026-02-28', amount: 480000 }],
  },
  {
    id: 3,
    type: 'income',
    transaction_date: '2026-02-03',
    amount: 350000,
    memo: '강의료 입금',
    tags: [
      { name: '지식노동', amount: 200000 },
      { name: '강좌비', amount: 150000 },
    ],
    effective_segments: [{ from: '2026-01-15', to: '2026-02-02', amount: 350000 }],
  },
  {
    id: 4,
    type: 'expense',
    transaction_date: '2026-02-06',
    amount: 24000,
    memo: '태국 음식',
    tags: [
      { name: '생활', amount: 10000 },
      { name: '경험', amount: 14000 },
    ],
    effective_segments: [{ from: '2026-02-06', to: '2026-02-06', amount: 24000 }],
  },
  {
    id: 5,
    type: 'expense',
    transaction_date: '2026-02-10',
    amount: 89000,
    memo: '교통 + 이동',
    tags: [{ name: '이동', amount: 89000 }],
    effective_segments: [{ from: '2026-02-10', to: '2026-02-10', amount: 89000 }],
  },
  {
    id: 6,
    type: 'income',
    transaction_date: '2026-02-14',
    amount: 120000,
    memo: '프리랜스 작업 선금',
    tags: [{ name: '지식노동', amount: 120000 }],
    effective_segments: [{ from: '2026-02-01', to: '2026-02-14', amount: 120000 }],
  },
  {
    id: 7,
    type: 'expense',
    transaction_date: '2026-02-16',
    amount: 32000,
    memo: '카페',
    tags: [{ name: '생활', amount: 32000 }],
    effective_segments: [{ from: '2026-02-16', to: '2026-02-16', amount: 32000 }],
  },
  {
    id: 8,
    type: 'expense',
    transaction_date: '2026-02-17',
    amount: 61000,
    memo: '장보기',
    tags: [{ name: '생활', amount: 61000 }],
    effective_segments: [{ from: '2026-02-17', to: '2026-02-17', amount: 61000 }],
  },
];

export const certifications = [
  { date: '2026-02-17', balance: 0, photo_url: '/assets/proof-2026-02-17.svg' },
  { date: '2026-02-12', balance: 0, photo_url: '/assets/proof-2026-02-12.svg' },
];
