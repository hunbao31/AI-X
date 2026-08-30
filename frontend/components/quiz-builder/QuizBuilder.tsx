'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiPost, apiPatch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import { QuestionEditor } from './QuestionEditor';
import { popIn } from '@/lib/animations';
import type { SetItem, Exercise, Difficulty, ExerciseType, ClassSummary } from '@/lib/types';
import { apiGet } from '@/lib/api';

const EMPTY_OPTIONS = ['', '', '', ''];

interface QuizBuilderProps {
  setId: string;
  setClassId: string | null;
  items: SetItem[];
  onItemsChange: (items: SetItem[]) => void;
}

export function QuizBuilder({ setId, setClassId, items, onItemsChange }: QuizBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(items.length === 0);
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<ExerciseType>('mcq');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [options, setOptions] = useState<string[]>(EMPTY_OPTIONS);
  const [answer, setAnswer] = useState('');
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    if (setClassId) return;
    apiGet<ClassSummary[]>('/api/v1/classes').then(setClasses).catch(() => setClasses([]));
  }, [setClassId]);

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

    if (!setClassId && !selectedClassId) {
      setAddError('Cần chọn lớp để gắn câu hỏi này.');
      return;
    }

    let payload: Record<string, unknown>;
    if (type === 'mcq') {
      const trimmedOptions = options.map((o) => o.trim()).filter((o) => o !== '');
      if (trimmedOptions.length < 2) {
        setAddError('Cần ít nhất 2 lựa chọn.');
        return;
      }
      if (correctIndex === null) {
        setAddError('Hãy chọn đáp án đúng.');
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
        ...(!setClassId ? { classId: selectedClassId } : {}),
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
        ...(!setClassId ? { classId: selectedClassId } : {}),
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
      onItemsChange(items);
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

          {!setClassId && (
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">Lớp gắn câu hỏi</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input-base"
              >
                <option value="">Chọn lớp…</option>
                {classes.map((klass) => (
                  <option key={klass.id} value={klass.id}>{klass.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* QUESTION */}
          <div>
            <label className="mb-1.5 block text-sm text-slate-300">
              Câu hỏi (LaTeX: $...$ hoặc $$...$$)
            </label>

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="input-base"
              rows={3}
            />

            <div className="mt-2 text-sm text-slate-300">
              <MathText text={question} />
            </div>
          </div>

          {/* TYPE + DIFFICULTY */}
          <div className="grid grid-cols-2 gap-4">
            <select value={type} onChange={(e) => setType(e.target.value as ExerciseType)} className="input-base">
              <option value="mcq">Trắc nghiệm</option>
              <option value="text">Tự luận</option>
            </select>

            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="input-base">
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
          </div>

          {/* MCQ */}
          {type === 'mcq' ? (
            <div className="space-y-3">
              {options.map((opt, i) => (
                <div key={i}>
                  <div className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      className="input-base flex-1"
                    />
                    <button type="button" onClick={() => setCorrectIndex(i)}>✓</button>
                  </div>

                  <div className="text-sm text-slate-300 mt-1">
                    <MathText text={opt} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="input-base"
              />
              <div className="text-sm text-slate-300 mt-1">
                <MathText text={answer} />
              </div>
            </div>
          )}

          {addError && <p className="text-red-400">{addError}</p>}

          <Button type="submit">
            {adding ? 'Đang thêm...' : 'Thêm câu hỏi'}
          </Button>
        </motion.form>
      )}
    </div>
  );
}
