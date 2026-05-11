import { useEffect, useMemo, useState } from 'react';
import useDashboardQuery from '../hooks/useDashboardQuery.js';
import { writingDashboardRepository } from '../services/writingDashboardRepository.js';

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

function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

function fmtNumber(n) {
  return n.toLocaleString('ko-KR');
}

function parseMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

function fmtDuration(minutes) {
  if (minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

// --- Calendar (no scroll, fit in view) ---
function buildCalendarWeeks(daily, todayStr) {
  const dayMap = new Map(daily.map((d) => [d.date, d]));
  const today = new Date(todayStr);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks = [];
  let week = [];
  const cur = new Date(startDate);

  while (cur <= today) {
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
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function WritingCalendar({ daily, todayStr }) {
  const weeks = buildCalendarWeeks(daily, todayStr);

  const monthLabels = [];
  const seenMonths = new Set();
  weeks.forEach((week, wi) => {
    for (const cell of week) {
      if (!cell) continue;
      const [, m, dd] = cell.date.split('-');
      const monthKey = cell.date.slice(0, 7);
      if (!seenMonths.has(monthKey) && (dd === '01' || Number(dd) <= 7)) {
        seenMonths.add(monthKey);
        monthLabels.push({ weekIndex: wi, label: `${Number(m)}월` });
        break;
      }
    }
  });

  return (
    <div className="writing-calendar-wrap compact">
      <div className="writing-calendar-month-row" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
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
              return (
                <div
                  key={di}
                  className={`writing-calendar-cell${cell.isFuture ? ' future' : ''}`}
                  style={{ background: cell.isFuture ? '#ebedf0' : HEATMAP_COLORS[level] }}
                  title={cell.entry ? `${fmtDateShort(cell.date)}: ${fmtNumber(cell.entry.char_count)}자` : fmtDateShort(cell.date)}
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

// --- Stats ---
function WritingStats({ records, daily }) {
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let totalChars = 0;
    for (const r of records) {
      totalMinutes += parseMinutes(r.start_time, r.end_time);
      totalChars += r.char_count;
    }
    // fallback: if records don't have full data, use daily
    if (totalChars === 0) {
      totalChars = daily.reduce((s, d) => s + d.char_count, 0);
    }
    const charsPerHour = totalMinutes > 0 ? Math.round(totalChars / (totalMinutes / 60)) : 0;
    return { totalMinutes, totalChars, charsPerHour };
  }, [records, daily]);

  return (
    <section className="card">
      <div className="writing-stats-grid">
        <div className="writing-stat">
          <span className="writing-stat-label">누적 시간</span>
          <span className="writing-stat-value">{fmtDuration(stats.totalMinutes)}</span>
        </div>
        <div className="writing-stat">
          <span className="writing-stat-label">누적 글자수</span>
          <span className="writing-stat-value">{fmtNumber(stats.totalChars)}자</span>
        </div>
        <div className="writing-stat">
          <span className="writing-stat-label">시간당 글자수</span>
          <span className="writing-stat-value">{stats.charsPerHour > 0 ? `${fmtNumber(stats.charsPerHour)}자/h` : '-'}</span>
        </div>
      </div>
    </section>
  );
}

// --- Timelapse Videos ---
function TimelapseSection({ records }) {
  const videosDesc = useMemo(
    () => records
      .filter((r) => r.timelapse_video_url)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [records]
  );

  if (videosDesc.length === 0) return null;

  const latest = videosDesc[0];
  const rest = videosDesc.slice(1, 7);

  return (
    <div className="writing-timelapse-section">
      <div className="writing-timelapse-hero">
        <video
          className="writing-timelapse-video-hero"
          src={latest.timelapse_video_url}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
        <div className="writing-timelapse-hero-meta">
          <span>{fmtDateShort(latest.date)}</span>
          {latest.start_time && latest.end_time && (
            <span>{latest.start_time}~{latest.end_time}</span>
          )}
          {latest.topics.length > 0 && (
            <span>{latest.topics.join(', ')}</span>
          )}
        </div>
      </div>
      {rest.length > 0 && (
        <div className="writing-timelapse-grid">
          {rest.map((r) => (
            <div key={r.id} className="writing-timelapse-grid-item">
              <video
                className="writing-timelapse-video-thumb"
                src={r.timelapse_video_url}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
              <span className="writing-timelapse-grid-label">{fmtDateShort(r.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Recent Topics ---
function RecentTopics({ records }) {
  const topicList = useMemo(() => {
    const seen = new Map();
    const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
    for (const r of sorted) {
      for (const t of r.topics) {
        if (!seen.has(t)) seen.set(t, r.date);
      }
    }
    return [...seen.entries()].slice(0, 20).map(([topic, date]) => ({ topic, date }));
  }, [records]);

  if (topicList.length === 0) return null;

  return (
    <section className="card">
      <div className="card-header">
        <h2>최근 주제</h2>
      </div>
      <div className="writing-topics-list">
        {topicList.map(({ topic, date }) => (
          <div key={topic} className="writing-topic-row">
            <span className="writing-topic-name">{topic}</span>
            <span className="writing-topic-date muted">{fmtDateShort(date)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Streak ---
function calcStreak(daily, todayStr) {
  const dateSet = new Set(daily.filter((d) => d.char_count > 0).map((d) => d.date));
  let streak = 0;
  const cur = new Date(todayStr);
  // include today or start from yesterday
  if (!dateSet.has(todayStr)) {
    cur.setDate(cur.getDate() - 1);
  }
  while (true) {
    const dateStr = cur.toISOString().slice(0, 10);
    if (!dateSet.has(dateStr)) break;
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

// --- Main Page ---
const EMPTY_WRITING = { daily: [], records: [] };

export default function WritingPage() {
  const { data, loading, error, reload } = useDashboardQuery(writingDashboardRepository);
  const source = data || EMPTY_WRITING;

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const streak = useMemo(() => calcStreak(source.daily, todayStr), [source.daily, todayStr]);

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
            {streak > 0 && <span style={{ fontSize: 13, fontWeight: 700 }}>연속 {streak}일❤️‍🔥</span>}
          </div>
          <WritingCalendar daily={source.daily} todayStr={todayStr} />
        </section>

        <WritingStats records={source.records} daily={source.daily} />

        <TimelapseSection records={source.records} />

        <RecentTopics records={source.records} />
      </div>
    </section>
  );
}
