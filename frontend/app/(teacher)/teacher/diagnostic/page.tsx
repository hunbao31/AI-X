'use client';

import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type {
  SkillCatalogChuong,
  SkillCatalogSkill,
  DiagnosticDifficulty,
  DiagnosticExercise,
  ClassSummary,
} from '@/lib/types';

const TIER_TONE: Record<SkillCatalogSkill['priorityTier'], 'red' | 'yellow' | 'slate'> = {
  cao: 'red',
  trung_binh: 'yellow',
  thap: 'slate',
};
const TIER_LABEL: Record<SkillCatalogSkill['priorityTier'], string> = {
  cao: 'Ưu tiên cao',
  trung_binh: 'Ưu tiên TB',
  thap: 'Ưu tiên thấp',
};

const DIFFICULTIES: { key: DiagnosticDifficulty; label: string }[] = [
  { key: 'de', label: 'Dễ' },
  { key: 'trung_binh', label: 'Trung bình' },
  { key: 'kho', label: 'Khó' },
];
interface ImportResult {
  created: number;
  failed: number;
  errors: string[];
}

// One "ô" kỹ năng trong danh mục bên trái — kéo được vào vùng thả bên phải.
// Dùng native HTML5 drag-and-drop (không thêm thư viện), cùng cách
// QuizBuilder.tsx đã làm cho việc kéo-thả sắp xếp câu hỏi.
function SkillChip({
  skill,
  onDragStart,
}: {
  skill: SkillCatalogSkill;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition-colors duration-150 hover:border-indigo-400/50 hover:bg-indigo-500/10 active:cursor-grabbing"
      title={skill.skillCode}
    >
      <span className="min-w-0 flex-1 truncate">{skill.vnName}</span>
      {skill.needsVnName && (
        <span title="Chưa có tên tiếng Việt, đang hiển thị mã gốc">⚠️</span>
      )}
      {skill.daCoCauHoi && (
        <Badge tone="green" className="shrink-0">
          Đã có câu hỏi
        </Badge>
      )}
      <Badge tone={TIER_TONE[skill.priorityTier]} className="shrink-0">
        {TIER_LABEL[skill.priorityTier]}
      </Badge>
    </div>
  );
}

// Danh sách câu hỏi trắc nghiệm đã có sẵn của 1 kỹ năng, chỉ để xem lại
// trước khi nhập thêm — không sửa/xóa ở đây (ngoài phạm vi cần thiết).
function ExistingQuestionsList({ exercises }: { exercises: DiagnosticExercise[] }) {
  if (exercises.length === 0) {
    return <p className="text-sm text-slate-400">Kỹ năng này chưa có câu hỏi nào.</p>;
  }
  return (
    <div className="space-y-2">
      {DIFFICULTIES.map((d) => {
        const rows = exercises.filter((e) => e.difficulty === d.key);
        if (rows.length === 0) return null;
        return (
          <div key={d.key} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {d.label} ({rows.length})
            </p>
            {rows.map((e) => (
              <div
                key={e.id}
                className="space-y-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"
              >
                <p>{e.question}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(e.options ?? []).map((opt) => (
                    <span
                      key={opt}
                      className={`rounded-md px-2 py-0.5 text-xs ${
                        opt === e.answer
                          ? 'bg-green-500/15 text-green-300'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function DiagnosticSkillCatalogPage() {
  const [catalog, setCatalog] = useState<SkillCatalogChuong[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedChuongSgk, setSelectedChuongSgk] = useState('');
  const [selectedBaiSgk, setSelectedBaiSgk] = useState('');
  const [selectedSkillCode, setSelectedSkillCode] = useState('');
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  const draggedSkill = useRef<SkillCatalogSkill | null>(null);
  const [droppedSkill, setDroppedSkill] = useState<SkillCatalogSkill | null>(null);
  const [dragOverZone, setDragOverZone] = useState(false);

  const [existingExercises, setExistingExercises] = useState<DiagnosticExercise[]>([]);
  const [existingLoading, setExistingLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [defaultDifficulty, setDefaultDifficulty] = useState<DiagnosticDifficulty>('de');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const selectedChuong = catalog?.find((c) => c.chuongSgk === selectedChuongSgk);
  const selectedBai = selectedChuong?.bais.find((b) => String(b.baiSgk) === selectedBaiSgk);

  async function loadCatalog() {
    setLoadError('');
    try {
      const data = await apiGet<SkillCatalogChuong[]>('/api/v1/diagnostic/skill-catalog');
      setCatalog(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không thể tải danh mục kỹ năng.');
    }
  }

  useEffect(() => {
    loadCatalog();
    apiGet<ClassSummary[]>('/api/v1/classes').then(setClasses).catch(() => setClasses([]));
  }, []);

  function toggleChuong(chuongSgk: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(chuongSgk)) next.delete(chuongSgk);
      else next.add(chuongSgk);
      return next;
    });
  }

  async function loadExisting(skillCode: string) {
    setExistingLoading(true);
    try {
      const data = await apiGet<DiagnosticExercise[]>(
        `/api/v1/diagnostic/skills/${encodeURIComponent(skillCode)}/exercises`,
      );
      setExistingExercises(data);
    } catch {
      setExistingExercises([]);
    } finally {
      setExistingLoading(false);
    }
  }

  function resetImportForm() {
    setFileName('');
    setCsvText('');
    setImportError('');
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleDrop() {
    setDragOverZone(false);
    if (!draggedSkill.current) return;
    chooseSkill(draggedSkill.current);
    draggedSkill.current = null;
  }

  function chooseSkill(skill: SkillCatalogSkill) {
    setDroppedSkill(skill);
    setSelectedChuongSgk(skill.chuongSgk);
    setSelectedBaiSgk(String(skill.baiSgk));
    setSelectedSkillCode(skill.skillCode);
    resetImportForm();
    setCreateError('');
    void loadExisting(skill.skillCode);
  }

  function updateOption(index: number, value: string) {
    setOptions((previous) => previous.map((option, i) => (i === index ? value : option)));
    if (correctIndex === index && !value.trim()) setCorrectIndex(null);
  }

  async function handleCreate() {
    if (!droppedSkill || correctIndex === null) {
      setCreateError('Hãy chọn kỹ năng và một đáp án đúng.');
      return;
    }
    const cleanedOptions = options.map((option) => option.trim()).filter(Boolean);
    const answer = options[correctIndex]?.trim();
    if (!question.trim() || cleanedOptions.length < 2 || !answer) {
      setCreateError('Câu hỏi, ít nhất hai lựa chọn và đáp án đúng là bắt buộc.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await apiPost('/api/v1/diagnostic/exercises', {
        classId: selectedClassId,
        skillCode: droppedSkill.skillCode,
        difficulty: defaultDifficulty,
        question: question.trim(),
        options: cleanedOptions,
        answer,
      });
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectIndex(null);
      await loadExisting(droppedSkill.skillCode);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Không thể tạo câu hỏi.');
    } finally {
      setCreating(false);
    }
  }

  function handleFile(file: File | undefined) {
    setImportResult(null);
    setImportError('');
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.onerror = () => setImportError('Không thể đọc tệp này.');
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!droppedSkill) return;
    setImportError('');
    setImportResult(null);
    if (!csvText.trim()) {
      setImportError('Hãy chọn một tệp CSV trước.');
      return;
    }

    setImporting(true);
    try {
      const imported = await apiPost<ImportResult>('/api/v1/diagnostic/exercises/import', {
        classId: selectedClassId,
        skillCode: droppedSkill.skillCode,
        csv: csvText,
        difficulty: defaultDifficulty,
      });
      setImportResult(imported);
      if (imported.created > 0) {
        setCsvText('');
        setFileName('');
        if (fileRef.current) fileRef.current.value = '';
        // Optimistic update — đánh dấu ô này "Đã có câu hỏi" ngay, không cần
        // tải lại toàn bộ danh mục.
        setCatalog((prev) =>
          prev
            ? prev.map((chuong) => ({
                ...chuong,
                bais: chuong.bais.map((bai) => ({
                  ...bai,
                  skills: bai.skills.map((s) =>
                    s.skillCode === droppedSkill.skillCode ? { ...s, daCoCauHoi: true } : s,
                  ),
                })),
              }))
            : prev,
        );
        loadExisting(droppedSkill.skillCode);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Không thể nhập câu hỏi.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ngân hàng câu hỏi chẩn đoán</h1>
        <p className="mt-1 text-sm text-slate-400">
          Chọn lớp, rồi kéo 1 ô kỹ năng từ danh mục bên trái vào khu vực bên phải, sau đó tải lên tệp
          CSV chứa các câu hỏi trắc nghiệm (4 lựa chọn) cho kỹ năng đó.
        </p>
      </div>

      {loadError && <p className="text-sm text-red-400">{loadError}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Khu trái: danh mục kỹ năng, nhóm theo chương -> bài */}
        <Card className="max-h-[75vh] space-y-3 overflow-y-auto">
          <h2 className="text-lg font-semibold text-white">
            Danh mục kỹ năng {catalog ? `(${catalog.reduce((n, c) => n + c.bais.reduce((m, b) => m + b.skills.length, 0), 0)} bài)` : ''}
          </h2>
          {!catalog && !loadError && <p className="text-sm text-slate-400">Đang tải…</p>}
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
            <label className="block text-sm font-semibold text-white">Lớp học</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="input-base"
            >
              <option value="">Chọn lớp đang soạn câu hỏi</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>{klass.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-semibold text-white">Chọn theo Chương/Bài SGK</p>
            <select
              value={selectedChuongSgk}
              onChange={(e) => {
                setSelectedChuongSgk(e.target.value);
                setSelectedBaiSgk('');
                setSelectedSkillCode('');
              }}
              className="input-base"
            >
              <option value="">Chọn Chương SGK</option>
              {catalog?.map((chuong) => (
                <option key={chuong.chuongSgk} value={chuong.chuongSgk}>
                  {chuong.chuongSgk}
                </option>
              ))}
            </select>
            <select
              value={selectedBaiSgk}
              disabled={!selectedChuong}
              onChange={(e) => {
                setSelectedBaiSgk(e.target.value);
                setSelectedSkillCode('');
              }}
              className="input-base"
            >
              <option value="">Chọn Bài SGK</option>
              {selectedChuong?.bais.map((bai) => (
                <option key={bai.baiSgk} value={bai.baiSgk}>
                  Bài {bai.baiSgk}{bai.tenBai ? ` — ${bai.tenBai}` : ''}
                </option>
              ))}
            </select>
            <select
              value={selectedSkillCode}
              disabled={!selectedBai}
              onChange={(e) => {
                const skill = selectedBai?.skills.find((item) => item.skillCode === e.target.value);
                if (skill) chooseSkill(skill);
                else setSelectedSkillCode('');
              }}
              className="input-base"
            >
              <option value="">Chọn kỹ năng</option>
              {selectedBai?.skills.map((skill) => (
                <option key={skill.skillCode} value={skill.skillCode}>
                  {skill.vnName}
                </option>
              ))}
            </select>
          </div>
          {catalog?.map((chuong) => {
            const isCollapsed = collapsed.has(chuong.chuongSgk);
            const total = chuong.bais.reduce((n, b) => n + b.skills.length, 0);
            return (
              <div key={chuong.chuongSgk} className="rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => toggleChuong(chuong.chuongSgk)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-white"
                >
                  <span>{chuong.chuongSgk}</span>
                  <span className="flex items-center gap-2 text-xs font-normal text-slate-400">
                    {total} bài
                    <span>{isCollapsed ? '▸' : '▾'}</span>
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-3 px-3 pb-3">
                    {chuong.bais.map((bai) => (
                      <div key={bai.baiSgk} className="space-y-1.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Bài {bai.baiSgk}
                        </p>
                        <div className="space-y-1.5">
                          {bai.skills.map((skill) => (
                            <SkillChip
                              key={skill.skillCode}
                              skill={skill}
                              onDragStart={() => {
                                draggedSkill.current = skill;
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        {/* Khu phải: vùng thả + câu hỏi đã có + nhập CSV */}
        <Card
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverZone(true);
          }}
          onDragLeave={() => setDragOverZone(false)}
          onDrop={handleDrop}
          className={`min-h-[75vh] space-y-4 border-2 border-dashed transition-colors duration-150 ${
            dragOverZone ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/15'
          }`}
        >
          {!droppedSkill ? (
            <div className="flex h-full min-h-[60vh] items-center justify-center text-center text-sm text-slate-400">
              Kéo 1 ô kỹ năng vào đây để bắt đầu nhập câu hỏi
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">{droppedSkill.vnName}</h2>
                  <p className="text-xs text-slate-500">
                    {droppedSkill.chuongSgk} · Bài {droppedSkill.baiSgk}
                  </p>
                </div>
                <Badge tone={TIER_TONE[droppedSkill.priorityTier]}>
                  {TIER_LABEL[droppedSkill.priorityTier]}
                </Badge>
              </div>

              <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">Câu hỏi đã có</p>
                {existingLoading ? (
                  <p className="text-sm text-slate-400">Đang tải…</p>
                ) : (
                  <ExistingQuestionsList exercises={existingExercises} />
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">Soạn câu hỏi trực tiếp</p>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                  placeholder="Nhập câu hỏi"
                  className="input-base"
                />
                {options.map((option, index) => (
                  <label key={index} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="radio"
                      name="correct-option"
                      checked={correctIndex === index}
                      onChange={() => setCorrectIndex(index)}
                      disabled={!option.trim()}
                    />
                    <input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Lựa chọn ${index + 1}`}
                      className="input-base flex-1"
                    />
                  </label>
                ))}
                {createError && <p className="text-sm text-red-400">{createError}</p>}
                <Button onClick={handleCreate} disabled={creating || !selectedClassId}>
                  {creating ? 'Đang lưu…' : 'Lưu câu hỏi'}
                </Button>
              </div>

              <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">Nhập câu hỏi từ CSV</p>

                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="input-base cursor-pointer file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-300"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Các cột: question, optionA, optionB, optionC, optionD, correctAnswer
                    (chữ cái A–D hoặc đúng nội dung lựa chọn). Tùy chọn: difficulty
                    (de/trung_binh/kho). Dùng Excel? Hãy lưu thành CSV trước.
                  </p>
                  {fileName && <p className="mt-1 text-xs text-indigo-300">📄 {fileName}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Độ khó mặc định (cho các dòng không ghi difficulty)
                  </label>
                  <select
                    value={defaultDifficulty}
                    onChange={(e) => setDefaultDifficulty(e.target.value as DiagnosticDifficulty)}
                    className="input-base"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {importError && <p className="text-sm text-red-400">{importError}</p>}
                {importResult && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    <p className="text-slate-200">
                      ✅ Đã tạo{' '}
                      <span className="font-bold text-green-300">{importResult.created}</span>
                      {' · '}❌ Đã bỏ qua{' '}
                      <span className="font-bold text-red-300">{importResult.failed}</span>
                    </p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-slate-400">
                        {importResult.errors.slice(0, 6).map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                        {importResult.errors.length > 6 && (
                          <li>…và {importResult.errors.length - 6} lỗi khác.</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}

                <Button onClick={handleImport} disabled={importing || !selectedClassId}>
                  {importing ? 'Đang nhập…' : 'Nhập câu hỏi'}
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setDroppedSkill(null);
                  resetImportForm();
                }}
                disabled={importing}
              >
                Đóng
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
