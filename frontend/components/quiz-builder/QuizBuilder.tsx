'use client';

import { useRef, useState, FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiPost, apiPatch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import { QuestionEditor } from './QuestionEditor';
import { popIn } from '@/lib/animations';
import type { SetItem, Exercise, Difficulty, ExerciseType } from '@/lib/types';

const EMPTY_OPTIONS = ['', '', '', ''];

interface QuizBuilderProps {
  setId: string;
  items: SetItem[];
  onItemsChange: (items: SetItem[]) => void;
}

// The primary way questions get into a set: authored right here, not
// picked from a separate bank browse-and-attach flow. Field layout/labels
// mirror ExerciseForm.tsx (teacher/create) 1:1 — same conceptual task, kept
// visually consistent even though this posts to a different, atomic
// "create + attach to set" endpoint rather than a standalone Exercise.
// Reordering is native HTML5 drag-and-drop (no extra dependency) with an
// optimistic local reorder that reverts if the server call fails.
export function QuizBuilder({ setId, items, onItemsChange }: QuizBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(items.length === 0);
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<ExerciseType>('mcq');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [options, setOptions] = useState<string[]>(EMPTY_OPTIONS);
  const [answer, setAnswer] = useState('');
  // Chi dung cho mcq -- xem ExerciseForm.tsx cho cung 1 pattern (bam chon
  // truc tiep, to xanh, thay vi go tay "dap an dung").
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  function resetForm() {
    setQuestion('');
    setType('mcq');
    setDifficulty('medium');
    setOptions(EMPTY_OPTIONS);
    setAnswer('');
    setCorrectIndex(null);
  }

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
    if (correctIndex === i && !value.trim()) setCorrectIndex(null);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError('');

    let payload: Record<string, unknown>;
    if (type === 'mcq') {
      const trimmedOptions = options.map((o) => o.trim()).filter((o) => o !== '');
      if (trimmedOptions.length < 2) {
        setAddError('Cần ít nhất 2 lựa chọn.');
        return;
      }
      if (correctIndex === null) {
        setAddError('Hãy bấm ✓ để chọn đáp án đúng.');
        return;
      }
      payload = {
        question: question.trim(),
        type: 'mcq',
        optionA: options[0],
        optionB: options[1],
        optionC: options[2] || undefined,
        optionD: options[3] || undefined,
        correctAnswer: options[correctIndex].trim(),
        difficulty,
      };
    } else {
      if (!answer.trim()) {
        setAddError('Nhập đáp án.');
        return;
      }
      payload = {
        question: question.trim(),
        type: 'text',
        correctAnswer: answer.trim(),
        difficulty,
      };
    }

    setAdding(true);
    try {
      const item = await apiPost<SetItem>(`/api/v1/sets/${setId}/questions`, payload);
      onItemsChange([...items, item]);
      resetForm();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Không thể thêm câu hỏi.');
    } finally {
      setAdding(false);
    }
  }

  function handleDeleted(exerciseId: string) {
    onItemsChange(items.filter((i) => i.exerciseId !== exerciseId));
  }

  function handleSaved(exerciseId: string, exercise: Exercise) {
    onItemsChange(items.map((i) => (i.exerciseId === exerciseId ? { ...i, exercise } : i)));
  }

  function onDragStart(index: number) {
    dragIndex.current = index;
  }
  function onDragEnter(index: number) {
    if (dragIndex.current !== null && dragIndex.current !== index) {
      setDragOverIndex(index);
    }
  }
  async function onDragEnd() {
    const from = dragIndex.current;
    const to = dragOverIndex;
    dragIndex.current = null;
    setDragOverIndex(null);
    if (from === null || to === null || from === to) return;

    const reordered = [...items];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onItemsChange(reordered);
    setReordering(true);
    try {
      await apiPatch(`/api/v1/sets/${setId}/reorder`, {
        exerciseIds: reordered.map((i) => i.exerciseId),
      });
    } catch {
      onItemsChange(items); // revert to the pre-drag order
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <QuestionEditor
                key={item.id}
                item={item}
                index={i}
                draggable
                isDragOver={dragOverIndex === i}
                onDragStart={() => onDragStart(i)}
                onDragEnter={() => onDragEnter(i)}
                onDragEnd={onDragEnd}
                onDeleted={handleDeleted}
                onSaved={handleSaved}
              />
            ))}
          </AnimatePresence>
          {reordering && <p className="text-xs text-slate-500">Đang lưu thứ tự…</p>}
        </div>
      )}

      {!showAddForm ? (
        <Button onClick={() => setShowAddForm(true)}>+ Thêm câu hỏi</Button>
      ) : (
        <motion.form
          variants={popIn}
          initial="hidden"
          animate="show"
          onSubmit={handleAdd}
          className="space-y-5 rounded-2xl border border-indigo-400/30 bg-indigo-500/5 p-4"
        >
          <h3 className="text-sm font-semibold text-white">Câu hỏi mới</h3>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Câu hỏi{' '}
              <span className="text-slate-500">
                (hỗ trợ LaTeX: $x^2$ dạng dòng, $$\frac{'{a}{b}'}$$ dạng khối)
              </span>
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={3}
              className="input-base"
            />
            {question.includes('$') && (
              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <span className="mr-2 text-xs uppercase tracking-wide text-slate-500">
                  Xem trước
                </span>
                <MathText text={question} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Loại</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ExerciseType)}
                className="input-base"
              >
                <option value="mcq">Trắc nghiệm</option>
                <option value="text">Tự luận</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Độ khó
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

          {type === 'mcq' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Các lựa chọn <span className="text-slate-500">(bấm ✓ để chọn đáp án đúng)</span>
              </label>
              {options.map((opt, i) => {
                const isCorrect = correctIndex === i;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Lựa chọn ${i + 1}`}
                      className={`input-base flex-1 ${
                        isCorrect ? 'border-green-500/60 bg-green-500/10 text-green-200' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(i)}
                      disabled={!opt.trim()}
                      title="Đánh dấu là đáp án đúng"
                      className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                        isCorrect
                          ? 'border-green-500/60 bg-green-500/20 text-green-300'
                          : 'border-white/15 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40'
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Đáp án
              </label>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
                className="input-base"
              />
            </div>
          )}

          {addError && <p className="text-sm text-red-400">{addError}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={adding}>
              {adding ? 'Đang thêm…' : '+ Thêm câu hỏi'}
            </Button>
            {items.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                  setAddError('');
                }}
              >
                Xong
              </Button>
            )}
          </div>
        </motion.form>
      )}
    </div>
  );
}
