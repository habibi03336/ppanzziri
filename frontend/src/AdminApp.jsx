import { useEffect, useMemo, useState } from 'react';
import { fmtDateKRFull, fmtKRW } from './utils/format.js';
import { adminRepository } from './services/adminRepository.js';
import './styles/admin.css';

const ADMIN_PASSWORD_KEY = 'ppanzziri_admin_password';

function emptyRecordForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    type: 'expense',
    transaction_date: today,
    amount: '',
    memo: '',
    photo_url: '',
    effective_segments: [{ from: today, to: today, amount: '' }],
    tags: [],
  };
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

export default function AdminApp() {
  const [adminTab, setAdminTab] = useState('record-input');
  const [showSettings, setShowSettings] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [password, setPassword] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_PASSWORD_KEY) || '';
    } catch {
      return '';
    }
  });
  const [records, setRecords] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [recordForm, setRecordForm] = useState(emptyRecordForm);
  const [useCustomEffectiveSegments, setUseCustomEffectiveSegments] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [recordPhotoFile, setRecordPhotoFile] = useState(null);
  const [certForm, setCertForm] = useState({ date: new Date().toISOString().slice(0, 10) });
  const [certPhotoFile, setCertPhotoFile] = useState(null);
  const [certDeleteDate, setCertDeleteDate] = useState(new Date().toISOString().slice(0, 10));
  const [deleteDate, setDeleteDate] = useState(new Date().toISOString().slice(0, 10));

  const totalAmount = Number(recordForm.amount || 0);
  const segSum = useMemo(() => {
    if (!useCustomEffectiveSegments) return totalAmount;
    return recordForm.effective_segments.reduce((sum, seg) => sum + Number(seg.amount || 0), 0);
  }, [recordForm.effective_segments, totalAmount, useCustomEffectiveSegments]);
  const knownTagNames = useMemo(
    () => [...new Set((tags || []).map((tag) => tag.name).filter(Boolean))],
    [tags]
  );
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
  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextRecords, nextTags, nextCertifications] = await Promise.all([
        adminRepository.getRecords(),
        adminRepository.getTags(),
        adminRepository.getCertifications(),
      ]);
      setRecords(nextRecords);
      setTags(nextTags || []);
      setCertifications(nextCertifications || []);
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
      localStorage.setItem(ADMIN_PASSWORD_KEY, passwordDraft);
      setPassword(passwordDraft);
      setSettingsNotice('비밀번호가 저장되었습니다.');
      setShowSettings(false);
      setPasswordDraft('');
    } catch {
      setSettingsError('저장 실패');
    }
  };

  const clearPasswordSetting = () => {
    setSettingsNotice('');
    setSettingsError('');
    try {
      localStorage.removeItem(ADMIN_PASSWORD_KEY);
    } catch {
      // ignore
    }
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

  const toggleTag = (name) => {
    if (!name) return;
    setRecordForm((prev) => {
      const exists = prev.tags.some((tag) => tag.name === name);
      if (exists) return { ...prev, tags: prev.tags.filter((tag) => tag.name !== name) };
      return { ...prev, tags: [...prev.tags, { name }] };
    });
  };

  const addCustomTag = () => {
    const nextName = String(newTagName || '').trim();
    if (!nextName) return;
    setRecordForm((prev) => {
      if (prev.tags.some((tag) => tag.name === nextName)) return prev;
      return { ...prev, tags: [...prev.tags, { name: nextName }] };
    });
    setNewTagName('');
  };

  const submitRecord = async (e) => {
    e.preventDefault();
    setNotice('');
    setError('');

    if (!recordForm.transaction_date || !recordForm.amount) {
      setError('거래일과 총 금액은 필수입니다.');
      return;
    }
    if (useCustomEffectiveSegments && segSum !== totalAmount) {
      setError('유효 구간 금액 합이 총 금액과 일치해야 합니다.');
      return;
    }
    if (useCustomEffectiveSegments && recordForm.effective_segments.length === 0) {
      setError('유효 구간을 최소 1개 이상 입력하세요.');
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
      setRecordForm(emptyRecordForm());
      setUseCustomEffectiveSegments(false);
      setNewTagName('');
      setRecordPhotoFile(null);
      setNotice('기록이 저장되었습니다.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    }
  };

  const submitCertification = async (e) => {
    e.preventDefault();
    setNotice('');
    setError('');
    if (!certForm.date || !certPhotoFile) {
      setError('인증 날짜와 사진 파일은 필수입니다.');
      return;
    }

    try {
      await adminRepository.createCertification({ date: certForm.date, photoFile: certPhotoFile }, password);
      setNotice('인증이 저장되었습니다.');
      setCertForm({ date: new Date().toISOString().slice(0, 10) });
      setCertPhotoFile(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '인증 저장 실패');
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

  return (
    <main className="admin-root">
      <header className="admin-header">
        <h1>Admin Input</h1>
        <button
          type="button"
          className="admin-btn ghost"
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
          onClick={() => setAdminTab('record-input')}
        >
          기록입력
        </button>
        <button
          type="button"
          className={`admin-tab ${adminTab === 'cert-input' ? 'active' : ''}`}
          onClick={() => setAdminTab('cert-input')}
        >
          인증입력
        </button>
        <button
          type="button"
          className={`admin-tab ${adminTab === 'record-delete' ? 'active' : ''}`}
          onClick={() => setAdminTab('record-delete')}
        >
          기록삭제
        </button>
      </nav>

      {error && <section className="admin-card admin-error">{error}</section>}
      {notice && <section className="admin-card admin-notice">{notice}</section>}

      {adminTab === 'record-input' && (
        <section className="admin-grid admin-tab-panel">
          <article className="admin-card">
          <h2>기록 입력</h2>
          <form className="admin-form" onSubmit={submitRecord}>
            <div className="admin-row two">
              <label>
                유형
                <select
                  className="admin-input"
                  value={recordForm.type}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  <option value="expense">지출</option>
                  <option value="income">수입</option>
                </select>
              </label>
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
                  className="admin-input"
                  type="number"
                  min="0"
                  value={recordForm.amount}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </label>
              <label>
                메모
                <input
                  className="admin-input"
                  type="text"
                  value={recordForm.memo}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, memo: e.target.value }))}
                />
              </label>
            </div>

            <label>
              사진 (선택)
              <input
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
                    <div className="admin-row three" key={`seg-${idx}`}>
                      <input className="admin-input" type="date" value={seg.from} onChange={(e) => updateSegment(idx, 'from', e.target.value)} />
                      <input className="admin-input" type="date" value={seg.to} onChange={(e) => updateSegment(idx, 'to', e.target.value)} />
                      <input className="admin-input" type="number" min="0" value={seg.amount} onChange={(e) => updateSegment(idx, 'amount', e.target.value)} placeholder="금액" />
                      <button type="button" className="admin-btn ghost" onClick={() => setRecordForm((prev) => ({
                        ...prev,
                        effective_segments: prev.effective_segments.filter((_, i) => i !== idx),
                      }))}>삭제</button>
                    </div>
                  ))}
                  <button type="button" className="admin-btn ghost" onClick={() => setRecordForm((prev) => ({
                    ...prev,
                    effective_segments: [...prev.effective_segments, { from: prev.transaction_date, to: prev.transaction_date, amount: '' }],
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

            <button type="submit" className="admin-btn primary">기록 저장</button>
          </form>
          </article>
        </section>
      )}

      {adminTab === 'cert-input' && (
        <section className="admin-grid admin-tab-panel">
          <article className="admin-card">
            <h2>인증 업로드</h2>
            <form className="admin-form" onSubmit={submitCertification}>
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
                  className="admin-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCertPhotoFile(e.target.files?.[0] || null)}
                />
              </label>
              <button type="submit" className="admin-btn primary">인증 저장</button>
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
          <div className="admin-record-list">
            {recordsForDeleteDate.map((record) => (
              <div key={record.id} className="admin-record-item">
                <div className="admin-record-main">
                  <strong className="admin-record-date">{fmtDateKRFull(record.transaction_date)}</strong>
                  <div className="admin-record-meta">
                    {record.type === 'expense' ? '지출' : '수입'} · {fmtKRW(record.amount)} · {record.memo || '메모 없음'}
                  </div>
                </div>
                <button type="button" className="admin-btn danger" onClick={() => removeRecord(record.id)}>삭제</button>
              </div>
            ))}
          </div>
        )}
        </section>
      )}
    </main>
  );
}
