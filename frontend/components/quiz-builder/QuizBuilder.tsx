'use client';

import { useRef, useState, FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiPost, apiPatch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { QuestionEditor } from './QuestionEditor';
import { popIn } from '@/lib/animations';
import type { SetItem, Exercise, Difficulty } from '@/lib/types';

const LETTERS = ['A', 'B', 'C', 'D'];
const EMPTY_OPTIONS = ['', '', '', ''];

interface QuizBuilderProps {
  setId: string;
  items: SetItem[];
  onItemsChange: (items: SetItem[]) => void;
}

// The primary way questions get into a set: authored right here, not
// picked from a separate bank browse-and-attach flow. Reordering is native
// HTML5 drag-and-drop (no extra dependency) with an optimistic local
// reorder that reverts if the server call fails.
export function QuizBuilder({ setId, items, onItemsChange }: QuizBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(items.length === 0);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(EMPTY_OPTIONS);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  function resetForm() {
    setQuestion('');
    setOptions(EMPTY_OPTIONS);
    setCorrectIndex(0);
    setDifficulty('medium');
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmedOptions = options.map((o) => o.trim()).filter((o) => o !== '');
    if (trimmedOptions.length < 2) {
      setAddError('Cần ít nhất 2 đáp án.');
      return;
    }
    const correctText = options[correctIndex]?.trim();
    if (!correctText) {
      setAddError('Chọn một đáp án đúng.');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const item = await apiPost<SetItem>(`/api/v1/sets/${setId}/questions`, {
        question: question.trim(),
        optionA: options[0],
        optionB: options[1],
        optionC: options[2] || undefined,
        optionD: options[3] || undefined,
        correctAnswer: correctText,
        difficulty,
      });
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
          className="space-y-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/5 p-4"
        >
          <h3 className="text-sm font-semibold text-white">Câu hỏi mới</h3>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            rows={2}
            placeholder="Nội dung câu hỏi — hỗ trợ LaTeX: $x^2$"
            className="input-base"
          />
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
                  name="new-question-correct"
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
                  required={i < 2}
                  className="min-w-0 flex-1 bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="input-base w-40"
            >
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
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
          {addError && <p className="text-sm text-red-400">{addError}</p>}
        </motion.form>
      )}
    </div>
  );
}
