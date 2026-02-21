import { useMemo, useState } from 'react';
import { fmtDateKR, fmtKRW } from '../utils/format.js';

function normalize(text) {
  return String(text || '').toLowerCase();
}

export default function RecordsPage({ groupedRecords }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const allItems = useMemo(() => groupedRecords.flatMap((group) => group.items), [groupedRecords]);

  const tagOptions = useMemo(() => {
    const set = new Set();
    for (const item of allItems) {
      for (const tag of item.tags || []) set.add(tag.name);
    }
    return ['all', ...Array.from(set)];
  }, [allItems]);

  const filteredGroups = useMemo(() => {
    const q = normalize(query).trim();
    const filteredItems = allItems.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (tagFilter !== 'all' && !(item.tags || []).some((tag) => tag.name === tagFilter)) return false;
      if (!q) return true;

      const inMemo = normalize(item.memo).includes(q);
      const inTags = (item.tags || []).some((tag) => normalize(tag.name).includes(q));
      const inAmount = String(item.amount).includes(q);
      return inMemo || inTags || inAmount;
    });

    const map = new Map();
    for (const item of filteredItems) {
      if (!map.has(item.transaction_date)) map.set(item.transaction_date, []);
      map.get(item.transaction_date).push(item);
    }

    return [...map.keys()]
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => ({
        date,
        items: map.get(date).sort((a, b) => b.id - a.id),
      }));
  }, [allItems, query, typeFilter, tagFilter]);

  return (
    <section className="screen active" id="screen-records">
      <div className="stack-page">
        <section className="card records-filter">
          <div className="records-filter-row">
            <input
              className="records-search"
              type="search"
              placeholder="메모/태그/금액 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="records-filter-row">
            <div className="segmented">
              <button type="button" className={`segbtn ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>전체</button>
              <button type="button" className={`segbtn ${typeFilter === 'expense' ? 'active' : ''}`} onClick={() => setTypeFilter('expense')}>지출</button>
              <button type="button" className={`segbtn ${typeFilter === 'income' ? 'active' : ''}`} onClick={() => setTypeFilter('income')}>수입</button>
            </div>
            <select className="records-tag-select" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag === 'all' ? '전체 태그' : tag}
                </option>
              ))}
            </select>
          </div>
        </section>

        {filteredGroups.map((group) => (
          <details className="record-day" key={group.date}>
            <summary>
              <div>
                <div className="summary-date">{fmtDateKR(group.date)}</div>
                <div className="summary-meta">
                  지출 {fmtKRW(group.items.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0))}
                  {' · '}
                  수입 {fmtKRW(group.items.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0))}
                </div>
              </div>
              <div className="summary-meta">{group.items.length}건</div>
            </summary>

            {group.items.map((item) => (
              <div key={item.id}>
                <div className="record-row">
                  <div className="record-left">
                    <div className={`badge ${item.type}`}>{item.type === 'expense' ? '지출' : '수입'} · {item.memo}</div>
                    <div className="tiny">
                      태그 {item.tags.map((tag) => `${tag.name}(${fmtKRW(tag.amount)})`).join(' · ')}
                    </div>
                  </div>
                  <div className="record-right">
                    <div className={`amount ${item.type}`}>
                      {item.type === 'expense' ? '-' : '+'}
                      {fmtKRW(item.amount).replace('₩', '₩ ')}
                    </div>
                    <div className="tiny">유효구간 {item.effective_segments.length}개</div>
                  </div>
                </div>
                <div className="record-row effective">
                  <div className="record-left">
                    <div className="tiny">유효 구간</div>
                    <div className="tiny">
                      {item.effective_segments.map((seg) => (
                        <div key={`${item.id}-${seg.from}-${seg.to}`}>
                          {fmtDateKR(seg.from)}~{fmtDateKR(seg.to)} {fmtKRW(seg.amount)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </details>
        ))}
        {filteredGroups.length === 0 && (
          <section className="card">
            <p className="muted">조건에 맞는 기록이 없습니다.</p>
          </section>
        )}
      </div>
    </section>
  );
}
