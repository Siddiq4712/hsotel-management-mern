const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
export const reportText = value => value == null ? '' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value);
export const reportKeys = rows => [...new Set(rows.flatMap(row => Object.keys(row)))];
export function reportFieldType(rows, key) {
  const values = rows.map(row => row[key]).filter(value => value != null && value !== '');
  if (values.length && values.every(value => typeof value === 'number')) return 'number';
  if (values.length && values.every(value => /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(String(value)))) return 'date';
  return 'text';
}
export function reportView(rows, { search = '', filters = {}, sort = {} } = {}) {
  const query = search.trim().toLowerCase();
  const filtered = rows.filter(row => {
    if (query && !Object.values(row).some(value => reportText(value).toLowerCase().includes(query))) return false;
    return Object.entries(filters).every(([key, filter]) => {
      const value = row[key];
      if (filter.values?.length && !filter.values.includes(reportText(value))) return false;
      if (filter.min !== '' && filter.min != null && (value == null || value === '' || Number(value) < Number(filter.min))) return false;
      if (filter.max !== '' && filter.max != null && (value == null || value === '' || Number(value) > Number(filter.max))) return false;
      const date = reportText(value).slice(0, 10);
      if (filter.from && (!date || date < filter.from)) return false;
      if (filter.to && (!date || date > filter.to)) return false;
      return true;
    });
  });
  if (sort.field && sort.order) filtered.sort((a, b) => {
    const left = a[sort.field], right = b[sort.field];
    if (left == null || left === '') return right == null || right === '' ? 0 : 1;
    if (right == null || right === '') return -1;
    const difference = typeof left === 'number' && typeof right === 'number' ? left - right : collator.compare(reportText(left), reportText(right));
    return difference * (sort.order === 'descend' ? -1 : 1);
  });
  return filtered;
}
export function reportViewDescription({ search = '', filters = {}, sort = {} }, label = key => key) {
  const lines = [];
  if (search.trim()) lines.push(['Search', search.trim()]);
  for (const [key, filter] of Object.entries(filters)) {
    if (filter.values?.length) lines.push([label(key), filter.values.map(value => value || '(Blank)').join(', ')]);
    if (filter.min !== '' && filter.min != null) lines.push([`${label(key)} minimum`, filter.min]);
    if (filter.max !== '' && filter.max != null) lines.push([`${label(key)} maximum`, filter.max]);
    if (filter.from) lines.push([`${label(key)} from`, filter.from]);
    if (filter.to) lines.push([`${label(key)} to`, filter.to]);
  }
  if (!lines.length) lines.push(['Filters', 'All rows']);
  lines.push(['Sort', sort.field && sort.order ? `${label(sort.field)} (${sort.order === 'descend' ? 'descending' : 'ascending'})` : 'Original order']);
  return lines;
}
