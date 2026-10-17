const FORMULA_PREFIX = /^[\s\u0000-\u001f\uFEFF]*[=+\-@]/;

export function csvCell(value) {
  const text = String(value ?? '');
  const safe = FORMULA_PREFIX.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsv(rows) {
  return rows.map(row => row.map(csvCell).join(',')).join('\n');
}
