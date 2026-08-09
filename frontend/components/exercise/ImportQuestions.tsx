'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { apiGet, apiPost, apiUpload } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { popIn } from '@/lib/animations';
import type { ClassSummary, TopicInfo, Difficulty } from '@/lib/types';

interface ImportResult {
  created: number;
  failed: number;
  errors: string[];
}

interface ImportQuestionsProps {
  onImported: () => void;
  // When both are set, the class/topic picker is skipped and every imported
  // row links straight to this topic (mirrors ExerciseForm's lock props) —
  // used to embed this inline under an already-selected class topic.
  lockedClassId?: string;
  lockedTopicId?: string;
}

// Bulk import: .csv is read client-side (FileReader) and its text is POSTed
// as JSON. .xlsx is sent as-is (multipart) and parsed server-side — an xlsx
// binary can't be meaningfully read as text client-side.
export function ImportQuestions({
  onImported,
  lockedClassId,
  lockedTopicId,
}: ImportQuestionsProps) {
  const isLocked = Boolean(lockedClassId && lockedTopicId);

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [topicLabel, setTopicLabel] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (isLocked) return;
    apiGet<ClassSummary[]>('/api/v1/classes')
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [isLocked]);

  useEffect(() => {
    if (isLocked || !selectedClassId) {
      setTopics([]);
      return;
    }
    apiGet<TopicInfo[]>(`/api/v1/topics?classId=${selectedClassId}`)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [isLocked, selectedClassId]);

  function handleFile(file: File | undefined) {
    setResult(null);
    setError('');
    setCsvText('');
    setExcelFile(null);
    if (!file) return;
    setFileName(file.name);

    if (/\.xlsx$/i.test(file.name)) {
      setExcelFile(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.onerror = () => setError('Không thể đọc tệp này.');
    reader.readAsText(file);
  }

  async function handleImport() {
    setError('');
    setResult(null);
    if (!csvText.trim() && !excelFile) {
      setError('Hãy chọn một tệp CSV hoặc Excel (.xlsx) trước.');
      return;
    }
    if (!isLocked && !selectedTopicId && !topicLabel.trim()) {
      setError('Hãy chọn chủ đề của lớp hoặc nhập nhãn chủ đề.');
      return;
    }

    const topicId = isLocked ? lockedTopicId : selectedTopicId || undefined;
    const topic = isLocked || selectedTopicId ? undefined : topicLabel.trim();

    setImporting(true);
    try {
      const imported = excelFile
        ? await (() => {
            const form = new FormData();
            form.append('file', excelFile);
            if (topicId) form.append('topicId', topicId);
            if (topic) form.append('topic', topic);
            form.append('difficulty', difficulty);
            return apiUpload<ImportResult>('/api/v1/exercises/import-excel', form);
          })()
        : await apiPost<ImportResult>('/api/v1/exercises/import', {
            csv: csvText,
            topicId,
            topic,
            difficulty,
          });
      setResult(imported);
      if (imported.created > 0) {
        setCsvText('');
        setExcelFile(null);
        setFileName('');
        if (fileRef.current) fileRef.current.value = '';
        onImported();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nhập dữ liệu thất bại.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          Tệp CSV hoặc Excel (.xlsx)
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="input-base cursor-pointer file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-300"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Các cột: question, optionA, optionB, optionC, optionD, correctAnswer
          (chữ cái hoặc nội dung). Tùy chọn: difficulty, tags (phân tách bằng
          ";"). File Excel cũ (.xls) hãy lưu lại thành .xlsx trước.
        </p>
        {fileName && <p className="mt-1 text-xs text-indigo-300">📄 {fileName}</p>}
      </div>

      <div
        className={`grid grid-cols-1 gap-4 ${isLocked ? 'sm:max-w-xs' : 'sm:grid-cols-3'}`}
      >
        {!isLocked && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Lớp <span className="text-slate-500">(tùy chọn)</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedTopicId('');
                }}
                className="input-base"
              >
                <option value="">Không có lớp</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Chủ đề của lớp
              </label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                disabled={!selectedClassId || topics.length === 0}
                className="input-base"
              >
                <option value="">
                  {selectedClassId
                    ? topics.length === 0
                      ? 'Lớp chưa có chủ đề nào'
                      : 'Chọn một chủ đề'
                    : 'Chọn lớp trước'}
                </option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Độ khó mặc định
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="input-base"
          >
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </select>
        </div>
      </div>

      {!isLocked && !selectedTopicId && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Nhãn chủ đề
          </label>
          <input
            type="text"
            value={topicLabel}
            onChange={(e) => setTopicLabel(e.target.value)}
            placeholder="ví dụ: đại số"
            className="input-base"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <motion.div
          variants={popIn}
          initial="hidden"
          animate="show"
          className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm"
        >
          <p className="text-slate-200">
            ✅ Đã tạo <span className="font-bold text-green-300">{result.created}</span>
            {' · '}❌ Đã bỏ qua{' '}
            <span className="font-bold text-red-300">{result.failed}</span>
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {result.errors.slice(0, 6).map((message) => (
                <li key={message}>{message}</li>
              ))}
              {result.errors.length > 6 && (
                <li>…và {result.errors.length - 6} lỗi khác.</li>
              )}
            </ul>
          )}
        </motion.div>
      )}

      <Button onClick={handleImport} disabled={importing}>
        {importing ? 'Đang nhập…' : 'Nhập câu hỏi'}
      </Button>
    </div>
  );
}
