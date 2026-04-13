import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtDateKR, fmtKRW } from '../../utils/format.js';

const Y_AXIS_STEP = 2_500_000;
const Y_AXIS_UP_PAD = 1_000_000;

export default function SurvivalCurveCard({ expenseSeries, start30 }) {
  const [range, setRange] = useState('all');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const sliced = useMemo(() => {
    if (range === 'all') return expenseSeries;
    return expenseSeries.filter((p) => p.date >= start30);
  }, [expenseSeries, range, start30]);

  const values = useMemo(() => sliced.map((p) => Math.round(p.expense)), [sliced]);
  const max = values.length ? Math.max(...values) : 0;
  const yBounds = useMemo(() => {
    let yMax = Math.ceil((max + Y_AXIS_UP_PAD) / Y_AXIS_STEP) * Y_AXIS_STEP;
    if (yMax <= 0) yMax = Y_AXIS_STEP;
    return { yMin: 0, yMax };
  }, [max]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (typeof window.Chart !== 'function') return;
    if (chartRef.current) chartRef.current.destroy();

    const labels = sliced.map((p) => fmtDateKR(p.date));
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '누적 소비',
            data: values,
            borderColor: '#111111',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
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
            min: yBounds.yMin,
            max: yBounds.yMax,
            grid: { color: 'rgba(0,0,0,.06)' },
            ticks: {
              color: '#999',
              maxTicksLimit: 5,
              stepSize: Y_AXIS_STEP,
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
  }, [sliced, values, yBounds]);

  return (
    <section className="card card-lg">
      <div className="card-header">
        <h2>소비 곡선</h2>
        <div className="segmented">
          <button type="button" className={`segbtn ${range === 'all' ? 'active' : ''}`} onClick={() => setRange('all')}>전체</button>
          <button type="button" className={`segbtn ${range === '30' ? 'active' : ''}`} onClick={() => setRange('30')}>30일</button>
        </div>
      </div>
      <div className="chart-wrap">
        <canvas ref={canvasRef} aria-label="누적 소비 추이 차트" />
      </div>

    </section>
  );
}
