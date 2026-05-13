import { useEffect, useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import html2canvas from 'html2canvas';

const MAP_TILE = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
const MAP_SIZE = { w: 720, h: 300 };
const VIDEO_W = 720;
const ZOOM = 15;

function tileUrl(x, y, z) {
  return MAP_TILE.replace('{z}', z).replace('{x}', x).replace('{y}', y);
}

function latLonToTile(lat, lon, zoom) {
  const n = 2 ** zoom;
  const xTile = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yTile = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { xTile, yTile };
}

async function renderMapImage(lat, lon) {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_SIZE.w;
  canvas.height = MAP_SIZE.h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(0, 0, MAP_SIZE.w, MAP_SIZE.h);

  const { xTile, yTile } = latLonToTile(lat, lon, ZOOM);
  const centerTileX = Math.floor(xTile);
  const centerTileY = Math.floor(yTile);
  const offsetX = (xTile - centerTileX) * 256;
  const offsetY = (yTile - centerTileY) * 256;

  const tilesX = Math.ceil(MAP_SIZE.w / 256) + 2;
  const tilesY = Math.ceil(MAP_SIZE.h / 256) + 2;
  const startTX = centerTileX - Math.floor(tilesX / 2);
  const startTY = centerTileY - Math.floor(tilesY / 2);

  const promises = [];
  for (let dy = 0; dy < tilesY; dy++) {
    for (let dx = 0; dx < tilesX; dx++) {
      const tx = startTX + dx;
      const ty = startTY + dy;
      const px = Math.round(MAP_SIZE.w / 2 - offsetX + (tx - centerTileX) * 256);
      const py = Math.round(MAP_SIZE.h / 2 - offsetY + (ty - centerTileY) * 256);
      promises.push(
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => { ctx.drawImage(img, px, py, 256, 256); resolve(); };
          img.onerror = () => resolve();
          img.src = tileUrl(tx, ty, ZOOM);
        }),
      );
    }
  }
  await Promise.all(promises);

  // pin
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.fillText('📍', MAP_SIZE.w / 2, MAP_SIZE.h / 2 + 8);

  return canvas;
}

function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

function parseMinutes(s, e) {
  if (!s || !e) return 0;
  const [sh, sm] = s.split(':').map(Number);
  const [eh, em] = e.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

function OverlayPreview({ record }) {
  const mins = parseMinutes(record.start_time || record.startTime, record.end_time || record.endTime);
  const chars = Number(record.char_count || record.charCount || 0);
  const place = record.place_name || record.placeName || '';
  const startTime = record.start_time || record.startTime || '';
  const endTime = record.end_time || record.endTime || '';
  const topics = record.topics || [];
  const date = record.date || '';

  return (
    <div
      className="video-export-overlay-preview"
      style={{
        position: 'absolute', bottom: 0, left: 0,
        padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: '2px',
        fontSize: '14px', fontWeight: 600, color: '#fff',
        textShadow: '-1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8)',
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: '16px', fontWeight: 800 }}>{fmtDateShort(date)}</span>
      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
        {[place, startTime ? `${startTime}~${endTime}` : ''].filter(Boolean).join(', ')}
      </span>
      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
        {[mins > 0 ? `${mins}분` : '', chars > 0 ? `${chars.toLocaleString('ko-KR')}자` : ''].filter(Boolean).join(', ')}
      </span>
      {topics.length > 0 && (
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginTop: '2px' }}>
          {topics.join(', ')}
        </span>
      )}
    </div>
  );
}

export default function WritingVideoExport({ record, videoFile, onClose }) {
  const [status, setStatus] = useState('preparing'); // preparing | rendering | done | error
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const ffmpegRef = useRef(null);
  const abortedRef = useRef(false);

  const doExport = useCallback(async () => {
    try {
      abortedRef.current = false;
      setStatus('preparing');
      setProgress(0);

      // 1) Render map image if coordinates exist
      const lat = record.latitude ?? record.lat ?? null;
      const lon = record.longitude ?? record.lon ?? null;
      let mapPngData = null;
      if (lat != null && lon != null) {
        setProgress(5);
        const mapCanvas = await renderMapImage(lat, lon);
        const blob = await new Promise((r) => mapCanvas.toBlob(r, 'image/png'));
        mapPngData = new Uint8Array(await blob.arrayBuffer());
      }
      if (abortedRef.current) return;

      // 2) Render overlay as image
      setProgress(10);
      const overlayEl = document.getElementById('video-export-overlay');
      let overlayPngData = null;
      if (overlayEl) {
        const overlayCanvas = await html2canvas(overlayEl, {
          backgroundColor: null,
          scale: 2,
        });
        const blob = await new Promise((r) => overlayCanvas.toBlob(r, 'image/png'));
        overlayPngData = new Uint8Array(await blob.arrayBuffer());
      }
      if (abortedRef.current) return;

      // 3) Load FFmpeg
      setProgress(15);
      setStatus('rendering');
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on('progress', ({ progress: p }) => {
        if (abortedRef.current) return;
        setProgress(Math.round(20 + p * 75));
      });

      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      });
      if (abortedRef.current) return;

      // 4) Write files to FFmpeg FS
      const videoData = await fetchFile(videoFile);
      await ffmpeg.writeFile('input.mp4', videoData);

      if (mapPngData) await ffmpeg.writeFile('map.png', mapPngData);
      if (overlayPngData) await ffmpeg.writeFile('overlay.png', overlayPngData);

      // 5) Build filter complex
      const filters = [];
      const inputs = ['-i', 'input.mp4'];
      let inputIdx = 1;

      if (mapPngData) {
        inputs.push('-i', 'map.png');
        inputIdx++;
      }
      if (overlayPngData) {
        inputs.push('-i', 'overlay.png');
        inputIdx++;
      }

      // Scale video to VIDEO_W, keep aspect
      let currentStream = '[0:v]';
      let filterStr = `${currentStream}scale=${VIDEO_W}:-2[vscaled];`;
      currentStream = '[vscaled]';

      if (mapPngData) {
        // Scale map
        filterStr += `[1:v]scale=${VIDEO_W}:${MAP_SIZE.h}[mscaled];`;
        // Stack map on top of video
        filterStr += `[mscaled]${currentStream}vstack=inputs=2[vstacked];`;
        currentStream = '[vstacked]';
      }

      if (overlayPngData) {
        const overlayIdx = mapPngData ? 2 : 1;
        // Scale overlay to video width
        filterStr += `[${overlayIdx}:v]scale=${VIDEO_W}:-2[oscaled];`;
        // Calculate y position: if map exists, overlay goes on bottom part (video area)
        const yPos = mapPngData ? `H-overlay_h` : `H-overlay_h`;
        filterStr += `${currentStream}[oscaled]overlay=0:${yPos}[out]`;
      } else {
        // No overlay, just rename
        filterStr = filterStr.slice(0, -1); // remove trailing ;
        filterStr = filterStr.replace(/\[vscaled\]$|;\[vstacked\]$/, '')
          ? filterStr + '' : filterStr;
        const lastTag = mapPngData ? '[vstacked]' : '[vscaled]';
        // rename last to [out]
        filterStr = filterStr.replace(lastTag + ';', lastTag.replace(']', 'x]') + ';');
        filterStr += `${currentStream}null[out]`;
      }

      // 6) Run FFmpeg
      await ffmpeg.exec([
        ...inputs,
        '-filter_complex', filterStr,
        '-map', '[out]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        '-y', 'output.mp4',
      ]);
      if (abortedRef.current) return;

      // 7) Read output
      const output = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([output.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setProgress(100);
      setStatus('done');
    } catch (err) {
      if (!abortedRef.current) {
        console.error('Video export error:', err);
        setStatus('error');
      }
    }
  }, [record, videoFile]);

  useEffect(() => {
    doExport();
    return () => {
      abortedRef.current = true;
    };
  }, [doExport]);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `writing-${record.date || 'export'}.mp4`;
    a.click();
  };

  const handleClose = () => {
    abortedRef.current = true;
    onClose();
  };

  return (
    <div className="video-export-modal-backdrop" onClick={handleClose}>
      <div className="video-export-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="video-export-title">글쓰기 영상 내보내기</h3>

        {/* Hidden overlay for html2canvas capture */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div id="video-export-overlay" style={{ width: VIDEO_W, background: 'transparent' }}>
            <OverlayPreview record={record} />
          </div>
        </div>

        {status === 'preparing' && (
          <div className="video-export-status">
            <p>준비 중... {progress}%</p>
            <div className="video-export-progress">
              <div className="video-export-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {status === 'rendering' && (
          <div className="video-export-status">
            <p>영상 합성 중... {progress}%</p>
            <div className="video-export-progress">
              <div className="video-export-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {status === 'done' && (
          <div className="video-export-status">
            <p>완료!</p>
            {downloadUrl && (
              <video
                src={downloadUrl}
                controls
                autoPlay
                muted
                playsInline
                className="video-export-preview"
              />
            )}
            <button type="button" className="video-export-download-btn" onClick={handleDownload}>
              다운로드
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="video-export-status">
            <p className="admin-error">영상 합성 중 오류가 발생했습니다.</p>
            <button type="button" className="video-export-download-btn" onClick={() => doExport()}>
              다시 시도
            </button>
          </div>
        )}

        <button type="button" className="video-export-close-btn" onClick={handleClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
