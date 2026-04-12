import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDashboardQuery from './hooks/useDashboardQuery.js';
import { dashboardRepository } from './services/dashboardRepository.js';
import './styles/presentation.css';

const CHALLENGE_START_DATE = '2026-02-08';
const CHARACTER_IMAGE_URL = '/assets/ppanzziri-character.png';
const PIE_COLORS = ['#ff7a59', '#ffb347', '#ffd166', '#7bd389', '#4ecdc4', '#6ea8fe', '#9b7bff', '#ff7eb6', '#c7f464', '#f78fb3'];
const EFFECT_OPTIONS = [
  { value: 'normal', label: '일반' },
  { value: 'vivid', label: '비비드' },
  { value: 'mono', label: '흑백' },
  { value: 'retro', label: '레트로' },
  { value: 'party', label: '파티' },
  { value: 'cinema', label: '시네마' },
  { value: 'warm', label: '웜톤' },
  { value: 'cool', label: '쿨톤' },
  { value: 'dream', label: '드림' },
  { value: 'glitch', label: '글리치' },
  { value: 'warp', label: '빗물' },
];
const EFFECT_COLOR_OPTIONS = ['normal', 'vivid', 'mono', 'retro', 'party', 'cinema', 'warm', 'cool', 'dream'];
const EFFECT_MANIP_OPTIONS = ['glitch', 'warp'];
const COLOR_EFFECT_OPTION_ITEMS = EFFECT_OPTIONS.filter((option) => EFFECT_COLOR_OPTIONS.includes(option.value));
const MANIP_EFFECT_OPTION_ITEMS = EFFECT_OPTIONS.filter((option) => EFFECT_MANIP_OPTIONS.includes(option.value));

const EMPTY_DASHBOARD = {
  startCapital: 0,
  records: [],
  certifications: [],
  social: {
    youtube_embed_url: '',
    instagram_post_url: '',
    instagram_profile_url: '',
    extra_links: [],
  },
};

function toISODateLocal(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysToISODate(iso, offset) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + offset);
  return toISODateLocal(base);
}

function getDefaultPresentationDate(date = new Date()) {
  const base = new Date(date);
  if (base.getHours() < 6) {
    base.setDate(base.getDate() - 1);
  }
  return toISODateLocal(base);
}

function fmtDateYYMMDD(iso) {
  const [, m, d] = String(iso).split('-');
  return `${m || '00'}.${d || '00'}`;
}

function fmtWon(amount) {
  const n = Math.round(Number(amount || 0));
  return `${Math.abs(n).toLocaleString('ko-KR')}원`;
}

function fmtSignedWon(amount) {
  const n = Math.round(Number(amount || 0));
  const sign = n >= 0 ? '+' : '-';
  return `${sign} ${fmtWon(n)}`;
}

function challengeDayLabel(todayISO) {
  const [sy, sm, sd] = CHALLENGE_START_DATE.split('-').map(Number);
  const [ty, tm, td] = todayISO.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const today = new Date(ty, tm - 1, td);
  const diffMs = today.getTime() - start.getTime();
  const day = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
  return `D+${day}`;
}

function openDatePicker(target) {
  if (!target) return;
  try {
    if (typeof target.showPicker === 'function') {
      target.showPicker();
    }
  } catch {
    // ignore unsupported browser or restricted gesture context
  }
}

async function requestCameraStream() {
  const constraintsList = [
    {
      video: {
        facingMode: 'user',
        aspectRatio: { ideal: 16 / 9 },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: 'user',
        aspectRatio: { ideal: 16 / 9 },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: 'user',
      },
      audio: false,
    },
  ];

  let lastError = null;
  for (const constraints of constraintsList) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('카메라 권한 요청 실패');
}

function normalizeRange(startDateISO, endDateISO) {
  return startDateISO <= endDateISO ? [startDateISO, endDateISO] : [endDateISO, startDateISO];
}

function buildTagTotals(records) {
  const totals = {
    expense: new Map(),
    income: new Map(),
  };

  records.forEach((record) => {
    const bucket = record.type === 'income' ? totals.income : totals.expense;
    const tags = Array.isArray(record.tags) && record.tags.length > 0 ? record.tags : [{ name: '미분류', amount: record.amount }];
    tags.forEach((tag) => {
      const name = String(tag?.name || '미분류').trim() || '미분류';
      const amount = Number(tag?.amount ?? 0);
      bucket.set(name, (bucket.get(name) || 0) + amount);
    });
  });

  return {
    expense: Array.from(totals.expense.entries())
      .map(([name, amount], index) => ({ name, amount, color: PIE_COLORS[index % PIE_COLORS.length] }))
      .sort((a, b) => b.amount - a.amount),
    income: Array.from(totals.income.entries())
      .map(([name, amount], index) => ({ name, amount, color: PIE_COLORS[index % PIE_COLORS.length] }))
      .sort((a, b) => b.amount - a.amount),
  };
}

function buildPieSegments(items) {
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (!total) return [];

  let accumulated = -Math.PI / 2;
  return items.map((item) => {
    const ratio = Number(item.amount || 0) / total;
    const startAngle = accumulated;
    const endAngle = accumulated + ratio * Math.PI * 2;
    accumulated = endAngle;
    return { ...item, startAngle, endAngle };
  });
}

function polarToCartesian(cx, cy, r, angle) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function TagPieChart({ title, items, emptyLabel }) {
  const segments = buildPieSegments(items);

  return (
    <section className="presentation-tag-card">
      <p className="presentation-tag-title">{title}</p>
      {segments.length > 0 ? (
        <>
          <svg className="presentation-tag-chart" viewBox="0 0 120 120" aria-hidden="true">
            {segments.map((segment) => (
              <path
                key={`${title}-${segment.name}`}
                d={describeArc(60, 60, 54, segment.startAngle, segment.endAngle)}
                fill={segment.color}
                stroke="rgba(0, 0, 0, 0.28)"
                strokeWidth="1"
              />
            ))}
            <circle cx="60" cy="60" r="26" fill="rgba(0, 0, 0, 0.72)" />
          </svg>
          <div className="presentation-tag-legend">
            {items.map((item) => (
              <div key={`${title}-${item.name}`} className="presentation-tag-legend-item">
                <span className="presentation-tag-chip" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <span className="presentation-tag-legend-name">{item.name}</span>
                <span className="presentation-tag-legend-value">{fmtWon(item.amount)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="presentation-tag-empty">{emptyLabel}</p>
      )}
    </section>
  );
}

export default function PresentationApp() {
  const { data, loading, error, reload } = useDashboardQuery(dashboardRepository);
  const source = data || EMPTY_DASHBOARD;
  const records = Array.isArray(source.records) ? source.records : [];
  const startCapital = Number(source.startCapital || 0);
  const todayISO = getDefaultPresentationDate(new Date());
  const defaultStartISO = addDaysToISODate(todayISO, -6);
  const [rangeStartISO, setRangeStartISO] = useState(defaultStartISO);
  const [rangeEndISO, setRangeEndISO] = useState(todayISO);
  const [showSettings, setShowSettings] = useState(false);
  const [colorEffectMode, setColorEffectMode] = useState('vivid');
  const [activeManipEffect, setActiveManipEffect] = useState('');
  const [revealState, setRevealState] = useState({
    started: false,
    currentDayIndex: 0,
    revealedCount: 0,
    completedDayCount: 0,
    activePhoto: '',
    finalVisible: false,
  });

  const videoRef = useRef(null);
  const previewVideoRefs = useRef({});
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const manipTimerRef = useRef(null);
  const effectMode = activeManipEffect || colorEffectMode;

  useEffect(
    () => () => {
      if (manipTimerRef.current) {
        window.clearTimeout(manipTimerRef.current);
        manipTimerRef.current = null;
      }
    },
    []
  );

  const triggerManipEffect = useCallback((effectValue) => {
    setActiveManipEffect(effectValue);
    if (manipTimerRef.current) {
      window.clearTimeout(manipTimerRef.current);
      manipTimerRef.current = null;
    }
    manipTimerRef.current = window.setTimeout(() => {
      setActiveManipEffect('');
      manipTimerRef.current = null;
    }, 3000);
  }, []);

  const stageRef = useRef(null);
  const initCamera = useCallback(async () => {
    setCameraError('');
    setCameraReady(false);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await requestCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : '카메라 권한 요청 실패');
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('이 브라우저는 카메라를 지원하지 않습니다.');
      return undefined;
    }
    initCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [initCamera]);

  useEffect(() => {
    if (!streamRef.current) return;
    const stream = streamRef.current;
    for (const option of [...COLOR_EFFECT_OPTION_ITEMS, ...MANIP_EFFECT_OPTION_ITEMS]) {
      const el = previewVideoRefs.current[option.value];
      if (!el) continue;
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    }
  }, [showSettings, cameraReady]);

  const [normalizedStartISO, normalizedEndISO] = useMemo(
    () => normalizeRange(rangeStartISO || todayISO, rangeEndISO || todayISO),
    [rangeEndISO, rangeStartISO, todayISO]
  );

  const presentationData = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      if (a.transaction_date !== b.transaction_date) return a.transaction_date < b.transaction_date ? -1 : 1;
      return Number(a.id || 0) - Number(b.id || 0);
    });

    let startBalance = startCapital;
    sorted.forEach((item) => {
      if (item.transaction_date < normalizedStartISO) {
        startBalance += item.type === 'income' ? Number(item.amount || 0) : -Number(item.amount || 0);
      }
    });

    const inRange = sorted.filter((item) => item.transaction_date >= normalizedStartISO && item.transaction_date <= normalizedEndISO);
    const groupedMap = new Map();
    inRange.forEach((item) => {
      if (!groupedMap.has(item.transaction_date)) {
        groupedMap.set(item.transaction_date, []);
      }
      groupedMap.get(item.transaction_date).push(item);
    });

    let runningBalance = startBalance;
    const groups = Array.from(groupedMap.entries()).map(([date, items]) => {
      const delta = items.reduce(
        (sum, item) => sum + (item.type === 'income' ? Number(item.amount || 0) : -Number(item.amount || 0)),
        0
      );
      runningBalance += delta;
      return {
        date,
        items,
        delta,
        endBalance: runningBalance,
      };
    });

    const tagTotals = buildTagTotals(inRange);

    return {
      startBalance,
      endBalance: runningBalance,
      groups,
      tagTotals,
    };
  }, [normalizedEndISO, normalizedStartISO, records, startCapital]);

  const currentGroup = presentationData.groups[revealState.currentDayIndex] || null;
  const focusDateISO = revealState.finalVisible
    ? normalizedEndISO
    : currentGroup?.date || presentationData.groups[presentationData.groups.length - 1]?.date || normalizedEndISO;
  const summaryGroups = presentationData.groups.slice(0, revealState.completedDayCount);
  const visibleCurrentItems =
    revealState.finalVisible || !currentGroup ? [] : currentGroup.items.slice(0, revealState.revealedCount);

  const photoHistory = useMemo(() => {
    const currentThumbItems = [...visibleCurrentItems];
    if (revealState.activePhoto && currentThumbItems.length > 0) {
      const lastVisibleItem = currentThumbItems[currentThumbItems.length - 1];
      if (lastVisibleItem?.photo_url === revealState.activePhoto) {
        currentThumbItems.pop();
      }
    }

    const items = [
      ...summaryGroups.flatMap((group) => group.items),
      ...currentThumbItems,
    ];
    return items.filter((item) => item.photo_url).map((item) => ({
      id: item.id,
      photo_url: item.photo_url,
      photo_url_resized: item.photo_url_resized,
      date: item.transaction_date,
    }));
  }, [revealState.activePhoto, summaryGroups, visibleCurrentItems]);

  const advancePresentation = useCallback(() => {
    setRevealState((prev) => {
      const groups = presentationData.groups;
      const current = groups[prev.currentDayIndex];

      if (!current) {
        return {
          ...prev,
          started: true,
          finalVisible: true,
        };
      }

      if (prev.revealedCount < current.items.length) {
        const nextItem = current.items[prev.revealedCount];
        return {
          started: true,
          currentDayIndex: prev.currentDayIndex,
          revealedCount: prev.revealedCount + 1,
          completedDayCount: prev.completedDayCount,
          activePhoto: nextItem?.photo_url || '',
          finalVisible: false,
        };
      }

      if (prev.currentDayIndex < groups.length - 1) {
        return {
          started: true,
          currentDayIndex: prev.currentDayIndex + 1,
          revealedCount: 0,
          completedDayCount: prev.currentDayIndex + 1,
          activePhoto: '',
          finalVisible: false,
        };
      }

      return {
        ...prev,
        started: true,
        completedDayCount: groups.length,
        activePhoto: '',
        finalVisible: true,
      };
    });
  }, [presentationData.groups]);

  useEffect(() => {
    setRevealState({
      started: false,
      currentDayIndex: 0,
      revealedCount: 0,
      completedDayCount: 0,
      activePhoto: '',
      finalVisible: false,
    });
  }, [normalizedEndISO, normalizedStartISO, presentationData.groups.length]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== 'Space' && e.code !== 'Tab') return;

      const activeTag = String(document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      e.preventDefault();
      advancePresentation();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advancePresentation]);

  useEffect(() => {
    if (!revealState.activePhoto) return undefined;
    const timer = window.setTimeout(() => {
      setRevealState((prev) => (prev.activePhoto ? { ...prev, activePhoto: '' } : prev));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [revealState.activePhoto]);

  const handlePointerAdvance = useCallback(
    (e) => {
      if (Date.now() < suppressAdvanceUntilRef.current) return;
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      if (
        target.closest(
          '.presentation-settings-modal, .presentation-status, button, input, select, label, .presentation-manip-grid, .presentation-character-btn'
        )
      ) {
        return;
      }

      if (clickAdvanceTimerRef.current) return;

      clickAdvanceTimerRef.current = window.setTimeout(() => {
        clickAdvanceTimerRef.current = null;
        if (Date.now() < suppressAdvanceUntilRef.current) return;
        advancePresentation();
      }, 420);
    },
    [advancePresentation]
  );

  const showFinal = revealState.finalVisible && !revealState.activePhoto;

  const recordingCleanupRef = useRef(null);
  const clickAdvanceTimerRef = useRef(null);
  const suppressAdvanceUntilRef = useRef(0);
  const recordingActivatedRef = useRef(false);

  const stopRecording = useCallback(() => {
    if (recordingCleanupRef.current) {
      recordingCleanupRef.current();
      recordingCleanupRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      stopRecording();
      if (clickAdvanceTimerRef.current) {
        window.clearTimeout(clickAdvanceTimerRef.current);
        clickAdvanceTimerRef.current = null;
      }
    },
    [stopRecording]
  );

  const startRecording = useCallback(async () => {
    if (recording) return;
    if (!stageRef.current) {
      setRecordingError('녹화 영역을 찾지 못했습니다.');
      return;
    }

    setRecordingError('');
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
          displaySurface: 'browser',
        },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
      });

      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        micStream = null;
      }

      const displayTrack = displayStream.getVideoTracks()[0];
      const surface = String(displayTrack.getSettings().displaySurface || '');
      if (surface && surface !== 'browser') {
        displayStream.getTracks().forEach((t) => t.stop());
        if (micStream) micStream.getTracks().forEach((t) => t.stop());
        throw new Error('녹화 대상은 "현재 탭"으로 선택해 주세요. 그래야 16:9 영역만 정확히 저장됩니다.');
      }

      let outputStream = null;
      let sourceVideo = null;
      let rafId = 0;
      let usingCanvasFallback = false;

      const canRegionCrop =
        typeof window.CropTarget !== 'undefined' &&
        typeof window.CropTarget.fromElement === 'function' &&
        typeof displayTrack.cropTo === 'function';

      if (canRegionCrop && stageRef.current) {
        const cropTarget = await window.CropTarget.fromElement(stageRef.current);
        await displayTrack.cropTo(cropTarget);
        outputStream = new MediaStream([displayTrack]);
      } else {
        usingCanvasFallback = true;
        sourceVideo = document.createElement('video');
        sourceVideo.playsInline = true;
        sourceVideo.muted = true;
        sourceVideo.srcObject = displayStream;
        await sourceVideo.play();

        const outCanvas = document.createElement('canvas');
        outCanvas.width = 1920;
        outCanvas.height = 1080;
        const outCtx = outCanvas.getContext('2d', { alpha: false });
        if (!outCtx) throw new Error('녹화 캔버스를 초기화하지 못했습니다.');

        const settings = displayTrack.getSettings();
        const srcW = Number(settings.width || sourceVideo.videoWidth || 1920);
        const srcH = Number(settings.height || sourceVideo.videoHeight || 1080);

        const draw = () => {
          if (!stageRef.current) return;
          const rect = stageRef.current.getBoundingClientRect();
          const ratioX = srcW / Math.max(window.innerWidth, 1);
          const ratioY = srcH / Math.max(window.innerHeight, 1);
          const sx = Math.max(0, rect.left * ratioX);
          const sy = Math.max(0, rect.top * ratioY);
          const sWidth = Math.max(1, rect.width * ratioX);
          const sHeight = Math.max(1, rect.height * ratioY);
          outCtx.drawImage(sourceVideo, sx, sy, sWidth, sHeight, 0, 0, outCanvas.width, outCanvas.height);
          rafId = window.requestAnimationFrame(draw);
        };
        rafId = window.requestAnimationFrame(draw);
        outputStream = outCanvas.captureStream(30);
        setRecordingError('브라우저가 영역 크롭 API를 지원하지 않아 fallback 녹화를 사용 중입니다.');
      }

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioDest = audioCtx.createMediaStreamDestination();

      if (displayStream.getAudioTracks().length > 0) {
        const displayAudio = audioCtx.createMediaStreamSource(displayStream);
        displayAudio.connect(audioDest);
      }
      if (micStream && micStream.getAudioTracks().length > 0) {
        const micAudio = audioCtx.createMediaStreamSource(micStream);
        micAudio.connect(audioDest);
      }

      const mixedAudioTrack = audioDest.stream.getAudioTracks()[0];
      if (mixedAudioTrack) outputStream.addTrack(mixedAudioTrack);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm;codecs=vp8,opus';
      const recorder = new MediaRecorder(outputStream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size > 0) {
          const now = new Date();
          const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(
            2,
            '0'
          )}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(
            now.getSeconds()
          ).padStart(2, '0')}`;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `presentation-${stamp}.webm`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
      };

      recorder.start(1000);
      setRecording(true);
      recordingActivatedRef.current = true;

      const cleanup = () => {
        if (rafId) window.cancelAnimationFrame(rafId);
        if (recorder.state !== 'inactive') recorder.stop();
        outputStream.getTracks().forEach((t) => t.stop());
        displayStream.getTracks().forEach((t) => t.stop());
        if (micStream) micStream.getTracks().forEach((t) => t.stop());
        if (usingCanvasFallback && sourceVideo) {
          sourceVideo.pause();
          sourceVideo.srcObject = null;
        }
        audioCtx.close().catch(() => {});
        setRecording(false);
      };

      recordingCleanupRef.current = cleanup;
      displayTrack.addEventListener(
        'ended',
        () => {
          if (recordingCleanupRef.current) {
            recordingCleanupRef.current();
            recordingCleanupRef.current = null;
          }
        },
        { once: true }
      );
    } catch (err) {
      setRecording(false);
      setRecordingError(err instanceof Error ? err.message : '녹화 시작에 실패했습니다.');
    }
  }, [recording]);

  const isInteractionExcludedTarget = useCallback((target) => {
    if (!target) return true;
    return Boolean(
      target.closest(
        '.presentation-settings-modal, .presentation-status, button, input, select, label, .presentation-manip-grid, .presentation-character-btn'
      )
    );
  }, []);

  const handleDoubleClickRecording = useCallback(
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (isInteractionExcludedTarget(target)) return;

      if (clickAdvanceTimerRef.current) {
        window.clearTimeout(clickAdvanceTimerRef.current);
        clickAdvanceTimerRef.current = null;
      }
      suppressAdvanceUntilRef.current = Date.now() + 520;

      e.preventDefault();
      if (recording) {
        stopRecording();
      } else {
        startRecording();
      }
    },
    [isInteractionExcludedTarget, recording, startRecording, stopRecording]
  );

  return (
    <main
      className={`presentation-root effect-${effectMode}`}
      onPointerDown={handlePointerAdvance}
      onDoubleClick={handleDoubleClickRecording}
    >
      <section className="presentation-stage" ref={stageRef}>
        <svg className="presentation-fx-defs" aria-hidden="true" focusable="false">
          <filter id="presentation-warp-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="2" seed="9" result="warpNoise">
              <animate attributeName="seed" from="1" to="9999" dur="7s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="warpNoise" scale="34" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="presentation-glitch-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.018 0.14" numOctaves="1" seed="3" result="noise">
              <animate attributeName="baseFrequency" dur="0.8s" values="0.02 0.12;0.01 0.20;0.02 0.12" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" />
          </filter>
        </svg>
        <video ref={videoRef} className="presentation-camera" playsInline muted autoPlay />
        <div className="presentation-shade" />
        <div className="presentation-fx-layer fx-scanlines" aria-hidden="true" />
        <div className="presentation-fx-layer fx-noise" aria-hidden="true" />

        <section className="presentation-overlay left-top">
          <button
            type="button"
            className="presentation-character-btn"
            onClick={() => setShowSettings(true)}
            aria-label="설정 열기"
          >
            <img src={CHARACTER_IMAGE_URL} alt="방향성 찾기 캐릭터" />
          </button>
          <p className="left-main">
            뺀질라이프
            <br />
            오래 살아남기 {challengeDayLabel(focusDateISO)}
          </p>
          <p className="left-date">{fmtDateYYMMDD(focusDateISO)}</p>
        </section>

        {photoHistory.length > 0 && (
          <section className="presentation-overlay top-strip" aria-label="지나간 사진 목록">
            <div className="presentation-thumb-grid">
              {photoHistory.map((item) => (
                <img key={`thumb-${item.id}`} className="presentation-thumb" src={item.photo_url_resized} alt={`${item.date} 사진`} />
              ))}
            </div>
          </section>
        )}

        <section className="presentation-overlay right-top">
          <div className="presentation-metrics">
            <div className="presentation-summary-block">
              <p className="balance-main">{fmtWon(presentationData.startBalance)}</p>
              <div className="presentation-summary-list">
                {summaryGroups.map((group) => (
                  <p key={`summary-${group.date}`} className="today-item day-summary">
                    <span className="day-summary-date">{fmtDateYYMMDD(group.date)}</span>
                    <span className="day-summary-value">{fmtSignedWon(group.delta)}</span>
                  </p>
                ))}
              </div>
              {showFinal && (
                <>
                  <p className="balance-divider">-----------------------</p>
                  <p className="balance-main">{fmtWon(presentationData.endBalance)}</p>
                </>
              )}
            </div>
            <div className="presentation-detail-list">
              {visibleCurrentItems.map((item) => (
                <p key={`item-${item.id}`} className="today-item detail-item">
                  <span className="detail-content">
                    <span className="detail-meta">
                      {(item.tags || [])
                        .map((tag) => String(tag?.name || '').trim())
                        .filter(Boolean)
                        .map((tagName) => (
                          <span key={`${item.id}-${tagName}`} className="detail-tag-pill">
                            {tagName}
                          </span>
                        ))}
                    </span>
                    <span className="detail-text">
                      {item.memo || (item.type === 'expense' ? '지출' : '수입')}
                    </span>
                  </span>
                  <span className="detail-amount">{fmtSignedWon(item.type === 'expense' ? -item.amount : item.amount)}</span>
                </p>
              ))}
            </div>
          </div>
        </section>

        {revealState.activePhoto && (
          <section className="presentation-center-photo" aria-label="현재 내역 사진">
            <img src={revealState.activePhoto} alt="현재 내역 첨부 사진" />
          </section>
        )}

        {showFinal && (
          <section className="presentation-overlay left-bottom">
            <div className="presentation-tag-summary">
              <TagPieChart title="지출 분류" items={presentationData.tagTotals.expense} emptyLabel="지출 없음" />
              <TagPieChart title="수입 분류" items={presentationData.tagTotals.income} emptyLabel="수입 없음" />
            </div>
          </section>
        )}

        {showSettings && (
          <section className="presentation-settings-modal" onClick={() => setShowSettings(false)}>
            <div className="presentation-settings-modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="presentation-settings-close"
                aria-label="설정 닫기"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
              <div className="presentation-settings-panel">
                <div className="presentation-date-range">
                  <label className="presentation-date-field">
                    시작일
                    <input
                      type="date"
                      value={rangeStartISO}
                      onChange={(e) => setRangeStartISO(e.target.value || defaultStartISO)}
                      onClick={(e) => openDatePicker(e.currentTarget)}
                      onFocus={(e) => openDatePicker(e.currentTarget)}
                    />
                  </label>
                  <label className="presentation-date-field">
                    종료일
                    <input
                      type="date"
                      value={rangeEndISO}
                      onChange={(e) => setRangeEndISO(e.target.value || todayISO)}
                      onClick={(e) => openDatePicker(e.currentTarget)}
                      onFocus={(e) => openDatePicker(e.currentTarget)}
                    />
                  </label>
                </div>
                <div className="presentation-date-row">
                  <button
                    type="button"
                    className="presentation-btn ghost"
                    onClick={() => {
                      setRangeStartISO(defaultStartISO);
                      setRangeEndISO(todayISO);
                    }}
                  >
                    최근 7일
                  </button>
                  <button
                    type="button"
                    className="presentation-btn ghost presentation-today-btn"
                    onClick={() => {
                      setRangeStartISO(todayISO);
                      setRangeEndISO(todayISO);
                    }}
                  >
                    오늘로
                  </button>
                </div>
                <section className="presentation-effect-picker" aria-label="색감 효과 선택">
                  <p className="presentation-effect-title">색감 효과</p>
                  <div className="presentation-effect-grid">
                    {COLOR_EFFECT_OPTION_ITEMS.map((option) => {
                      const selected = colorEffectMode === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`presentation-effect-option${selected ? ' active' : ''}`}
                          onClick={() => setColorEffectMode(option.value)}
                          aria-pressed={selected}
                        >
                          <video
                            ref={(node) => {
                              previewVideoRefs.current[option.value] = node;
                            }}
                            className={`presentation-effect-preview-video effect-${option.value}`}
                            playsInline
                            muted
                            autoPlay
                            aria-hidden="true"
                          />
                          <span className="presentation-effect-label">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section className="presentation-effect-picker" aria-label="영상 왜곡 효과 선택">
                  <p className="presentation-effect-title">영상 왜곡</p>
                  <div className="presentation-manip-grid">
                    {MANIP_EFFECT_OPTION_ITEMS.map((option) => {
                      const selected = activeManipEffect === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`presentation-manip-card${selected ? ' active' : ''}`}
                          onClick={() => triggerManipEffect(option.value)}
                          aria-pressed={selected}
                        >
                          <video
                            ref={(node) => {
                              previewVideoRefs.current[option.value] = node;
                            }}
                            className={`presentation-manip-preview effect-${option.value}`}
                            playsInline
                            muted
                            autoPlay
                            aria-hidden="true"
                          />
                          <span className="presentation-manip-label">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          </section>
        )}

        {(loading || error || cameraError || !cameraReady || recordingError) && (
          <section className="presentation-status">
            {loading && <p>데이터 로딩 중...</p>}
            {error && <p>데이터 조회 실패</p>}
            {cameraError && <p>카메라 오류: {cameraError}</p>}
            {recordingError && <p>녹화 오류: {recordingError}</p>}
            {!cameraReady && (
              <button type="button" className="presentation-btn" onClick={initCamera}>
                카메라 권한 요청
              </button>
            )}
            {error && (
              <button type="button" className="presentation-btn ghost" onClick={reload}>
                데이터 재시도
              </button>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
