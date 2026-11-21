import React, { useEffect, useState } from 'react';
import { Alert, Button, Empty, Skeleton } from 'antd';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import moment from 'moment';
import { wardenAPI } from '../../services/api';

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

const series = [
  { key: 'present', label: 'Present', color: '#167852' },
  { key: 'absent', label: 'Absent', color: '#c64551' },
  { key: 'onDuty', label: 'On duty', color: '#3263d4' },
  { key: 'importedMessDays', label: 'Imported mess days', color: '#8a63c7' },
];

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } }, tooltip: { mode: 'index', intersect: false } },
  scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Days' } } },
};

export function useStudentAttendance(studentId) {
  const [attendance, setAttendance] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (studentId == null) return;
    const controller = new AbortController();
    wardenAPI.getStudentMonthlyAttendance(studentId, { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setAttendance(response.data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [studentId, attempt]);

  const retry = () => { setError(false); setAttempt(value => value + 1); };
  return { attendance, error, retry };
}

export default function StudentAttendanceChart({ attendance, error, retry }) {
  const months = attendance?.data;
  const shownSeries = series.filter(item => months?.some(month => month[item.key] != null));
  return <section className="warden-panel warden-panel-padded" aria-label="Monthly attendance">
    <h4 className="warden-table-title">Monthly attendance</h4>
    <p className="warden-record-meta mb-4">Last 12 months · Days recorded</p>
    {error ? <Alert type="error" showIcon title="Could not load monthly attendance."
      action={<Button onClick={retry}>Retry</Button>} />
      : !months ? <Skeleton active paragraph={{ rows: 3 }} />
        : !shownSeries.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No attendance records in the last 12 months." />
          : <div className="warden-profile-chart">
            <Bar aria-label="Monthly attendance by recorded days" options={chartOptions} data={{
              labels: months.map(month => moment(month.month, 'YYYY-MM').format('MMM YY')),
              datasets: shownSeries.map(item => ({ label: item.label, data: months.map(month => month[item.key]), backgroundColor: item.color, borderRadius: 4 })),
            }} />
          </div>}
  </section>;
}

export function StudentAttendanceSummary({ attendance }) {
  const months = attendance?.data;
  const shownSeries = series.filter(item => months?.some(month => month[item.key] != null));
  if (!shownSeries.length) return null;
  const labels = months.map(month => moment(month.month, 'YYYY-MM').format('MMM YY'));
  const current = months.at(-1);
  const hasImportedTotals = shownSeries.some(item => item.key === 'importedMessDays');
  const recordedDays = month => (month.present ?? 0) + (month.absent ?? 0) + (month.onDuty ?? 0);
  const recordedThisMonth = current ? recordedDays(current) : 0;
  const recordedTotal = months.reduce((total, month) => total + recordedDays(month), 0);
  const presentTotal = months.reduce((total, month) => total + (month.present ?? 0), 0);
  const todayStatus = ({ P: 'Present', A: 'Absent', OD: 'On duty' })[attendance?.todayAttendance];
  const summary = [
    ...(todayStatus ? [['Today’s attendance', todayStatus]] : []),
    ...series.filter(item => current?.[item.key] != null).map(item => [`${item.label} · ${labels.at(-1)}`, current[item.key]]),
    ...(recordedThisMonth ? [[`Recorded days · ${labels.at(-1)}`, recordedThisMonth]] : []),
    ...(recordedTotal ? [['Present share of recorded days · last 12 months', `${Math.round(presentTotal / recordedTotal * 100)}% (${presentTotal} of ${recordedTotal})`]] : []),
    ...(hasImportedTotals ? [['Imported mess days · last 12 months', months.reduce((total, month) => total + (month.importedMessDays ?? 0), 0)]] : []),
  ];
  return <section className="warden-panel warden-panel-padded">
    <h4 className="warden-table-title">Attendance and mess summary</h4>
    {hasImportedTotals && <p className="warden-record-meta">Imported mess days are monthly totals recorded separately from daily attendance.</p>}
    {summary.length > 0 && <dl className="warden-profile-facts">
      {summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>}
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer">View attendance values</summary>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-left">
          <thead><tr><th scope="col">Month</th>{shownSeries.map(item => <th key={item.key} scope="col">{item.label}</th>)}</tr></thead>
          <tbody>{months.map((month, index) => <tr key={month.month}><th scope="row">{labels[index]}</th>
            {shownSeries.map(item => <td key={item.key}>{month[item.key] ?? '—'}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>;
}
