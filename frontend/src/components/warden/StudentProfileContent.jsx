import React, { useEffect, useState } from 'react';
import { Avatar, Skeleton, Tag } from 'antd';
import { User } from 'lucide-react';
import moment from 'moment';
import { wardenAPI } from '../../services/api';
import StudentAttendanceChart, { StudentAttendanceSummary, useStudentAttendance } from './StudentAttendanceChart';
import './StudentProfileContent.css';

const hasValue = value => typeof value === 'number' || (typeof value === 'string' && Boolean(value.trim()) && !/^(N\/?A|Not Set|Unknown|—|-)$/i.test(value.trim()));
const formatDate = value => value && moment(value).isValid() ? moment(value).format('DD MMM YYYY') : null;
const dateRange = (start, end) => [formatDate(start), formatDate(end)].filter(Boolean).join(' – ');
const labelWord = value => value?.replaceAll('_', ' ').replace(/^./, character => character.toUpperCase());
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const activityCounts = [
  ['Pending leaves', 'pendingLeaves'], ['Pending gate passes', 'pendingGatePasses'],
  ['Open complaints', 'openComplaints'], ['Pending room requests', 'pendingRoomRequests'],
  ['Late gate-pass returns this month', 'lateReturnsThisMonth'],
];

function daysSince(value) {
  if (!formatDate(value)) return null;
  const days = moment().utcOffset(330).startOf('day').diff(moment(value).utcOffset(330).startOf('day'), 'days');
  return days >= 0 ? days : null;
}

const recordGroups = [
  ['leaves', 'Recent leaves', row => [labelWord(row.leave_type), dateRange(row.from_date, row.to_date)]],
  ['outpasses', 'Recent gate passes', row => [row.destination, dateRange(row.from_date, row.to_date),
    row.return_time ? `Returned ${moment(row.return_time).format('DD MMM, h:mm A')}`
      : row.exit_time ? `Exited ${moment(row.exit_time).format('DD MMM, h:mm A')}` : null]],
  ['suspensions', 'Recent suspensions', row => [dateRange(row.start_date, row.end_date)]],
  ['complaints', 'Recent complaints', row => [row.subject, formatDate(row.createdAt)]],
  ['roomRequests', 'Recent room requests', row => [formatDate(row.requested_at)]],
  ['rebates', 'Recent approved rebates', row => [`${labelWord(row.rebate_type)} · ${inr.format(row.amount)}`, dateRange(row.from_date, row.to_date)]],
];

function ProfileFacts({ title, entries, children }) {
  const recorded = entries.filter(([, value]) => hasValue(value));
  if (!recorded.length && !children) return null;
  return <section className="warden-panel warden-panel-padded">
    <h4 className="warden-table-title">{title}</h4>
    <dl className="warden-profile-facts">
      {recorded.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    {children}
  </section>;
}

function ProfileFees({ activity }) {
  const bill = activity?.messBills?.[0];
  const fees = activity?.fees;
  const hostelCharges = fees?.hostelCharges ?? [];
  const messCharges = fees?.messCharges ?? [];
  const annualRate = Number(fees?.annualHostelRate);
  const billDetails = [
    ['Mess bill amount · this month', bill && inr.format(bill.amount)],
    ['Mess bill status', labelWord(bill?.status)], ['Mess bill due date', formatDate(bill?.due_date)],
  ];
  return <ProfileFacts title="Fees" entries={[
    ['Hostel annual rate', annualRate > 0 ? inr.format(annualRate) : null],
    ...hostelCharges.map(fee => [`${fee.fee_type === 'security' ? 'Security deposit' : 'Hostel fees'} · ${labelWord(fee.status)}`, inr.format(fee.amount)]),
    ...billDetails,
  ]}>
    {messCharges.length > 0 && <details className="warden-profile-activity">
      <summary>Recorded mess charges this month</summary>
      {bill && <p className="warden-record-meta">These charges may already be included in the saved mess bill.</p>}
      <dl className="warden-profile-facts">
        {messCharges.map(charge => <div key={`${charge.fee_type}:${charge.status}`}>
          <dt>{labelWord(charge.fee_type)} · {labelWord(charge.status)}</dt><dd>{inr.format(charge.amount)}</dd>
        </div>)}
      </dl>
    </details>}
  </ProfileFacts>;
}

function Roommates({ roomId, studentId }) {
  const [roommates, setRoommates] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    wardenAPI.getRoomOccupants(roomId)
      .then(({ data }) => {
        if (active) setRoommates((data.data || []).filter(mate => String(mate.userId ?? mate.id) !== String(studentId)));
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [roomId, studentId]);

  if (roommates?.length === 0) return null;
  return <section className="warden-panel warden-panel-padded">
    <h4 className="warden-table-title">Current roommates</h4>
    {failed ? <p className="warden-record-meta">Could not load roommates.</p> : !roommates ? <Skeleton active title={false} paragraph={{ rows: 2 }} />
      : <ul className="warden-profile-roommates">
        {roommates.map(mate => <li key={mate.userId ?? mate.id}>
          <strong>{mate.userName || mate.username}</strong>
          {hasValue(mate.roll_number) && <span>{mate.roll_number}</span>}
        </li>)}
      </ul>}
  </section>;
}

export default function StudentProfileContent({ student, hostelName }) {
  const studentId = student.userId ?? student.id;
  const attendanceState = useStudentAttendance(studentId);
  const [activity, setActivity] = useState(null);
  const [activityError, setActivityError] = useState(false);
  useEffect(() => {
    if (studentId == null) return;
    const controller = new AbortController();
    wardenAPI.getStudentProfileRecords(studentId, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setActivity(data.data); })
      .catch(() => { if (!controller.signal.aborted) setActivityError(true); });
    return () => controller.abort();
  }, [studentId]);
  const name = student.userName || student.username;
  const rollNumber = student.roll_number || student.registerNumber;
  const enrollment = student.tbl_Enrollment?.find(entry => entry.status === 'active') || student.tbl_Enrollment?.[0];
  const allotment = student.tbl_RoomAllotments?.find(entry => entry.is_active);
  const room = allotment?.HostelRoom || allotment?.tbl_HostelRoom;
  const roomId = room?.id ?? allotment?.room_id;
  const roomNumber = room?.room_number ?? student.room_number;
  const email = [student.email, student.userMail].find(hasValue);
  const photo = student.profile_picture && student.profile_picture !== '/uploads/default.jpg' ? student.profile_picture : undefined;
  const accountStatus = typeof student.status === 'boolean' ? (student.status ? 'Active' : 'Inactive') : null;
  const unassigned = Array.isArray(student.tbl_RoomAllotments) && !allotment && !hasValue(roomNumber);
  const metrics = activity?.metrics;
  const outside = metrics?.currentGatePass;
  const currentLeave = metrics?.currentLeave;
  const currentSuspension = metrics?.currentSuspension;
  const groups = recordGroups.filter(([key]) => activity?.[key]?.length);

  return <div className="warden-profile-grid">
    <div className="warden-profile-column">
      <header className="warden-profile-identity">
        <Avatar size={70} shape="square" src={photo} alt={photo ? `${name} photo` : undefined} icon={<User size={30} aria-hidden="true" />} />
        <div><h3>{name}</h3>{hasValue(rollNumber) && <p>{rollNumber}</p>}</div>
      </header>
      {studentId != null && <StudentAttendanceChart {...attendanceState} />}
    </div>
    <div className="warden-profile-column warden-profile-details" role="region" aria-label="Student profile details" tabIndex={0}>
      <ProfileFacts title="Quick facts" entries={[
        ['Hostel', hostelName], ['Room', roomNumber], ['Floor', room?.floor],
        ['Room type', room?.RoomType?.name || room?.tbl_RoomType?.name],
        ['Resident type', student.resident_type === 'staff' ? 'Staff resident' : student.student_type || student.studentType || (student.resident_type === 'student' ? 'Student' : null)],
        ['Course', student.course], ['Batch', [enrollment?.Session?.name, student.session, student.enrollment_year].find(hasValue)],
        ['College', ({ nec: 'National Engineering College', lapc: 'LAPC' })[enrollment?.college || student.college]],
        ['Enrollment date', formatDate(enrollment?.enrollment_date)], ['Current room assigned', formatDate(allotment?.allotment_date)],
        ['Days in current room', daysSince(allotment?.allotment_date)],
      ]} />
      <ProfileFees activity={activity} />
      <StudentAttendanceSummary attendance={attendanceState.attendance} />
      <ProfileFacts title="This month’s mess records" entries={[
        ['Approved reduction days', metrics?.approvedReductionDaysThisMonth],
      ]} />
      <ProfileFacts title="Contact" entries={[
        ['Email', email], ['Phone', student.phone_number || student.phone],
      ]} />
      {roomId != null && <Roommates roomId={roomId} studentId={studentId} />}
      {(accountStatus || unassigned || enrollment?.status === 'suspended' || outside || currentLeave || currentSuspension) && <section className="warden-panel warden-panel-padded">
        <h4 className="warden-table-title">Status</h4>
        <div className="warden-profile-status">
          {accountStatus && <Tag color={student.status ? 'success' : 'default'}>Account {accountStatus.toLowerCase()}</Tag>}
          {unassigned && <Tag color="warning">No room assigned</Tag>}
          {enrollment?.status === 'suspended' && <Tag color="error">Enrollment suspended</Tag>}
          {outside && <Tag color="warning">Outside on gate pass</Tag>}
          {currentLeave && <Tag color="blue">On approved leave</Tag>}
          {currentSuspension && <Tag color="error">Active suspension</Tag>}
        </div>
        {outside?.to_date && <p className="warden-record-meta">Expected return {moment(outside.to_date).format('DD MMM YYYY, h:mm A')}</p>}
        {currentLeave?.to_date && <p className="warden-record-meta">Leave through {formatDate(currentLeave.to_date)}</p>}
        {currentSuspension?.end_date && <p className="warden-record-meta">Suspension through {formatDate(currentSuspension.end_date)}</p>}
      </section>}
      <ProfileFacts title="Activity at a glance" entries={activityCounts.map(([label, key]) => [label, metrics?.[key]])} />
      {activityError ? <p role="status" className="warden-record-meta">Could not load recent student activity.</p>
        : groups.length > 0 && <section className="warden-panel warden-panel-padded">
          <h4 className="warden-table-title">Recent activity</h4>
          {groups.map(([key, label, getValues]) => <details key={key} className="warden-profile-activity">
            <summary>{label}</summary>
            <ul className="warden-profile-roommates">
              {activity[key].map(row => <li key={row.id}>
                <div>{getValues(row).filter(hasValue).map(value => <div key={value}>{value}</div>)}</div>
                {row.status && <Tag>{labelWord(row.status)}</Tag>}
              </li>)}
            </ul>
          </details>)}
        </section>}
    </div>
  </div>;
}
