'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { apiGet, apiPost } from '@/lib/api';
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
}

// Bulk CSV import: the file is read client-side (FileReader) and its text is
// POSTed — no multipart handling anywhere. Excel users export as CSV first.
export function ImportQuestions({ onImported }: ImportQuestionsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');

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
    apiGet<ClassSummary[]>('/api/v1/classes')
      .then(setClasses)
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setTopics([]);
      return;
    }
    apiGet<TopicInfo[]>(`/api/v1/topics?classId=${selectedClassId}`)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [selectedClassId]);

  function handleFile(file: File | undefined) {
    setResult(null);
    setError('');
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.onerror = () => setError('Could not read the file.');
    reader.readAsText(file);
  }

  async function handleImport() {
    setError('');
    setResult(null);
    if (!csvText.trim()) {
      setError('Choose a CSV file first.');
      return;
    }
    if (!selectedTopicId && !topicLabel.trim()) {
      setError('Pick a class topic or enter a topic label.');
      return;
    }

    setImporting(true);
    try {
      const imported = await apiPost<ImportResult>('/api/v1/exercises/import', {
        csv: csvText,
        topicId: selectedTopicId || undefined,
        topic: selectedTopicId ? undefined : topicLabel.trim(),
        difficulty,
      });
      setResult(imported);
      if (imported.created > 0) {
        setCsvText('');
        setFileName('');
        if (fileRef.current) fileRef.current.value = '';
        onImported();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300">
          CSV file
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="input-base cursor-pointer file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-300"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Columns: question, optionA, optionB, optionC, optionD, correctAnswer
          (letter or text). Optional: difficulty, tags (";"-separated). Using
          Excel? Save as CSV first.
        </p>
        {fileName && <p className="mt-1 text-xs text-indigo-300">📄 {fileName}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Class <span className="text-slate-500">(optional)</span>
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedTopicId('');
            }}
            className="input-base"
          >
            <option value="">No class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Class topic
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
                  ? 'No topics in class'
                  : 'Select a topic'
                : 'Pick a class first'}
            </option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Default difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="input-base"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {!selectedTopicId && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Topic label
          </label>
          <input
            type="text"
            value={topicLabel}
            onChange={(e) => setTopicLabel(e.target.value)}
            placeholder="e.g. algebra"
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
            ✅ Created <span className="font-bold text-green-300">{result.created}</span>
            {' · '}❌ Skipped{' '}
            <span className="font-bold text-red-300">{result.failed}</span>
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              {result.errors.slice(0, 6).map((message) => (
                <li key={message}>{message}</li>
              ))}
              {result.errors.length > 6 && (
                <li>…and {result.errors.length - 6} more.</li>
              )}
            </ul>
          )}
        </motion.div>
      )}

      <Button onClick={handleImport} disabled={importing}>
        {importing ? 'Importing…' : 'Import questions'}
      </Button>
    </div>
  );
}
