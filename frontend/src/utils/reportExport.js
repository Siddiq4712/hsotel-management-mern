import * as XLSX from 'xlsx';
import { requestReportFormat } from '../services/reportFormat';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
export function printTables(tables, title) {
  const frame = document.createElement('iframe');
  frame.title = 'Report print preview'; frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
  frame.onload = () => {
    frame.contentWindow.addEventListener('afterprint', () => frame.remove(), { once: true });
    frame.contentWindow.focus(); frame.contentWindow.print();
  };
  const renderRow = (row, tag) => `<tr>${row.map(value => `<${tag}>${escape(value)}</${tag}>`).join('')}</tr>`;
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>@page{size:landscape;margin:12mm}body{font:12px Arial;color:#111}table{border-collapse:collapse;width:100%;margin-bottom:24px}th,td{border:1px solid #bbb;padding:6px;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}h1{font-size:20px}h2{font-size:15px}</style></head><body><h1>${escape(title)}</h1>${tables.map(table => `<h2>${escape(table.name)}</h2><table><thead>${renderRow(table.rows[0] || [], 'th')}</thead><tbody>${table.rows.slice(1).map(row => renderRow(row, 'td')).join('')}</tbody></table>`).join('')}</body></html>`;
  document.body.appendChild(frame);
}
export async function exportWorkbook(workbook, filename, selectedFormat) {
  const format = selectedFormat || await requestReportFormat({ title: `Format: ${filename.replace(/\.xlsx$/i, '')}`, formats: ['xlsx', 'csv', 'pdf'] });
  if (!format) return false;
  if (format === 'xlsx') XLSX.writeFile(workbook, filename);
  else if (format === 'csv') {
    // Preserve all sheets in a single CSV, with a named section for each sheet.
    const csv = workbook.SheetNames.map(name => `${XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet([[name]]))}\r\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`).join('\r\n\r\n');
    saveBlob(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), filename.replace(/\.xlsx$/i, '.csv'));
  } else if (format === 'pdf') printTables(workbook.SheetNames.map(name => ({ name, rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }) })), filename.replace(/\.xlsx$/i, ''));
  return true;
}
export async function requestPrint(print = () => window.print()) {
  const format = await requestReportFormat({ title: 'Print report', formats: ['pdf'] });
  if (format) print();
}
