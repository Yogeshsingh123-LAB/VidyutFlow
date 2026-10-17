import assert from 'node:assert/strict';
import test from 'node:test';
import { csvCell, toCsv } from './csv.js';

test('csvCell neutralizes spreadsheet formulas after leading whitespace', () => {
  for (const formula of ['=1+1', '+cmd', '-1+1', '@SUM(A1)', '\t=1+1', '  @SUM(A1)', '\uFEFF=1+1']) {
    const escaped = formula.replaceAll('"', '""');
    assert.equal(csvCell(formula), '"' + "'" + escaped + '"');
  }
});

test('csvCell preserves ordinary values and escapes quotes', () => {
  assert.equal(csvCell('O"Brien'), '"O""Brien"');
  assert.equal(csvCell('North zone'), '"North zone"');
  assert.equal(csvCell(-12), '"\'-12"');
});

test('toCsv serializes headers and rows', () => {
  assert.equal(toCsv([['name', 'detail'], ['Applicant', '=1+1']]), '"name","detail"\n"Applicant","\'=1+1"');
});
