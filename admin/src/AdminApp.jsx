import { useEffect, useMemo, useState } from 'react';
import { fmtDateKRFull, fmtKRW } from './utils/format.js';
import { adminRepository } from './services/adminRepository.js';
import './styles/admin.css';

const ADMIN_PASSWORD_KEY = 'ppanzziri_admin_password';
const ADMIN_PASSWORD_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readCookieValue(key) {
  if (typeof document === 'undefined') return '';
  const encodedKey = encodeURIComponent(key);
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    if (!part.startsWith(`${encodedKey}=`)) continue;
    const raw = part.slice(encodedKey.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return '';
}

function readAdminPasswordFromStorage() {
  if (typeof window === 'undefined') return '';
  try {
    const value = window.localStorage.getItem(ADMIN_PASSWORD_KEY);
    if (value) return value;
  } catch {
    // ignore
  }
  try {
    const value = window.sessionStorage.getItem(ADMIN_PASSWORD_KEY);
    if (value) return value;
  } catch {
    // ignore
  }
  return readCookieValue(ADMIN_PASSWORD_KEY);
}

function writeAdminPasswordToStorage(value) {
  let saved = false;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ADMIN_PASSWORD_KEY, value);
      saved = true;
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.setItem(ADMIN_PASSWORD_KEY, value);
      saved = true;
    } catch {
      // ignore
    }
  }
  if (typeof document !== 'undefined') {
    try {
      document.cookie = `${encodeURIComponent(ADMIN_PASSWORD_KEY)}=${encodeURIComponent(
        value
      )}; path=/; max-age=${ADMIN_PASSWORD_COOKIE_MAX_AGE}; samesite=lax`;
      saved = true;
    } catch {
      // ignore
    }
  }
  return saved;
}

function clearAdminPasswordFromStorage() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(ADMIN_PASSWORD_KEY);
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    } catch {
      // ignore
    }
  }
  if (typeof document !== 'undefined') {
    try {
      document.cookie = `${encodeURIComponent(ADMIN_PASSWORD_KEY)}=; path=/; max-age=0; samesite=lax`;
    } catch {
      // ignore
    }
  }
}

function emptyRecordForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    type: 'expense',
    transaction_date: today,
    amount: '',
    memo: '',
    photo_url: '',
    effective_segments: [{ from: today, to: today, amount: '', percent: '' }],
    tags: [],
  };
}

function calcAmountFromPercent(total, percent) {
  const totalNum = Number(total || 0);
  const percentNum = Number(percent || 0);
  if (!totalNum || !percentNum) return '';
  return String(Math.round((totalNum * percentNum) / 100));
}

function buildTagPayload(tagsInput, totalAmount) {
  const names = tagsInput
    .map((tag) => String(tag.name || '').trim())
    .filter(Boolean);

  if (names.length === 0) {
    return [{ name: '미분류', amount: Number(totalAmount || 0) }];
  }

  const base = Math.floor(Number(totalAmount || 0) / names.length);
  let remainder = Number(totalAmount || 0) - base * names.length;

  return names.map((name) => {
    const add = remainder > 0 ? 1 : 0;
    remainder -= add;
    return { name, amount: base + add };
  });
}

function isHttpsUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isYoutubeEmbedUrl(value) {
  if (!isHttpsUrl(value)) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return host === 'www.youtube.com' && parsed.pathname.startsWith('/embed/');
  } catch {
    return false;
  }
}

function isInstagramPostUrl(value) {
  if (!isHttpsUrl(value)) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return host === 'www.instagram.com' && /^\/p\/[^/]+\/?$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isInstagramProfileUrl(value) {
  if (!isHttpsUrl(value)) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return host === 'www.instagram.com' && /^\/[^/]+\/?$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

function sanitizeExtraLinks(input) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 6)
    .map((link) => ({
      label: String(link?.label || '').trim().slice(0, 30),
      href: String(link?.href || '').trim().slice(0, 500),
    }))
    .filter((link) => link.label && link.href && isHttpsUrl(link.href));
}

function parseCreatedAt(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!match) return null;
  const [, y, m, d, hh, mm, ss = '00'] = match;
  const dt = new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    Number(ss)
  );
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default function AdminApp() {
  const [adminTab, setAdminTab] = useState('record-input');
  const [showSettings, setShowSettings] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [password, setPassword] = useState(() => readAdminPasswordFromStorage());
  const [records, setRecords] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recordSubmitError, setRecordSubmitError] = useState('');
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [isSavingCertification, setIsSavingCertification] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);

  const [recordForm, setRecordForm] = useState(emptyRecordForm);
  const [useCustomEffectiveSegments, setUseCustomEffectiveSegments] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [recordPhotoFile, setRecordPhotoFile] = useState(null);
  const [recordPhotoInputKey, setRecordPhotoInputKey] = useState(0);
  const [certForm, setCertForm] = useState({ date: new Date().toISOString().slice(0, 10) });
  const [certPhotoFile, setCertPhotoFile] = useState(null);
  const [certPhotoInputKey, setCertPhotoInputKey] = useState(0);
  const [certDeleteDate, setCertDeleteDate] = useState(new Date().toISOString().slice(0, 10));
  const [deleteDate, setDeleteDate] = useState(new Date().toISOString().slice(0, 10));
  const [socialForm, setSocialForm] = useState({
    youtube_embed_url: '',
    instagram_post_url: '',
    instagram_profile_url: 'https://www.instagram.com/ppanzziri/',
    extra_links: [],
  });
  const isSubmittingAny = isSavingRecord || isSavingCertification || isSavingSocial;

  const totalAmount = Number(recordForm.amount || 0);
  const segSum = useMemo(() => {
    if (!useCustomEffectiveSegments) return totalAmount;
    return recordForm.effective_segments.reduce((sum, seg) => sum + Number(seg.amount || 0), 0);
  }, [recordForm.effective_segments, totalAmount, useCustomEffectiveSegments]);
  const knownTagsByType = useMemo(() => {
    const byType = {
      expense: new Set(),
      income: new Set(),
    };

    (records || []).forEach((record) => {
      const type = String(record?.type || '').toLowerCase() === 'income' ? 'income' : 'expense';
      (record?.tags || []).forEach((tag) => {
        const name = String(tag?.name || '').trim();
        if (name) byType[type].add(name);
      });
    });

    (tags || []).forEach((tag) => {
      const name = String(tag?.name || '').trim();
      if (!name) return;
      const rawType = String(tag?.type || tag?.record_type || '').toLowerCase();
      if (rawType === 'income' || rawType === 'expense') {
        byType[rawType].add(name);
      }
    });

    return {
      expense: [...byType.expense].sort((a, b) => a.localeCompare(b, 'ko')),
      income: [...byType.income].sort((a, b) => a.localeCompare(b, 'ko')),
    };
  }, [records, tags]);
  const knownTagNames = useMemo(() => knownTagsByType[recordForm.type] || [], [knownTagsByType, recordForm.type]);
  const recordsForDeleteDate = useMemo(
    () =>
      records
        .filter((record) => record.transaction_date === deleteDate)
        .sort((a, b) => Number(b.id) - Number(a.id)),
    [records, deleteDate]
  );
  const certificationsForDeleteDate = useMemo(
    () =>
      certifications
        .filter((cert) => cert.date === certDeleteDate)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [certifications, certDeleteDate]
  );
  const recent24hRecords = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return (records || [])
      .filter((record) => {
        if (!record?.created_at) return false;
        const parsed = parseCreatedAt(record.created_at);
        if (!parsed) return false;
        const ts = parsed.getTime();
        return now - ts <= dayMs && now - ts >= 0;
      })
      .sort((a, b) => {
        const aTs = parseCreatedAt(a.created_at)?.getTime() || 0;
        const bTs = parseCreatedAt(b.created_at)?.getTime() || 0;
        return bTs - aTs;
      });
  }, [records]);
  const fmtRecentDateTime = (value) => {
    const dt = parseCreatedAt(value);
    if (!dt) return String(value || '-');
    return dt.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };
  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextRecords, nextTags, nextCertifications, nextSocial] = await Promise.all([
        adminRepository.getRecords(),
        adminRepository.getTags(),
        adminRepository.getCertifications(),
        adminRepository.getSocialLinks(),
      ]);
      setRecords(nextRecords);
      setTags(nextTags || []);
      setCertifications(nextCertifications || []);
      setSocialForm((prev) => ({
        ...prev,
        youtube_embed_url: String(nextSocial?.youtube_embed_url || ''),
        instagram_post_url: String(nextSocial?.instagram_post_url || ''),
        instagram_profile_url: String(nextSocial?.instagram_profile_url || prev.instagram_profile_url || ''),
        extra_links: sanitizeExtraLinks(nextSocial?.extra_links),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const savePasswordSetting = () => {
    setSettingsNotice('');
    setSettingsError('');
    try {
      const saved = writeAdminPasswordToStorage(passwordDraft);
      if (!saved) throw new Error('no-storage');
      setPassword(passwordDraft);
      setSettingsNotice('비밀번호가 저장되었습니다.');
      setShowSettings(false);
      setPasswordDraft('');
    } catch {
      setSettingsError('저장 실패 (브라우저 저장소 제한)');
    }
  };

  const clearPasswordSetting = () => {
    setSettingsNotice('');
    setSettingsError('');
    clearAdminPasswordFromStorage();
    setPassword('');
    setPasswordDraft('');
    setSettingsNotice('비밀번호가 초기화되었습니다.');
  };

  const updateSegment = (idx, key, value) => {
    setRecordForm((prev) => {
      const next = [...prev.effective_segments];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, effective_segments: next };
    });
  };

  const updateSegmentPercent = (idx, percentValue) => {
    setRecordForm((prev) => {
      const next = [...prev.effective_segments];
      next[idx] = {
        ...next[idx],
        percent: percentValue,
        amount: calcAmountFromPercent(prev.amount, percentValue),
      };
      return { ...prev, effective_segments: next };
    });
  };

  useEffect(() => {
    if (!useCustomEffectiveSegments) return;
    setRecordForm((prev) => {
      let changed = false;
      const nextSegments = prev.effective_segments.map((seg) => {
        if (!seg.percent) return seg;
        const nextAmount = calcAmountFromPercent(prev.amount, seg.percent);
        if (String(seg.amount ?? '') === String(nextAmount)) return seg;
        changed = true;
        return { ...seg, amount: nextAmount };
      });
      if (!changed) return prev;
      return { ...prev, effective_segments: nextSegments };
    });
  }, [recordForm.amount, useCustomEffectiveSegments]);

  const toggleTag = (name) => {
    if (!name) return;
    setRecordForm((prev) => {
      const selectedName = prev.tags[0]?.name || '';
      if (selectedName === name) return { ...prev, tags: [] };
      return { ...prev, tags: [{ name }] };
    });
  };

  const addCustomTag = () => {
    const nextName = String(newTagName || '').trim();
    if (!nextName) return;
    setRecordForm((prev) => ({ ...prev, tags: [{ name: nextName }] }));
    setNewTagName('');
  };

  const submitRecord = async (e) => {
    e.preventDefault();
    if (isSavingRecord) return;
    setNotice('');
    setError('');
    setRecordSubmitError('');

    if (!recordForm.transaction_date || !recordForm.amount) {
      setRecordSubmitError('거래일과 총 금액은 필수입니다.');
      return;
    }
    if (useCustomEffectiveSegments && segSum !== totalAmount) {
      setRecordSubmitError('유효 구간 금액 합이 총 금액과 일치해야 합니다.');
      return;
    }
    if (useCustomEffectiveSegments && recordForm.effective_segments.length === 0) {
      setRecordSubmitError('유효 구간을 최소 1개 이상 입력하세요.');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const effectiveSegmentsPayload = useCustomEffectiveSegments
      ? recordForm.effective_segments.map((seg) => ({
          ...seg,
          amount: Number(seg.amount),
        }))
      : [{ from: today, to: today, amount: Number(recordForm.amount) }];

    const tagPayload = buildTagPayload(recordForm.tags, recordForm.amount);

    setIsSavingRecord(true);
    try {
      await adminRepository.createRecord(
        {
          ...recordForm,
          amount: Number(recordForm.amount),
          effective_segments: effectiveSegmentsPayload,
          tags: tagPayload,
        },
        password,
        recordPhotoFile
      );
      setRecordForm((prev) => ({
        ...emptyRecordForm(),
        type: prev.type,
        transaction_date: prev.transaction_date,
        effective_segments: [{ from: prev.transaction_date, to: prev.transaction_date, amount: '', percent: '' }],
      }));
      setUseCustomEffectiveSegments(false);
      setNewTagName('');
      setRecordPhotoFile(null);
      setRecordPhotoInputKey((prev) => prev + 1);
      setNotice('기록이 저장되었습니다.');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      await loadAll();
    } catch (err) {
      setRecordSubmitError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setIsSavingRecord(false);
    }
  };

  const submitCertification = async (e) => {
    e.preventDefault();
    if (isSavingCertification) return;
    setNotice('');
    setError('');
    if (!certForm.date || !certPhotoFile) {
      setError('인증 날짜와 사진 파일은 필수입니다.');
      return;
    }

    setIsSavingCertification(true);
    try {
      await adminRepository.createCertification({ date: certForm.date, photoFile: certPhotoFile }, password);
      setNotice('인증이 저장되었습니다.');
      setCertForm({ date: new Date().toISOString().slice(0, 10) });
      setCertPhotoFile(null);
      setCertPhotoInputKey((prev) => prev + 1);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '인증 저장 실패');
    } finally {
      setIsSavingCertification(false);
    }
  };

  const removeCertificationByDate = async () => {
    setNotice('');
    setError('');
    try {
      await adminRepository.deleteCertificationByDate(certDeleteDate, password);
      setNotice('선택한 날짜의 인증이 삭제되었습니다.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '인증 삭제 실패');
    }
  };

  const removeRecord = async (id) => {
    setNotice('');
    setError('');
    try {
      await adminRepository.deleteRecord(id, password);
      setNotice('기록이 삭제되었습니다.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const submitSocialLinks = async (e) => {
    e.preventDefault();
    if (isSavingSocial) return;
    setNotice('');
    setError('');
    const youtube = String(socialForm.youtube_embed_url || '').trim();
    const instagramPost = String(socialForm.instagram_post_url || '').trim();
    const instagramProfile = String(socialForm.instagram_profile_url || '').trim();
    const extraLinks = sanitizeExtraLinks(socialForm.extra_links);

    if (youtube && !isYoutubeEmbedUrl(youtube)) {
      setError('유튜브는 https://www.youtube.com/embed/... 형식만 허용됩니다.');
      return;
    }
    if (instagramPost && !isInstagramPostUrl(instagramPost)) {
      setError('인스타 게시물은 https://www.instagram.com/p/... 형식만 허용됩니다.');
      return;
    }
    if (instagramProfile && !isInstagramProfileUrl(instagramProfile)) {
      setError('인스타 프로필은 https://www.instagram.com/... 형식만 허용됩니다.');
      return;
    }

    setIsSavingSocial(true);
    try {
      await adminRepository.updateSocialLinks(
        {
          youtube_embed_url: youtube,
          instagram_post_url: instagramPost,
          instagram_profile_url: instagramProfile,
          extra_links: extraLinks,
        },
        password
      );
      setNotice('소셜 링크가 저장되었습니다.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '소셜 저장 실패');
    } finally {
      setIsSavingSocial(false);
    }
  };

  return (
    <main className="admin-root">
      <header className="admin-header">
        <h1>Admin Input</h1>
        <button
          type="button"
          className="admin-btn ghost"
          disabled={isSubmittingAny}
          onClick={() => {
            setPasswordDraft(password);
            setSettingsNotice('');
            setSettingsError('');
            setShowSettings((prev) => !prev);
          }}
        >
          설정
        </button>
      </header>

      {showSettings && (
        <section className="admin-card admin-settings">
          <label className="admin-label" htmlFor="admin-password-setting">관리 비밀번호</label>
          <div className="admin-row two">
            <input
              id="admin-password-setting"
              type="password"
              className="admin-input"
              value={passwordDraft}
              onChange={(e) => setPasswordDraft(e.target.value)}
            />
            <div className="admin-settings-actions">
              <button type="button" className="admin-btn primary" onClick={savePasswordSetting}>저장</button>
              <button type="button" className="admin-btn danger" onClick={clearPasswordSetting}>초기화</button>
            </div>
          </div>
          {settingsError && <p className="admin-settings-message error">{settingsError}</p>}
          {settingsNotice && <p className="admin-settings-message success">{settingsNotice}</p>}
        </section>
      )}

      <nav className="admin-tabs" aria-label="어드민 탭">
        <button
          type="button"
          className={`admin-tab ${adminTab === 'record-input' ? 'active' : ''}`}
          disabled={isSubmittingAny}
          onClick={() => setAdminTab('record-input')}
        >
          기록입력
        </button>
        <button
          type="button"
          className={`admin-tab ${adminTab === 'cert-input' ? 'active' : ''}`}
          disabled={isSubmittingAny}
          onClick={() => setAdminTab('cert-input')}
        >
          인증입력
        </button>
        <button
          type="button"
          className={`admin-tab ${adminTab === 'record-delete' ? 'active' : ''}`}
          disabled={isSubmittingAny}
          onClick={() => setAdminTab('record-delete')}
        >
          기록삭제
        </button>
        <button
          type="button"
          className={`admin-tab ${adminTab === 'social-input' ? 'active' : ''}`}
          disabled={isSubmittingAny}
          onClick={() => setAdminTab('social-input')}
        >
          소셜입력
        </button>
      </nav>

      {error && <section className="admin-card admin-error">{error}</section>}
      {notice && <section className="admin-card admin-notice">{notice}</section>}

      {adminTab === 'record-input' && (
        <section className="admin-grid admin-tab-panel">
          <article className="admin-card">
          <div className="admin-title-row">
            <h2>기록 입력</h2>
            <button
              type="button"
              className="admin-btn ghost admin-btn-sm"
              onClick={() => setShowRecentModal(true)}
              disabled={isSavingRecord}
            >
              최근
            </button>
          </div>
          <form className="admin-form" onSubmit={submitRecord}>
            <fieldset className="admin-fieldset" disabled={isSavingRecord}>
            <div className="admin-row two">
              <label>
                거래일
                <input
                  className="admin-input"
                  type="date"
                  value={recordForm.transaction_date}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, transaction_date: e.target.value }))}
                />
              </label>
            </div>

            <div className="admin-row two">
              <label>
                총 금액
                <input
                  className="admin-input admin-input-prominent"
                  type="number"
                  min="0"
                  value={recordForm.amount}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </label>
              <label>
                메모
                <input
                  className="admin-input admin-input-prominent"
                  type="text"
                  value={recordForm.memo}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, memo: e.target.value }))}
                />
              </label>
            </div>

            <label>
              사진 (선택)
              <input
                key={recordPhotoInputKey}
                className="admin-input"
                type="file"
                accept="image/*"
                onChange={(e) => setRecordPhotoFile(e.target.files?.[0] || null)}
              />
            </label>

            <section className="admin-section">
              <h3>유효 구간</h3>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={useCustomEffectiveSegments}
                  onChange={(e) => setUseCustomEffectiveSegments(e.target.checked)}
                />
                유효 구간 직접 입력
              </label>

              {useCustomEffectiveSegments && (
                <>
                  {recordForm.effective_segments.map((seg, idx) => (
                    <div className="admin-row four" key={`seg-${idx}`}>
                      <input className="admin-input" type="date" value={seg.from} onChange={(e) => updateSegment(idx, 'from', e.target.value)} />
                      <input className="admin-input" type="date" value={seg.to} onChange={(e) => updateSegment(idx, 'to', e.target.value)} />
                      <input className="admin-input" type="number" min="0" value={seg.amount} onChange={(e) => updateSegment(idx, 'amount', e.target.value)} placeholder="금액" />
                      <select className="admin-input" value={seg.percent || ''} onChange={(e) => updateSegmentPercent(idx, e.target.value)}>
                        <option value="">직접입력</option>
                        {Array.from({ length: 10 }, (_, i) => (i + 1) * 10).map((pct) => (
                          <option key={pct} value={pct}>{pct}%</option>
                        ))}
                      </select>
                      <button type="button" className="admin-btn ghost" onClick={() => setRecordForm((prev) => ({
                        ...prev,
                        effective_segments: prev.effective_segments.filter((_, i) => i !== idx),
                      }))}>삭제</button>
                    </div>
                  ))}
                  <button type="button" className="admin-btn ghost" onClick={() => setRecordForm((prev) => ({
                    ...prev,
                    effective_segments: [...prev.effective_segments, { from: prev.transaction_date, to: prev.transaction_date, amount: '', percent: '' }],
                  }))}>유효 구간 추가</button>
                </>
              )}
            </section>

            <section className="admin-section">
              <h3>태그</h3>
              {knownTagNames.length > 0 && (
                <div className="tag-options">
                  {knownTagNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={`tag-option ${recordForm.tags.some((tag) => tag.name === name) ? 'active' : ''}`}
                      onClick={() => toggleTag(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              <div className="admin-row tag-add">
                <input
                  className="admin-input"
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="새 태그 입력"
                />
                <button type="button" className="admin-btn ghost" onClick={addCustomTag}>태그 추가</button>
              </div>

              {recordForm.tags.filter((tag) => tag.name).length > 0 && (
                <div className="selected-tags">
                  {recordForm.tags
                    .filter((tag) => tag.name)
                    .map((tag) => (
                    <button
                      type="button"
                      className="selected-tag"
                      key={tag.name}
                      onClick={() => toggleTag(tag.name)}
                      title="선택 해제"
                    >
                      {tag.name} ✕
                    </button>
                    ))}
                </div>
              )}
            </section>

            <button type="submit" className="admin-btn primary">
              {isSavingRecord ? '기록 저장 중...' : '기록 저장'}
            </button>
            {recordSubmitError && <p className="admin-inline-error">{recordSubmitError}</p>}
            </fieldset>
          </form>
          </article>
        </section>
      )}

      {adminTab === 'cert-input' && (
        <section className="admin-grid admin-tab-panel">
          <article className="admin-card">
            <h2>인증 업로드</h2>
            <form className="admin-form" onSubmit={submitCertification}>
              <fieldset className="admin-fieldset" disabled={isSavingCertification}>
              <label>
                인증 날짜
                <input
                  className="admin-input"
                  type="date"
                  value={certForm.date}
                  onChange={(e) => setCertForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </label>
              <label>
                인증 사진 파일
                <input
                  key={certPhotoInputKey}
                  className="admin-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCertPhotoFile(e.target.files?.[0] || null)}
                />
              </label>
              <button type="submit" className="admin-btn primary">
                {isSavingCertification ? '인증 저장 중...' : '인증 저장'}
              </button>
              </fieldset>
            </form>
          </article>

          <article className="admin-card">
            <h2>인증 삭제</h2>
            <div className="admin-row two">
              <label>
                날짜 선택
                <input
                  className="admin-input"
                  type="date"
                  value={certDeleteDate}
                  onChange={(e) => setCertDeleteDate(e.target.value)}
                />
              </label>
              <div className="admin-settings-actions">
                <button type="button" className="admin-btn danger" onClick={removeCertificationByDate}>
                  선택 날짜 인증 삭제
                </button>
              </div>
            </div>
            <div className="admin-record-list">
              {certificationsForDeleteDate.length === 0 && <p>선택한 날짜의 인증이 없습니다.</p>}
              {certificationsForDeleteDate.map((cert, idx) => (
                <div key={`${cert.date}-${idx}`} className="admin-record-item">
                  <div className="admin-record-main">
                    <strong className="admin-record-date">{fmtDateKRFull(cert.date)}</strong>
                    <div className="admin-record-meta">{cert.photo_url || '이미지 경로 없음'}</div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {adminTab === 'record-delete' && (
        <section className="admin-card admin-tab-panel">
        <h2>기록 목록</h2>
        <div className="admin-row two">
          <label>
            날짜 선택
            <input
              className="admin-input"
              type="date"
              value={deleteDate}
              onChange={(e) => setDeleteDate(e.target.value)}
            />
          </label>
        </div>
        {loading && <p>목록 로딩 중...</p>}
        {!loading && records.length === 0 && <p>기록이 없습니다.</p>}
        {!loading && records.length > 0 && recordsForDeleteDate.length === 0 && <p>선택한 날짜의 기록이 없습니다.</p>}
        {!loading && recordsForDeleteDate.length > 0 && (
          <div className="admin-record-list record-delete-list">
            {recordsForDeleteDate.map((record) => (
              <div key={record.id} className="admin-record-item">
                <div className="admin-record-main">
                  <strong className="admin-record-date">{fmtDateKRFull(record.transaction_date)}</strong>
                  <div className="admin-record-meta-row">
                    <div className="admin-record-meta">
                      {record.type === 'expense' ? '지출' : '수입'} · {fmtKRW(record.amount)} · {record.memo || '메모 없음'}
                    </div>
                    {(record.tags || []).length > 0 && (
                      <div className="admin-record-tags inline">
                        {(record.tags || []).map((tag, idx) => (
                          <span key={`${record.id}-tag-${idx}`} className="admin-record-tag">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {record.photo_url && (
                    <a
                      className="admin-record-thumb-link"
                      href={record.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="첨부 사진 보기"
                    >
                      <img className="admin-record-thumb" src={record.photo_url} alt="기록 첨부 사진" />
                    </a>
                  )}
                </div>
                <button type="button" className="admin-btn danger admin-record-delete-btn" onClick={() => removeRecord(record.id)}>삭제</button>
              </div>
            ))}
          </div>
        )}
        </section>
      )}

      {adminTab === 'social-input' && (
        <section className="admin-grid admin-tab-panel">
          <article className="admin-card">
            <h2>소셜 링크 입력</h2>
            <form className="admin-form" onSubmit={submitSocialLinks}>
              <fieldset className="admin-fieldset" disabled={isSavingSocial}>
              <label>
                유튜브 임베드 URL
                <input
                  className="admin-input"
                  type="text"
                  value={socialForm.youtube_embed_url}
                  onChange={(e) => setSocialForm((prev) => ({ ...prev, youtube_embed_url: e.target.value }))}
                  placeholder="https://www.youtube.com/embed/..."
                />
              </label>
              <label>
                인스타 게시물 URL
                <input
                  className="admin-input"
                  type="text"
                  value={socialForm.instagram_post_url}
                  onChange={(e) => setSocialForm((prev) => ({ ...prev, instagram_post_url: e.target.value }))}
                  placeholder="https://www.instagram.com/p/..."
                />
              </label>
              <label>
                인스타 프로필 URL
                <input
                  className="admin-input"
                  type="text"
                  value={socialForm.instagram_profile_url}
                  onChange={(e) => setSocialForm((prev) => ({ ...prev, instagram_profile_url: e.target.value }))}
                  placeholder="https://www.instagram.com/ppanzziri/"
                />
              </label>
              <button type="submit" className="admin-btn primary">
                {isSavingSocial ? '소셜 저장 중...' : '소셜 저장'}
              </button>
              </fieldset>
            </form>
          </article>
        </section>
      )}

      {showRecentModal && (
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-label="최근 24시간 입력 내역"
          onClick={() => setShowRecentModal(false)}
        >
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-title-row">
              <h2>최근 24시간 입력 내역</h2>
              <button type="button" className="admin-btn ghost admin-btn-sm" onClick={() => setShowRecentModal(false)}>닫기</button>
            </div>
            <div className="admin-record-list">
              {recent24hRecords.length === 0 && <p>최근 24시간 내 입력 내역이 없습니다.</p>}
              {recent24hRecords.map((record) => (
                <div key={`recent-${record.id}`} className="admin-record-item">
                  <div className="admin-record-main">
                    <strong className="admin-record-date">{fmtDateKRFull(record.transaction_date)}</strong>
                    <div className="admin-record-meta">
                      입력 {fmtRecentDateTime(record.created_at)} · {record.type === 'expense' ? '지출' : '수입'} · {fmtKRW(record.amount)}
                    </div>
                    <div className="admin-record-meta">{record.memo || '-'}</div>
                    {(record.tags || []).length > 0 && (
                      <div className="admin-record-tags inline">
                        {(record.tags || []).map((tag, idx) => (
                          <span key={`recent-tag-${record.id}-${idx}`} className="admin-record-tag">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
