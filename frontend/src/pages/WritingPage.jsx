import { useCallback, useEffect, useRef, useState } from 'react';
import useDashboardQuery from '../hooks/useDashboardQuery.js';
import useWritingDashboardData from '../hooks/useWritingDashboardData.js';
import { writingDashboardRepository } from '../services/writingDashboardRepository.js';

const CHART_METRIC_OPTIONS = [
  { key: 'char_count', label: '글자 수' },
  { key: 'submission_count', label: '제출 횟수' },
];

const HEATMAP_COLORS = [
  '#ebedf0',
  '#c6e48b',
  '#7bc96f',
  '#239a3b',
  '#196127',
];

function getHeatmapLevel(charCount) {
  if (charCount <= 0) return 0;
  if (charCount < 500) return 1;
  if (charCount < 1000) return 2;
  if (charCount < 2000) return 3;
  return 4;
}

function buildCalendarWeeks(daily, todayStr) {
  const dayMap = new Map(daily.map((d) => [d.date, d]));

  const today = new Date(todayStr);
  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  // align start to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks = [];
  let week = [];
  const cur = new Date(startDate);

  while (cur <= endDate) {
    const dateStr = cur.toISOString().slice(0, 10);
    const entry = dayMap.get(dateStr) || null;
    week.push({ date: dateStr, entry, isFuture: dateStr > todayStr });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (week.length) {
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  return weeks;
}

function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

function fmtNumber(n) {
  return n.toLocaleString('ko-KR');
}

function WritingCalendar({ daily, todayStr, selectedDate, onSelectDate }) {
  const weeks = buildCalendarWeeks(daily, todayStr);

  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const firstDay = week.find((d) => d !== null);
    if (!firstDay) return;
    const [, m, dd] = firstDay.date.split('-');
    if (dd === '01' || (wi === 0 && Number(dd) <= 7)) {
      monthLabels.push({ weekIndex: wi, label: `${Number(m)}월` });
    }
  });

  return (
    <div className="writing-calendar-wrap">
      <div className="writing-calendar-month-row">
        {monthLabels.map(({ weekIndex, label }) => (
          <span
            key={`${weekIndex}-${label}`}
            className="writing-calendar-month-label"
            style={{ gridColumnStart: weekIndex + 1 }}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="writing-calendar-grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="writing-calendar-week">
            {week.map((cell, di) => {
              if (!cell) return <div key={di} className="writing-calendar-cell empty" />;
              const level = cell.entry ? getHeatmapLevel(cell.entry.char_count) : 0;
              const isSelected = cell.date === selectedDate;
              return (
                <button
                  key={di}
                  type="button"
                  className={`writing-calendar-cell${isSelected ? ' selected' : ''}${cell.isFuture ? ' future' : ''}`}
                  style={{ background: cell.isFuture ? '#ebedf0' : HEATMAP_COLORS[level] }}
                  title={cell.entry ? `${fmtDateShort(cell.date)}: ${fmtNumber(cell.entry.char_count)}자` : fmtDateShort(cell.date)}
                  onClick={() => !cell.isFuture && onSelectDate(cell.date === selectedDate ? null : cell.date)}
                  aria-label={`${fmtDateShort(cell.date)}${cell.entry ? ` ${fmtNumber(cell.entry.char_count)}자` : ' 없음'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="writing-calendar-legend">
        <span className="writing-calendar-legend-label">적음</span>
        {HEATMAP_COLORS.map((color, i) => (
          <span key={i} className="writing-calendar-legend-cell" style={{ background: color }} />
        ))}
        <span className="writing-calendar-legend-label">많음</span>
      </div>
    </div>
  );
}

function WritingChart({ daily, todayStr }) {
  const [metric, setMetric] = useState('char_count');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (typeof window.Chart !== 'function') return;
    if (chartRef.current) chartRef.current.destroy();

    const start30Date = new Date(todayStr);
    start30Date.setDate(start30Date.getDate() - 29);
    const start30Str = start30Date.toISOString().slice(0, 10);

    const slice = daily.filter((d) => d.date >= start30Str && d.date <= todayStr);
    const labels = slice.map((d) => {
      const [, m, dd] = d.date.split('-');
      return `${Number(m)}/${Number(dd)}`;
    });
    const data = slice.map((d) => d[metric]);
    const isChar = metric === 'char_count';

    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: isChar ? '글자 수' : '제출 횟수',
            data,
            backgroundColor: 'rgba(111, 98, 76, 0.7)',
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${fmtNumber(ctx.parsed.y)}${isChar ? '자' : '회'}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#999', maxTicksLimit: 8, font: { size: 10, weight: '600' } },
          },
          y: {
            grid: { color: 'rgba(0,0,0,.06)' },
            ticks: {
              color: '#999',
              maxTicksLimit: 5,
              font: { size: 10, weight: '600' },
              callback: isChar ? (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) : undefined,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [daily, todayStr, metric]);

  return (
    <section className="card">
      <div className="card-header">
        <h2>30일 추이</h2>
        <div className="segmented">
          {CHART_METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`segbtn ${metric === opt.key ? 'active' : ''}`}
              onClick={() => setMetric(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-wrap">
        <canvas ref={canvasRef} aria-label="글쓰기 추이 차트" />
      </div>
    </section>
  );
}

function KeywordRankingList({ items, emptyMessage }) {
  if (items.length === 0) {
    return <p className="muted" style={{ marginTop: 8 }}>{emptyMessage}</p>;
  }
  const max = items[0]?.count || 1;
  return (
    <ul className="writing-kw-list">
      {items.slice(0, 10).map(({ keyword, count }, i) => (
        <li key={keyword} className="writing-kw-row">
          <span className="writing-kw-rank">{i + 1}</span>
          <span className="writing-kw-name">{keyword}</span>
          <div className="writing-kw-bar-wrap">
            <div className="writing-kw-bar" style={{ width: `${Math.round((count / max) * 100)}%` }} />
          </div>
          <span className="writing-kw-count">{count}회</span>
        </li>
      ))}
    </ul>
  );
}

function WritingKeywords({ writingData, selectedDate, dayMap }) {
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const periodKeywords = writingData.getKeywordFreqForRange(rangeFrom, rangeTo);

  const selectedEntry = selectedDate ? dayMap.get(selectedDate) : null;

  return (
    <section className="card">
      <div className="card-header">
        <h2>키워드</h2>
      </div>

      {selectedDate && (
        <div className="writing-kw-section">
          <p className="eyebrow">{fmtDateShort(selectedDate)} 키워드</p>
          {selectedEntry && selectedEntry.keywords.length > 0 ? (
            <div className="chips" style={{ marginTop: 8 }}>
              {selectedEntry.keywords.map((kw) => (
                <span key={kw} className="chip">{kw}</span>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 8 }}>해당 날짜 키워드 없음</p>
          )}
        </div>
      )}

      <div className="writing-kw-section">
        <p className="eyebrow">최근 30일 키워드 빈도</p>
        <KeywordRankingList items={writingData.keywordFreq30} emptyMessage="최근 30일 키워드 없음" />
      </div>

      <div className="writing-kw-section">
        <p className="eyebrow">기간별 키워드</p>
        <div className="writing-kw-range">
          <input
            type="date"
            className="writing-date-input"
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
            aria-label="시작일"
          />
          <span className="writing-kw-range-sep">~</span>
          <input
            type="date"
            className="writing-date-input"
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
            aria-label="종료일"
          />
        </div>
        {rangeFrom && rangeTo && rangeFrom <= rangeTo ? (
          <KeywordRankingList items={periodKeywords} emptyMessage="해당 기간 키워드 없음" />
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>기간을 선택하면 키워드 랭킹이 표시됩니다.</p>
        )}
      </div>
    </section>
  );
}

const EMPTY_WRITING = { daily: [] };

export default function WritingPage() {
  const { data, loading, error, reload } = useDashboardQuery(writingDashboardRepository);
  const source = data || EMPTY_WRITING;
  const writingData = useWritingDashboardData(source.daily);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleSelectDate = useCallback((date) => setSelectedDate(date), []);

  useEffect(() => {
    const screen = document.getElementById('screen-writing');
    const scroller = screen?.closest('.content');
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  if (loading) {
    return (
      <section className="screen active" id="screen-writing">
        <section className="card"><p className="muted">글쓰기 데이터를 불러오는 중...</p></section>
      </section>
    );
  }

  if (error) {
    return (
      <section className="screen active" id="screen-writing">
        <section className="card">
          <p className="muted">데이터를 불러오지 못했습니다.</p>
          <button type="button" className="segbtn" onClick={reload}>다시 시도</button>
        </section>
      </section>
    );
  }

  return (
    <section className="screen active" id="screen-writing">
      <div className="stack-page">
        <section className="card writing-calendar-card">
          <div className="card-header">
            <h2>글쓰기 현황</h2>
            <span className="muted" style={{ fontSize: 12 }}>최근 1년</span>
          </div>
          <WritingCalendar
            daily={source.daily}
            todayStr={writingData.todayStr}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        </section>

        <WritingChart daily={source.daily} todayStr={writingData.todayStr} />

        <WritingKeywords
          writingData={writingData}
          selectedDate={selectedDate}
          dayMap={writingData.dayMap}
        />
      </div>
    </section>
  );
}
