import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import {
  User, Bed, Receipt, Calendar, Home,
  CreditCard, FileText, Clock, Utensils
} from 'lucide-react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import moment from 'moment';
import { motion } from 'framer-motion';
import clsx from 'clsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* -------------------- UI HELPERS -------------------- */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const Card = ({ title, icon: Icon, accent = 'blue', right, children }) => (
  <motion.div
    variants={fadeUp}
    initial="hidden"
    animate="visible"
    transition={{ duration: 0.35 }}
    className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
  >
    <div className={`absolute inset-x-0 top-0 h-1 bg-${accent}-500`} />
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`text-${accent}-600`} size={20} />}
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </div>
  </motion.div>
);

const Stat = ({ label, value, icon: Icon, color }) => (
  <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
    <div className={`rounded-xl p-2 bg-${color}-100 text-${color}-700`}>
      <Icon size={20} />
    </div>
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  </div>
);

/* -------------------- CALENDAR HEATMAP HELPER -------------------- */
const generateCalendarDays = (year, month, attendanceData) => {
  const firstDay = moment(`${year}-${month.toString().padStart(2, '0')}-01`);
  const startDate = firstDay.clone().startOf('week'); // Monday start for ISO week
  const endDate = firstDay.clone().endOf('month').endOf('week');
  const days = [];
  let current = startDate.clone();
  while (current.isBefore(endDate) || current.isSame(endDate)) {
    days.push({
      date: current.clone(),
      isCurrentMonth: current.month() === firstDay.month(),
      status: null,
    });
    current.add(1, 'day');
  }
  const attMap = new Map(
    attendanceData.map((d) => [moment(d.date).format('YYYY-MM-DD'), d.status])
  );
  days.forEach((day) => {
    const key = day.date.format('YYYY-MM-DD');
    if (attMap.has(key)) {
      day.status = attMap.get(key);
    }
  });
  return days;
};

/* -------------------- MAIN COMPONENT -------------------- */
const StudentDashboard = ({ setCurrentView }) => {
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [messExpenseChartData, setMessExpenseChartData] = useState(null);
  const [attendanceChartData, setAttendanceChartData] = useState(null);
  const [attendanceHeatmapData, setAttendanceHeatmapData] = useState([]);
  /* -------- SLICERS -------- */
  const currentYear = moment().year();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1);
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: moment().month(i).format('MMM'),
  }));
  /* -------- CHART OPTIONS -------- */
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#374151', font: { size: 12 } },
      },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280' },
        grid: { display: false },
      },
      y: {
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  };
  /* -------- DATA PROCESSORS -------- */
  const processMessExpenseData = (data, year) => {
    const labels = [];
    const expenses = [];
    for (let i = 0; i < 12; i++) {
      const m = moment().year(year).month(i);
      const hit = data.find((d) => d.year === year && d.month === i + 1);
      labels.push(m.format('MMM'));
      expenses.push(hit ? Number(hit.total_amount) : 0);
    }
    setMessExpenseChartData({
      labels,
      datasets: [
        {
          label: `Mess Expense (₹) - ${year}`,
          data: expenses,
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderRadius: 8,
        },
      ],
    });
  };

  const processAttendanceData = (data, year) => {
    const labels = [];
    const present = [];
    const absent = [];
    const od = [];
    for (let i = 0; i < 12; i++) {
      const m = moment().year(year).month(i);
      const hit = data.find((d) => d.year === year && d.month === i + 1);
      labels.push(m.format('MMM'));
      if (hit) {
        present.push(
          Math.max(Number(hit.present_days || 0), Number(hit.totalManDays || 0))
        );
        absent.push(Number(hit.absent_days || 0));
        od.push(Number(hit.on_duty_days || 0));
      } else {
        present.push(0);
        absent.push(0);
        od.push(0);
      }
    }
    setAttendanceChartData({
      labels,
      datasets: [
        {
          label: 'Present',
          data: present,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
        },
        {
          label: 'Absent',
          data: absent,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
        },
        {
          label: 'On Duty',
          data: od,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
        },
      ],
    });
  };
  /* -------- FETCH BASIC DATA -------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await studentAPI.getProfile();
        setProfile(p.data.data);
        const date = moment().format('YYYY-MM-DD');
        const a = await studentAPI.getMyAttendance({ date });
        setAttendance(a.data.data?.[0] || null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  /* -------- FETCH CHART DATA (YEAR DEPENDENT) -------- */
  useEffect(() => {
    (async () => {
      setChartLoading(true);
      try {
        const mess = await studentAPI.getMonthlyMessExpensesChart();
        if (mess.data.success) processMessExpenseData(mess.data.data, selectedYear);
        const att = await studentAPI.getMonthlyAttendanceChart();
        if (att.data.success) processAttendanceData(att.data.data, selectedYear);
      } finally {
        setChartLoading(false);
      }
    })();
  }, [selectedYear]);
  /* -------- FETCH HEATMAP DATA (YEAR & MONTH DEPENDENT) -------- */
  useEffect(() => {
    (async () => {
      setHeatmapLoading(true);
      try {
        const from_date = moment(
          `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`
        ).format('YYYY-MM-DD');
        const to_date = moment(from_date).endOf('month').format('YYYY-MM-DD');
        const res = await studentAPI.getMyAttendance({ from_date, to_date });
        setAttendanceHeatmapData(res.data.data || []);
      } finally {
        setHeatmapLoading(false);
      }
    })();
  }, [selectedYear, selectedMonth]);
  /* -------- ATTENDANCE STATUS -------- */
  const statusMap = {
    P: { text: 'Present', icon: <CheckCircleOutlined className="text-green-600 text-2xl" />, bg: 'bg-green-50 ring-green-200' },
    A: { text: 'Absent', icon: <CloseCircleOutlined className="text-red-600 text-2xl" />, bg: 'bg-red-50 ring-red-200' },
    OD: { text: 'On Duty', icon: <ClockCircleOutlined className="text-blue-600 text-2xl" />, bg: 'bg-blue-50 ring-blue-200' },
  };
  const status = attendance ? statusMap[attendance.status] : null;
  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />;
  }
  /* -------------------- RENDER -------------------- */
  const days = generateCalendarDays(selectedYear, selectedMonth, attendanceHeatmapData);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Overview of your hostel activity</p>
      </div>
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Today" value={status?.text || 'Not Marked'} icon={Calendar} color="blue" />
        <Stat label="Hostel" value={profile?.Hostel?.name || '-'} icon={Home} color="green" />
        <Stat label="Room" value={profile?.tbl_RoomAllotments?.[0]?.HostelRoom?.room_number || '-'} icon={Bed} color="purple" />
      </div> */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Today's Attendance" icon={Calendar} accent="blue">
            <div className={`flex gap-4 rounded-xl p-4 ring-1 ${status?.bg}`}>
              {status?.icon}
              <div>
                <div className="font-medium">{status?.text}</div>
                <div className="text-xs text-gray-500">
                  {attendance?.date ? moment(attendance.date).format('LL') : '—'}
                </div>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setCurrentView('submit-complaint')}
              className="flex flex-col items-center p-4 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-6 h-6 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700 text-center">Register Complaint</span>
            </button>
            <button
              onClick={() => setCurrentView('apply-leave')}
              className="flex flex-col items-center p-4 rounded-xl bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
            >
              <Calendar className="w-6 h-6 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-700 text-center">Apply Leave</span>
            </button>
            <button
              onClick={() => setCurrentView('day-reduction')}
              className="flex flex-col items-center p-4 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              <Clock className="w-6 h-6 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-700 text-center">Apply Day Reduction</span>
            </button>
            <button
              onClick={() => setCurrentView('food-order')}
              className="flex flex-col items-center p-4 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
            >
              <Utensils className="w-6 h-6 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-700 text-center">Order Food</span>
            </button>
          </div>
          <Card
            title="Mess Expense Trend"
            icon={CreditCard}
            accent="red"
            right={
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-lg border px-2 py-1 text-sm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            }
          >
            <div className="h-[32rem]">   
              {chartLoading ? (
                <div className="h-full animate-pulse rounded-xl bg-gray-100" />
              ) : (
                <Bar data={messExpenseChartData} options={chartOptions} />
              )}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card
            title="Attendance Overview"
            icon={Calendar}
            accent="green"
          >
            <div className="h-72">
              {chartLoading
                ? <div className="h-full animate-pulse rounded-xl bg-gray-100" />
                : <Bar data={attendanceChartData} options={chartOptions} />
              }
            </div>
          </Card>
          <Card
            title="Attendance Heatmap"
            icon={Calendar}
            accent="yellow"
            right={
              <div className="flex flex-col gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-lg border px-2 py-1 text-sm"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="rounded-lg border px-2 py-1 text-sm"
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <div className="h-90 overflow-hidden">
              {heatmapLoading ? (
                <div className="h-full animate-pulse rounded-xl bg-gray-100" />
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-2 text-xs">
                    {[ 'S','M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                      <div key={day} className="text-center font-medium text-gray-500 py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'aspect-square rounded-lg p-1 text-center text-xs border border-gray-200',
                          !day.isCurrentMonth && 'bg-gray-50 text-gray-300',
                          day.status === 'P' && 'bg-green-500 border-green-100 text-green-800',
                          day.status === 'A' && 'bg-red-500 border-red-100 text-red-800',
                          day.status === 'OD' && 'bg-blue-100 border-blue-200 text-blue-800',
                          day.isCurrentMonth && !day.status && 'bg-yellow-50 border-yellow-200 text-yellow-600'
                        )}
                      >
                        <div className="font-medium">{day.date.date()}</div>
                        {day.status && <div className="text-[10px] uppercase">{day.status}</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;