import { useMemo } from 'react';
import { fmtKRW, fmtDateKR } from '../utils/format.js';
import QuickLinksCard from '../components/home/QuickLinksCard.jsx';

function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

const CHALLENGE_START_DATE = '2026-02-08';

function getCurrentChallengeDay() {
  const ms = 24 * 60 * 60 * 1000;
  const today = new Date();
  const [y, m, d] = CHALLENGE_START_DATE.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const diff = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - start) / ms) + 1;
  return Math.max(1, diff);
}

function calcStreak(daily, todayStr) {
  const dateSet = new Set(daily.filter((d) => d.char_count > 0).map((d) => d.date));
  let streak = 0;
  const cur = new Date(todayStr);
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

function fmtNumber(n) {
  return n.toLocaleString('ko-KR');
}

export default function HomePage({ dashboard, writingData, onNavigate }) {
  const { totalExpense, avg90, recordPhotos } = dashboard;
  const avg90Label = Number.isFinite(Number(avg90)) ? fmtKRW(Number(avg90)) : '-';
  const photos = (Array.isArray(recordPhotos) ? recordPhotos : []).slice(0, 6);
  const currentDay = getCurrentChallengeDay();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const daily = writingData?.daily || [];
  const records = writingData?.records || [];

  const streak = useMemo(() => calcStreak(daily, todayStr), [daily, todayStr]);

  const writingStats = useMemo(() => {
    let totalMinutes = 0;
    let totalChars = 0;
    for (const r of records) {
      totalMinutes += parseMinutes(r.start_time, r.end_time);
      totalChars += r.char_count || 0;
    }
    if (totalChars === 0) {
      totalChars = daily.reduce((s, d) => s + d.char_count, 0);
    }
    return { totalMinutes, totalChars };
  }, [records, daily]);

  const todayRecord = useMemo(() => {
    return records.find((r) => r.date === todayStr) || null;
  }, [records, todayStr]);

  const recentTopics = useMemo(() => {
    const sorted = [...records].filter((r) => r.date !== todayStr).sort((a, b) => (a.date < b.date ? 1 : -1));
    const result = [];
    for (const r of sorted) {
      for (const t of (r.topics || [])) {
        result.push({ date: r.date, topic: t });
        if (result.length >= 5) break;
      }
      if (result.length >= 5) break;
    }
    return result;
  }, [records, todayStr]);

  return (
    <section className="screen active" id="screen-home">
      <div className="home-hub">
        <div className="home-headline-row">
          <h1 className="home-headline"><span className="home-headline-line">자아실현 뺀질이,</span> <span className="home-headline-line">방향성 찾기 <span className="home-headline-day">{currentDay}일차</span>!</span></h1>
          <QuickLinksCard />
        </div>

        <section
          className="card hub-spending-card"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('spending')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('spending'); }}
        >
          <p className="hub-spending-title">
            💸 소비생활: 하루 평균 <strong>{avg90Label}</strong> 소비 중
          </p>
          <div className="hub-spending-total">
            <span className="hub-spending-total-label">지금까지 지불한 총 금액</span>
            <span className="hub-spending-total-row">
              <strong>{fmtKRW(totalExpense)}</strong>
              <span className="hub-spending-since">2026.02.08~</span>
            </span>
          </div>

          {photos.length > 0 && (
            <div className="hub-spending-photos">
              {photos.map((item) => (
                <img
                  key={`hub-photo-${item.id}`}
                  src={item.photo_url_resized}
                  alt={`${fmtDateKR(item.transaction_date)} 기록`}
                  className="hub-spending-photo"
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          )}
        </section>

        <section
          className="card hub-writing-card"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('writing')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('writing'); }}
        >
          <p className="hub-writing-title">
            ✍️ 글쓰기: {streak > 0 ? <>연속 <strong>{streak}일</strong>❤️‍🔥</> : '오늘도 써볼까?'}
          </p>
          <div className="hub-writing-body">
            <div className="hub-writing-left">
              <div className="hub-writing-stats">
                <div className="hub-writing-stat">
                  <span className="hub-writing-stat-label">누적 시간</span>
                  <span className="hub-writing-stat-value">{fmtDuration(writingStats.totalMinutes)}</span>
                </div>
                <div className="hub-writing-stat">
                  <span className="hub-writing-stat-label">누적 글자수</span>
                  <span className="hub-writing-stat-value">{fmtNumber(writingStats.totalChars)}자</span>
                </div>
                <span className="hub-writing-since">2026.04.18~</span>
              </div>
            </div>

            <div className="hub-writing-today">
              {todayRecord ? (
                <div className="hub-writing-today-done">
                  {todayRecord.timelapse_video_url && (
                    <div className="hub-writing-today-video">
                      <video
                        src={todayRecord.timelapse_video_url}
                        muted
                        autoPlay
                        loop
                        playsInline
                        className="hub-writing-today-video-el"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div className="hub-writing-today-info">
                    <span className="hub-writing-today-date">{fmtDateShort(todayRecord.date)}</span>
                    <span className="hub-writing-today-detail">
                      {[todayRecord.place_name, todayRecord.start_time ? `${todayRecord.start_time}~${todayRecord.end_time || ''}` : ''].filter(Boolean).join(', ')}
                    </span>
                    <span className="hub-writing-today-detail">
                      {[parseMinutes(todayRecord.start_time, todayRecord.end_time) > 0 ? `${parseMinutes(todayRecord.start_time, todayRecord.end_time)}분` : '', todayRecord.char_count ? `${fmtNumber(todayRecord.char_count)}자` : ''].filter(Boolean).join(', ')}
                    </span>
                    {todayRecord.topics?.length > 0 && (
                      <span className="hub-writing-today-topics">{todayRecord.topics.join(', ')}</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="hub-writing-today-empty">오늘은 아직 글을 쓰지 않았어요!</p>
              )}
            </div>

            {recentTopics.length > 0 && (
              <ul className="hub-writing-topics">
                {recentTopics.map((t, i) => (
                  <li key={`${t.date}-${t.topic}-${i}`} className="hub-writing-topic">
                    <span className="hub-writing-topic-date">{fmtDateShort(t.date)}:</span> {t.topic}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
