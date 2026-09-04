import React from 'react';
import { useNavigate } from 'react-router-dom';
import { setContext } from '../../../services/contextManager';

const STATUS_CONFIG = {
  inside:   { emoji: '🟢', label: 'Inside Hostel' },
  outside:  { emoji: '🔵', label: 'Outside Hostel' },
  suspended:{ emoji: '🔴', label: 'Suspended' },
  leave:    { emoji: '🟡', label: 'On Leave' },
};

const getStatusConfig = (status) => {
  if (!status) return STATUS_CONFIG.inside;
  const s = String(status).toLowerCase();
  if (s.includes('outside') || s === 'out') return STATUS_CONFIG.outside;
  if (s.includes('suspend')) return STATUS_CONFIG.suspended;
  if (s.includes('leave')) return STATUS_CONFIG.leave;
  return STATUS_CONFIG.inside;
};

const ACTION_BUTTONS = [
  { label: '📊 Attendance', topic: 'attendance', path: '/attendance' },
  { label: '📋 Complaints', topic: 'complaint', path: '/complaints' },
  { label: '🚪 Gate Pass', topic: 'gatepass', path: '/outpass-approval' },
  { label: '🏠 Room',       topic: 'room',       path: '/room-allotment' },
  { label: '💰 Fees',       topic: 'fee',        path: '/fees' },
  { label: '📞 Contact',    topic: 'contact',    path: '/students' },
];

const InfoField = ({ label, value }) => {
  if (!value || value === '--' || value === 'N/A' || value === 'Unknown') return null;
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-sm font-semibold text-slate-500 mb-1">{label}</p>
      <p className="text-base font-medium text-slate-900 break-words whitespace-normal overflow-wrap-anywhere">
        {value}
      </p>
    </div>
  );
};

const StudentProfileCard = ({ student, onFollowUp, embedded }) => {
  const navigate = useNavigate();
  if (!student) return null;

  const statusCfg = getStatusConfig(student.status);

  const handleAction = (topic, path) => {
    setContext('lastTopic', topic);
    if (onFollowUp) {
      onFollowUp(topic);
    } else {
      navigate(path);
    }
  };

  const name = student.name || student.username || student.userName || student.student_name;
  const rollNumber = student.rollNumber || student.roll_number || student.registerNumber;
  const roomFormatted = student.room ? `${student.block ? student.block + '-' : ''}${student.room}` : null;

  return (
    <div className={`font-sans ${embedded ? '' : 'mt-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm'}`}>
      {!embedded && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">👤</span>
            <h3 className="text-lg font-bold text-slate-800">Student Found</h3>
          </div>
          <hr className="border-slate-100 mb-4" />
        </>
      )}

      <div className="mb-4">
        <p className="text-base font-semibold text-slate-700">
          {statusCfg.emoji} {statusCfg.label}
        </p>
      </div>

      <InfoField label="Name" value={name} />
      <InfoField label="Roll Number" value={rollNumber} />
      <InfoField label="Department" value={student.department} />
      <InfoField label="Year" value={student.year} />
      <InfoField label="Room" value={roomFormatted} />
      <InfoField label="Phone" value={student.phone} />
      
      {/* Dynamic Stats if present from backend */}
      <InfoField label="Attendance" value={student.attendance_percentage ? `${student.attendance_percentage}%` : null} />
      <InfoField label="Pending Complaints" value={student.pending_complaints} />
      <InfoField label="Pending Gate Pass" value={student.pending_gatepass} />
      <InfoField label="Pending Fees" value={student.pending_fees ? `₹${student.pending_fees}` : null} />
      <InfoField label="Current Leave" value={student.current_leave} />
      <InfoField label="Current Outpass" value={student.current_outpass} />

      <hr className="border-slate-100 my-4" />

      <div>
        <p className="text-sm font-bold text-slate-800 mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {ACTION_BUTTONS.map(btn => (
            <button
              key={btn.topic}
              onClick={() => handleAction(btn.topic, btn.path)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentProfileCard;
