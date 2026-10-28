// React.memo can retain the SVG chart when a focus refresh returns equal values.
export function expenseChartData(previous, rows, year, labels) {
  const values = Array(12).fill(0);
  for (const row of rows || []) {
    const month = Number(row.month);
    if (Number(row.year) !== year || !Number.isInteger(month) || month < 1 || month > 12) continue;
    const amount = Number(row.total_amount);
    values[month - 1] = Number.isFinite(amount) ? amount : 0;
  }
  if (previous?.labels?.length === labels.length
    && previous.labels.every((label, index) => label === labels[index])
    && previous.datasets?.[0]?.data?.length === values.length
    && previous.datasets[0].data.every((value, index) => value === values[index])) return previous;
  return { labels, datasets: [{ data: values }] };
}
