import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtDateKR, fmtKRW } from '../../utils/format.js';

export default function SurvivalCurveCard({ balanceSeries, start30, startCapital }) {
  const [range, setRange] = useState('30');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const sliced = useMemo(() => {
    if (range === 'all') return balanceSeries;
    return balanceSeries.filter((p) => p.date >= start30);
  }, [balanceSeries, range, start30]);

  const values = useMemo(() => sliced.map((p) => Math.round(p.balance)), [sliced]);
  const min = values.length ? Math.min(...values, startCapital) : startCapital;
  const max = values.length ? Math.max(...values, startCapital) : startCapital;

  useEffect(() => {
    if (!canvasRef.current) return;
    if (typeof window.Chart !== 'function') return;
    if (chartRef.current) chartRef.current.destroy();

    const labels = sliced.map((p) => fmtDateKR(p.date));
    const baseline = new Array(values.length).fill(startCapital);

    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '잔액',
            data: values,
            borderColor: '#111111',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
          },
          {
            label: '기준선',
            data: baseline,
            borderColor: '#bdbdbd',
            borderWidth: 1,
            pointRadius: 0,
            borderDash: [4, 4],
            tension: 0,
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
              label: (ctx) => `${ctx.dataset.label}: ${fmtKRW(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#999', maxTicksLimit: 6, font: { size: 11, weight: '600' } },
          },
          y: {
            grid: { color: 'rgba(0,0,0,.06)' },
            ticks: {
              color: '#999',
              maxTicksLimit: 5,
              font: { size: 11, weight: '600' },
              callback: (v) => `${Math.round(v / 10000)}만`,
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
  }, [sliced, startCapital, values]);

  return (
    <section className="card card-lg">
      <div className="card-header">
        <h2>생존 곡선</h2>
        <div className="segmented">
          <button type="button" className={`segbtn ${range === '30' ? 'active' : ''}`} onClick={() => setRange('30')}>30일</button>
          <button type="button" className={`segbtn ${range === 'all' ? 'active' : ''}`} onClick={() => setRange('all')}>전체</button>
        </div>
      </div>
      <div className="chart-wrap">
        <canvas ref={canvasRef} aria-label="잔액 추이 차트" />
      </div>
      <div className="two-col">
        <div><p className="eyebrow">최저 잔액</p><p className="kpi">{fmtKRW(min)}</p></div>
        <div><p className="eyebrow">최고 잔액</p><p className="kpi">{fmtKRW(max)}</p></div>
      </div>
    </section>
  );
}
