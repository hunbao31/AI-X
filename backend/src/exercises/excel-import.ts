// .xlsx -> string[][] so it can feed the same column layout/validation as
// CSV import (see csv-import.ts's parseQuestionRowsFromCells). Only .xlsx
// (OOXML) is supported — exceljs cannot read the legacy binary .xls format.
import * as ExcelJS from 'exceljs';

export async function parseExcelToRows(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled .d.ts resolves `Buffer` through its own nested
  // @types/node (pulled in via fast-csv, an old non-generic version) — a
  // structurally different type from this file's Buffer even though both
  // are the same class at runtime. skipLibCheck doesn't cover this cross-
  // package mismatch; `as Buffer` re-resolves to the same (new) ambient
  // type and still fails, so this needs the wider `any` escape hatch.
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    // includeEmpty keeps column alignment intact — optionC/optionD are
    // routinely left blank (2-option questions), same as the CSV path.
    row.eachCell({ includeEmpty: true }, (cell) => {
      const text = cell.text;
      cells.push(text === null || text === undefined ? '' : String(text));
    });
    while (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
    if (cells.some((c) => c.trim() !== '')) rows.push(cells);
  });

  return rows;
}
