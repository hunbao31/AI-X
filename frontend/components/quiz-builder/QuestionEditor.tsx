'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { apiPatch, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import { fadeSlideUp } from '@/lib/animations';
import type { SetItem, Exercise, Difficulty } from '@/lib/types';

const LETTERS = ['A', 'B', 'C', 'D'];

interface QuestionEditorProps {
  item: SetItem;
  index: number;
  onDeleted: (exerciseId: string) => void;
  onSaved: (exerciseId: string, exercise: Exercise) => void;
  draggable: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

// A single editable question block — question text, 4 answer slots (only
// A/B required), a correct-answer radio, difficulty, delete. Owns its own
// save/delete calls directly against the question's Exercise row, so each
// block behaves as an independent mini-form (matches the "each question
// block" framing from the spec).
export function QuestionEditor({
  item,
  index,
  onDeleted,
  onSaved,
  draggable,
  isDragOver,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: QuestionEditorProps) {
  const ex = item.exercise;
  const isText = ex.type === 'text';
  const [question, setQuestion] = useState(ex.question);
  const [options, setOptions] = useState<string[]>(() => {
    const existing = ex.options ?? [];
    return [0, 1, 2, 3].map((i) => existing[i] ?? '');
  });
  const [correctIndex, setCorrectIndex] = useState<number>(() => {
    const idx = (ex.options ?? []).indexOf(ex.answer);
    return idx >= 0 ? idx : 0;
  });
  const [textAnswer, setTextAnswer] = useState(ex.answer);
  const [difficulty, setDifficulty] = useState<Difficulty>(ex.difficulty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const dirty = isText
    ? question !== ex.question || difficulty !== ex.difficulty || textAnswer !== ex.answer
    : question !== ex.question ||
      difficulty !== ex.difficulty ||
      options.some((o, i) => o !== (ex.options?.[i] ?? '')) ||
      options[correctIndex]?.trim() !== ex.answer;

  async function handleSave() {
    if (!question.trim()) {
      setError('Cần nhập nội dung câu hỏi.');
      return;
    }
    let payload: Record<string, unknown>;
    if (isText) {
      if (!textAnswer.trim()) {
        setError('Cần nhập đáp án.');
        return;
      }
      payload = {
        question: question.trim(),
        answer: textAnswer.trim(),
        difficulty,
      };
    } else {
      const trimmedOptions = options.map((o) => o.trim()).filter((o) => o !== '');
      if (trimmedOptions.length < 2) {
        setError('Cần ít nhất 2 đáp án.');
        return;
      }
      const correctText = options[correctIndex]?.trim();
      if (!correctText || !trimmedOptions.includes(correctText)) {
        setError('Chọn một đáp án đúng trong số các đáp án đã nhập.');
        return;
      }
      payload = {
        question: question.trim(),
        options: trimmedOptions,
        answer: correctText,
        difficulty,
      };
    }
    setSaving(true);
    setError('');
    try {
      const updated = await apiPatch<Exercise>(`/api/v1/exercises/${ex.id}`, payload);
      onSaved(ex.id, updated);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await apiDelete(`/api/v1/sets/${item.setId}/exercises/${ex.id}`);
      onDeleted(ex.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa.');
      setDeleting(false);
    }
  }

  return (
    <motion.div
      layout
      variants={fadeSlideUp}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`space-y-3 rounded-2xl border p-4 transition-colors duration-200 ${
        isDragOver
          ? 'border-indigo-400/60 bg-indigo-500/10'
          : 'border-white/15 bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="cursor-grab select-none text-slate-500 active:cursor-grabbing"
          title="Kéo để sắp xếp lại"
        >
          ⠿
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Câu hỏi {index + 1}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {justSaved && <span className="text-xs font-medium text-green-300">✓ Đã lưu</span>}
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? '…' : 'Xóa'}
          </Button>
        </div>
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        placeholder="Nội dung câu hỏi — hỗ trợ LaTeX: $x^2$"
        className="input-base"
      />
      {question.includes('$') && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-slate-200">
          <MathText text={question} />
        </div>
      )}

      {isText ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Đáp án</label>
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            className="input-base"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors duration-200 ${
                correctIndex === i
                  ? 'border-green-400/50 bg-green-500/10'
                  : 'border-white/15 bg-white/5'
              }`}
            >
              <input
                type="radio"
                name={`correct-${item.id}`}
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                className="accent-green-500"
              />
              <span className="w-5 shrink-0 font-bold text-slate-400">{LETTERS[i]}</span>
              <input
                type="text"
                value={opt}
                onChange={(e) =>
                  setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))
                }
                placeholder={i < 2 ? `Đáp án ${LETTERS[i]} (bắt buộc)` : `Đáp án ${LETTERS[i]}`}
                className="min-w-0 flex-1 bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
              />
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="input-base w-40"
        >
          <option value="easy">Dễ</option>
          <option value="medium">Trung bình</option>
          <option value="hard">Khó</option>
        </select>
        {dirty && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </motion.div>
  );
}
