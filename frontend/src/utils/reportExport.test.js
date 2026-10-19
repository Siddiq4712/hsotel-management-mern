import { afterEach, expect, it, vi } from 'vitest';
import { printTables } from './reportExport';

afterEach(() => vi.restoreAllMocks());
it('prints only the supplied tables in order, repeats headers, and escapes report values', () => {
  let frame;
  vi.spyOn(document.body, 'appendChild').mockImplementation(node => { frame = node; return node; });
  printTables([{ name: 'Selected filters', rows: [['Setting', 'Value'], ['Sort', 'Amount descending']] },
    { name: 'Expenses', rows: [['Notes', 'Amount'], ['<script>bad()</script>', 300], ['Next', 100]] }], 'Expense report');
  const printedDocument = new DOMParser().parseFromString(frame.srcdoc, 'text/html');
  expect(printedDocument.title).toBe('Expense report');
  expect(printedDocument.querySelectorAll('table')).toHaveLength(2);
  expect(printedDocument.querySelectorAll('thead')).toHaveLength(2);
  expect([...printedDocument.querySelectorAll('table:last-child tbody tr')].map(row => row.textContent)).toEqual(['<script>bad()</script>300', 'Next100']);
  expect(printedDocument.querySelector('script')).toBeNull();
  expect(frame.srcdoc).toContain('thead{display:table-header-group}');
});
