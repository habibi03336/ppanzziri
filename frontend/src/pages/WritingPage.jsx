import { useEffect, useMemo, useRef, useState } from 'react';
import useDashboardQuery from '../hooks/useDashboardQuery.js';
import { writingDashboardRepository } from '../services/writingDashboardRepository.js';
import WritingGlobe from '../components/home/WritingGlobe.jsx';

const HEATMAP_COLORS = [
  '#ebedf0',
  '#c6e48b',
  '#7bc96f',
  '#239a3b',
  '#196127',
];

function getHeatmapLevel(charCount) {
  if (charCount <= 0) return 0;
  if (charCount < 800) return 1;
  if (charCount < 1600) return 2;
  if (charCount < 2400) return 3;
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

// --- Calendar (6 months, no scroll, fit in view) ---
function buildCalendarWeeks(daily, todayStr) {
  const dayMap = new Map(daily.map((d) => [d.date, d]));
  const today = new Date(todayStr);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 182);
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

// --- Stats (inline, used inside calendar card) ---
function WritingStatsInline({ records, daily }) {
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let totalChars = 0;
    for (const r of records) {
      totalMinutes += parseMinutes(r.start_time, r.end_time);
      totalChars += r.char_count;
    }
    if (totalChars === 0) {
      totalChars = daily.reduce((s, d) => s + d.char_count, 0);
    }
    const charsPerHour = totalMinutes > 0 ? Math.round(totalChars / (totalMinutes / 60)) : 0;
    return { totalMinutes, totalChars, charsPerHour };
  }, [records, daily]);

  return (
    <div className="writing-stats-inline">
      <div className="writing-stat-inline">
        <span className="writing-stat-inline-value">{fmtDuration(stats.totalMinutes)}</span>
        <span className="writing-stat-inline-label">누적 시간</span>
      </div>
      <div className="writing-stat-inline">
        <span className="writing-stat-inline-value">{fmtNumber(stats.totalChars)}자</span>
        <span className="writing-stat-inline-label">누적 글자수</span>
      </div>
      <div className="writing-stat-inline">
        <span className="writing-stat-inline-value">{stats.charsPerHour > 0 ? `${fmtNumber(stats.charsPerHour)}자/h` : '-'}</span>
        <span className="writing-stat-inline-label">시간당</span>
      </div>
    </div>
  );
}

// --- Place + Timelapse (combined row) ---
function PlaceTimelapse({ records }) {
  const videoRef = useRef(null);

  // Most recent record with location
  const latestWithLocation = useMemo(
    () => [...records]
      .filter((r) => r.latitude != null && r.longitude != null)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null,
    [records],
  );

  const [selected, setSelected] = useState(null);

  // Default select latest on mount
  useEffect(() => {
    if (!selected && latestWithLocation) {
      setSelected(latestWithLocation);
    }
  }, [latestWithLocation]);

  // Records with location data for the map
  const hasLocations = useMemo(
    () => records.some((r) => r.latitude != null && r.longitude != null),
    [records],
  );

  // Find the video to show: selected record's video, or latest video as fallback
  const activeRecord = useMemo(() => {
    if (selected && selected.timelapse_video_url) return selected;
    if (selected) {
      const match = records.find((r) => r.id === selected.id && r.timelapse_video_url);
      if (match) return match;
    }
    return null;
  }, [selected, records]);

  // Auto-play when video source changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [activeRecord?.timelapse_video_url]);

  const hasVideo = activeRecord && activeRecord.timelapse_video_url;

  if (!hasLocations && !hasVideo) return null;

  return (
    <section className="card writing-place-timelapse-card">
      <div className="writing-place-timelapse-row">
        {hasLocations && (
          <WritingGlobe
            records={records}
            selected={selected}
            onSelect={(loc) => setSelected(loc || null)}
          />
        )}
        <div className="writing-timelapse-panel">
          {hasVideo ? (
            <div className="writing-timelapse-hero">
              <video
                ref={videoRef}
                className="writing-timelapse-video-hero"
                src={activeRecord.timelapse_video_url}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
              <div className="writing-timelapse-hero-meta">
                <span>{fmtDateShort(activeRecord.date)}</span>
                {activeRecord.start_time && activeRecord.end_time && (
                  <span>{activeRecord.start_time}~{activeRecord.end_time}</span>
                )}
                {activeRecord.place_name && (
                  <span>{activeRecord.place_name}</span>
                )}
                {(activeRecord.topics || []).length > 0 && (
                  <span>{activeRecord.topics.join(', ')}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="writing-timelapse-empty">
              {selected ? (
                <p className="muted">
                  {selected.place_name || fmtDateShort(selected.date)}
                  <br />타임랩스 없음
                </p>
              ) : (
                <p className="muted">장소를 선택하세요</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
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
          <div className="writing-status-header">
            <div className="writing-status-header-left">
              <h2 style={{ margin: 0, fontSize: 22 }}>글쓰기 현황</h2>
              {streak > 0 && <span style={{ fontSize: 13, fontWeight: 700 }}>연속 {streak}일❤️‍🔥</span>}
            </div>
            <WritingStatsInline records={source.records} daily={source.daily} />
          </div>
          <WritingCalendar daily={source.daily} todayStr={todayStr} />
        </section>

        <PlaceTimelapse records={source.records} />

        <RecentTopics records={source.records} />
      </div>
    </section>
  );
}
