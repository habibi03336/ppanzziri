import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDashboardQuery from './hooks/useDashboardQuery.js';
import { dashboardRepository } from './services/dashboardRepository.js';
import './styles/presentation.css';

const CHALLENGE_START_DATE = '2026-02-08';
const CHARACTER_IMAGE_URL = '/assets/ppanzziri-character.png';
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

function getDefaultPresentationDate(date = new Date()) {
  const base = new Date(date);
  if (base.getHours() < 6) {
    base.setDate(base.getDate() - 1);
  }
  return toISODateLocal(base);
}

function fmtDateYYMMDD(iso) {
  const [y, m, d] = String(iso).split('-');
  return `${String(y || '').slice(-2)}.${m || '00'}.${d || '00'}`;
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
    // ignore: unsupported browser or restricted gesture context
  }
}

export default function PresentationApp() {
  const { data, loading, error, reload } = useDashboardQuery(dashboardRepository);
  const source = data || EMPTY_DASHBOARD;
  const records = Array.isArray(source.records) ? source.records : [];
  const startCapital = Number(source.startCapital || 0);
  const todayISO = getDefaultPresentationDate(new Date());
  const [targetDateISO, setTargetDateISO] = useState(todayISO);
  const [showSettings, setShowSettings] = useState(false);
  const [colorEffectMode, setColorEffectMode] = useState('vivid');
  const [activeManipEffect, setActiveManipEffect] = useState('');
  const [revealState, setRevealState] = useState({
    started: false,
    revealedCount: 0,
    nextIndex: 0,
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
    }, 5000);
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
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

  const overlay = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      if (a.transaction_date !== b.transaction_date) return a.transaction_date < b.transaction_date ? -1 : 1;
      return Number(a.id || 0) - Number(b.id || 0);
    });

    let startOfTodayBalance = startCapital;
    for (const item of sorted) {
      if (item.transaction_date >= targetDateISO) break;
      startOfTodayBalance += item.type === 'income' ? Number(item.amount || 0) : -Number(item.amount || 0);
    }

    const todayItems = sorted
      .filter((item) => item.transaction_date === targetDateISO)
      .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

    const todayDelta = todayItems.reduce(
      (sum, item) => sum + (item.type === 'income' ? Number(item.amount || 0) : -Number(item.amount || 0)),
      0
    );
    const endOfTodayBalance = startOfTodayBalance + todayDelta;

    return {
      dayLabel: challengeDayLabel(targetDateISO),
      dateLabel: fmtDateYYMMDD(targetDateISO),
      startOfTodayBalance,
      todayItems,
      endOfTodayBalance,
    };
  }, [records, startCapital, targetDateISO]);

  const advancePresentation = useCallback(() => {
    setRevealState((prev) => {
      if (prev.nextIndex < overlay.todayItems.length) {
        const current = overlay.todayItems[prev.nextIndex];
        return {
          started: true,
          revealedCount: prev.revealedCount + 1,
          nextIndex: prev.nextIndex + 1,
          activePhoto: current?.photo_url || '',
          finalVisible: false,
        };
      }

      return {
        ...prev,
        started: true,
        finalVisible: true,
      };
    });
  }, [overlay.todayItems]);

  useEffect(() => {
    setRevealState({
      started: false,
      revealedCount: 0,
      nextIndex: 0,
      activePhoto: '',
      finalVisible: false,
    });
  }, [targetDateISO, overlay.todayItems.length]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== 'Space') return;

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
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [revealState.activePhoto]);

  const handlePointerAdvance = useCallback(
    (e) => {
      if (!recordingActivatedRef.current) return;
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

      if (clickAdvanceTimerRef.current) {
        return;
      }

      clickAdvanceTimerRef.current = window.setTimeout(() => {
        clickAdvanceTimerRef.current = null;
        if (Date.now() < suppressAdvanceUntilRef.current) return;
        advancePresentation();
      }, 420);
    },
    [advancePresentation]
  );

  const visibleItems = overlay.todayItems.slice(0, revealState.revealedCount);
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
      recorder.onstop = () => {
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
            <img src={CHARACTER_IMAGE_URL} alt="뺀질이 캐릭터" />
          </button>
          <p className="left-main">
            뺀질라이프
            <br />
            오래 살아남기 {overlay.dayLabel}
          </p>
          <p className="left-date">{overlay.dateLabel}</p>
        </section>

        <section className="presentation-overlay right-top">
          <p className="balance-main">{fmtWon(overlay.startOfTodayBalance)}</p>
          <div className="today-list">
            {visibleItems.map((item) => (
              <p key={`today-${item.id}`} className="today-item">
                {item.memo || (item.type === 'expense' ? '지출' : '수입')}: {fmtSignedWon(item.type === 'expense' ? -item.amount : item.amount)}
              </p>
            ))}
          </div>
          {showFinal && (
            <>
              <p className="balance-divider">-------------</p>
              <p className="balance-main">{fmtWon(overlay.endOfTodayBalance)}</p>
            </>
          )}
        </section>

        {revealState.activePhoto && (
          <section className="presentation-center-photo" aria-label="현재 내역 사진">
            <img src={revealState.activePhoto} alt="현재 내역 첨부 사진" />
          </section>
        )}

        <section className="presentation-manip-grid" aria-label="영상 조작 효과 선택">
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
        </section>

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
                <div className="presentation-date-row">
                  <label className="presentation-date-field">
                    해당일
                    <input
                      type="date"
                      value={targetDateISO}
                      onChange={(e) => setTargetDateISO(e.target.value || todayISO)}
                      onClick={(e) => openDatePicker(e.currentTarget)}
                      onFocus={(e) => openDatePicker(e.currentTarget)}
                    />
                  </label>
                  <button type="button" className="presentation-btn ghost presentation-today-btn" onClick={() => setTargetDateISO(todayISO)}>
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
            {!cameraReady && <button type="button" className="presentation-btn" onClick={initCamera}>카메라 권한 요청</button>}
            {error && <button type="button" className="presentation-btn ghost" onClick={reload}>데이터 재시도</button>}
          </section>
        )}
      </section>
    </main>
  );
}
