// CSV parsing cho nhap hang loat cau hoi trac nghiem chan doan -- dung lai
// parseCsv/resolveAnswerFromOptions cua exercises module, chi khac
// DiagnosticDifficulty ('de'|'trung_binh'|'kho') va bo cot topic/tags (khong
// can, vi skillCode co dinh theo 1 lan nhap -- chon boi giao vien luc keo
// ky nang vao, khong phai tung dong CSV).
//
// Cac cot (dong tieu de la tuy chon, nhan dien qua "question" o o dau tien):
//   question, optionA, optionB, optionC, optionD, correctAnswer[, difficulty]
// - optionC/optionD co the de trong (cau hoi 2 lua chon van hop le)
// - correctAnswer la 1 chu cai (A-D) hoac dung noi dung lua chon

import { parseCsv } from '../exercises/csv-import';
import { resolveAnswerFromOptions } from '../exercises/answer-resolve';
import { DiagnosticDifficulty } from './dto/create-diagnostic-exercise.dto';

export interface DiagnosticImportRowError {
  row: number;
  reason: string;
}

export interface ParsedDiagnosticQuestion {
  question: string;
  options: string[];
  answer: string;
  difficulty: DiagnosticDifficulty;
}

export interface DiagnosticParseResult {
  questions: ParsedDiagnosticQuestion[];
  errors: DiagnosticImportRowError[];
}

const VALID_DIFFICULTIES: DiagnosticDifficulty[] = ['de', 'trung_binh', 'kho'];

interface ColumnMap {
  question: number;
  optionA: number;
  optionB: number;
  optionC: number;
  optionD: number;
  correct: number;
  difficulty: number | null;
}

const POSITIONAL: ColumnMap = {
  question: 0,
  optionA: 1,
  optionB: 2,
  optionC: 3,
  optionD: 4,
  correct: 5,
  difficulty: 6,
};

function looksLikeHeader(cells: string[]): boolean {
  return cells[0]?.trim().toLowerCase() === 'question';
}

// Dong tieu de duoc phep sap xep cac cot tuy y.
function mapHeader(cells: string[]): ColumnMap {
  const at = new Map(cells.map((c, i) => [c.trim().toLowerCase(), i]));
  const pick = (name: string, fallback: number | null): number | null =>
    at.has(name) ? (at.get(name) as number) : fallback;
  return {
    question: pick('question', 0) as number,
    optionA: pick('optiona', 1) as number,
    optionB: pick('optionb', 2) as number,
    optionC: pick('optionc', 3) as number,
    optionD: pick('optiond', 4) as number,
    correct: pick('correctanswer', 5) as number,
    difficulty: pick('difficulty', null),
  };
}

export function parseDiagnosticQuestionRows(
  text: string,
  defaultDifficulty: DiagnosticDifficulty = 'de',
): DiagnosticParseResult {
  const rows = parseCsv(text);
  const questions: ParsedDiagnosticQuestion[] = [];
  const errors: DiagnosticImportRowError[] = [];

  const hasHeader = rows.length > 0 && looksLikeHeader(rows[0]);
  const columns = hasHeader ? mapHeader(rows[0]) : POSITIONAL;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  dataRows.forEach((cells, i) => {
    const rowNumber = i + 1;
    const cell = (index: number | null): string =>
      index === null ? '' : (cells[index] ?? '').trim();

    const question = cell(columns.question);
    const a = cell(columns.optionA);
    const b = cell(columns.optionB);
    const c = cell(columns.optionC);
    const d = cell(columns.optionD);
    const correct = cell(columns.correct);
    const difficultyRaw = cell(columns.difficulty);

    if (!question) {
      errors.push({ row: rowNumber, reason: 'Thiếu nội dung câu hỏi.' });
      return;
    }

    const options = [a, b, c, d].filter((o) => o !== '');
    if (options.length < 2) {
      errors.push({
        row: rowNumber,
        reason: 'Cần ít nhất hai lựa chọn (optionA, optionB).',
      });
      return;
    }
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      errors.push({ row: rowNumber, reason: 'Các lựa chọn phải khác nhau.' });
      return;
    }

    if (!correct) {
      errors.push({ row: rowNumber, reason: 'Thiếu correctAnswer.' });
      return;
    }

    const resolved = resolveAnswerFromOptions(options, correct);
    if (resolved.error) {
      errors.push({ row: rowNumber, reason: resolved.error });
      return;
    }
    const answer = resolved.answer as string;

    let difficulty = defaultDifficulty;
    if (difficultyRaw) {
      const normalized = difficultyRaw.toLowerCase() as DiagnosticDifficulty;
      if (!VALID_DIFFICULTIES.includes(normalized)) {
        errors.push({
          row: rowNumber,
          reason: `Độ khó "${difficultyRaw}" không hợp lệ (dùng de/trung_binh/kho).`,
        });
        return;
      }
      difficulty = normalized;
    }

    questions.push({ question, options, answer, difficulty });
  });

  return { questions, errors };
}
