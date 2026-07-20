// CSV parsing + row validation for bulk question import. Pure functions —
// no I/O — so the whole pipeline is unit-testable.
//
// Expected columns (header row optional, detected by "question" in cell 1):
//   question, optionA, optionB, optionC, optionD, correctAnswer[, topic][, difficulty][, tags]
// - with a header row, those columns may appear in any order
// - without one, cell 7 is sniffed: easy/medium/hard → difficulty, anything
//   else → per-row topic (keeps older files working)
// - optionC/optionD may be empty (2-option questions are fine)
// - correctAnswer is a letter (A–D) or the exact option text
// - LaTeX passes through verbatim ($...$ / $$...$$) — cells are stored as
//   raw strings; quote cells containing plain commas (the LaTeX thin space
//   "\," is recognized as content and needs no quoting)
// - tags are ";"-separated in a single cell
//
// Excel users: save the sheet as "CSV (Comma delimited)" — .xlsx binaries are
// not parsed.

import { Difficulty } from './dto/create-exercise.dto';

export interface ImportRowError {
  row: number; // 1-based, counting data rows as they appear in the file
  reason: string;
}

export interface ParsedQuestion {
  question: string;
  options: string[];
  answer: string;
  // Per-row topic label (optional — the import-wide topic is the fallback).
  topic?: string;
  difficulty: Difficulty;
  tags: string[];
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: ImportRowError[];
}

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];

// RFC-4180-ish CSV: quoted fields, embedded commas, "" escapes, CRLF/LF.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    // Ignore fully blank lines.
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === '\\' && text[i + 1] === ',') {
      // LaTeX-aware: "\," (thin space, e.g. $\int 2x\,dx$) is content, not a
      // cell separator — hand-authored math CSVs rarely quote it. A data cell
      // genuinely ending in a lone backslash is unheard of in this domain.
      field += '\\,';
      i++;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else if (char === '\r') {
      if (text[i + 1] === '\n') i++;
      pushRow();
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) pushRow();

  return rows;
}

function looksLikeHeader(cells: string[]): boolean {
  return cells[0]?.trim().toLowerCase() === 'question';
}

interface ColumnMap {
  question: number;
  optionA: number;
  optionB: number;
  optionC: number;
  optionD: number;
  correct: number;
  topic: number | null;
  difficulty: number | null;
  tags: number | null;
}

const POSITIONAL: ColumnMap = {
  question: 0,
  optionA: 1,
  optionB: 2,
  optionC: 3,
  optionD: 4,
  correct: 5,
  topic: 6,
  difficulty: 7,
  tags: 8,
};

// Header rows may order the optional columns freely.
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
    topic: pick('topic', null),
    difficulty: pick('difficulty', null),
    tags: pick('tags', null),
  };
}

export function parseQuestionRows(
  text: string,
  defaultDifficulty: Difficulty = 'easy',
): ParseResult {
  const rows = parseCsv(text);
  const questions: ParsedQuestion[] = [];
  const errors: ImportRowError[] = [];

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
    let topicRaw = cell(columns.topic);
    let difficultyRaw = cell(columns.difficulty);
    const tagsRaw = cell(columns.tags);

    // Headerless files predating the topic column put difficulty at cell 7 —
    // sniff and shift so both layouts keep working.
    if (!hasHeader && ['easy', 'medium', 'hard'].includes(topicRaw.toLowerCase())) {
      difficultyRaw = topicRaw;
      topicRaw = '';
    }

    if (!question) {
      errors.push({ row: rowNumber, reason: 'Missing question text.' });
      return;
    }

    const options = [a, b, c, d].filter((o) => o !== '');
    if (options.length < 2) {
      errors.push({
        row: rowNumber,
        reason: 'At least two options (optionA, optionB) are required.',
      });
      return;
    }
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      errors.push({ row: rowNumber, reason: 'Options must be unique.' });
      return;
    }

    if (!correct) {
      errors.push({ row: rowNumber, reason: 'Missing correctAnswer.' });
      return;
    }

    // Letter form ("B") or exact option text — both accepted.
    let answer: string | undefined;
    const letterIndex = ANSWER_LETTERS.indexOf(correct.toUpperCase());
    if (correct.length === 1 && letterIndex >= 0) {
      answer = options[letterIndex];
      if (answer === undefined) {
        errors.push({
          row: rowNumber,
          reason: `correctAnswer "${correct}" points at an empty option.`,
        });
        return;
      }
    } else {
      answer = options.find((o) => o.toLowerCase() === correct.toLowerCase());
      if (answer === undefined) {
        errors.push({
          row: rowNumber,
          reason: 'correctAnswer must match one of the options (or be A/B/C/D).',
        });
        return;
      }
    }

    let difficulty = defaultDifficulty;
    if (difficultyRaw) {
      const normalized = difficultyRaw.toLowerCase() as Difficulty;
      if (!VALID_DIFFICULTIES.includes(normalized)) {
        errors.push({
          row: rowNumber,
          reason: `Invalid difficulty "${difficultyRaw}" (use easy/medium/hard).`,
        });
        return;
      }
      difficulty = normalized;
    }

    const tags = (tagsRaw ?? '')
      .split(';')
      .map((t) => t.trim())
      .filter((t) => t !== '');

    questions.push({
      question,
      options,
      answer,
      topic: topicRaw || undefined,
      difficulty,
      tags,
    });
  });

  return { questions, errors };
}
