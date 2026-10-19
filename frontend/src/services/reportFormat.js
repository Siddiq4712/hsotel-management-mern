export const REPORT_FORMAT_EVENT = 'hostel:report-format';
export function requestReportFormat({ title = 'Choose report format', formats = ['preview', 'xlsx', 'csv', 'pdf'] } = {}) {
  return new Promise(resolve => window.dispatchEvent(new CustomEvent(REPORT_FORMAT_EVENT, { detail: { title, formats, resolve } })));
}
