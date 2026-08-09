// Minimal CSV writing helper (RFC-4180 quoting). LaTeX content passes
// through untouched — only quotes/commas/newlines trigger escaping.

export function escapeCsvField(value: string | null | undefined): string {
  const s = value ?? '';
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsvLine(fields: Array<string | null | undefined>): string {
  return fields.map(escapeCsvField).join(',');
}
