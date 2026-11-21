import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Checkbox, Empty, Input, Modal, Progress, Select, Skeleton } from 'antd';
import { ArrowRight, DoorOpen, RefreshCw, Search, Users } from 'lucide-react';
import { PermissionButton as Button } from '../common/PermissionControls';
import WorkspaceContextHeader from '../common/WorkspaceContextHeader';
import { useScopeDraft } from '../common/WorkspaceScope';
import { useWardenHostelName } from './WardenWorkspace';
import { wardenAPI } from '../../services/api';
import './RoomAllotment.css';

function RoomAllotment() {
  const { message } = App.useApp();
  const hostelName = useWardenHostelName();
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [studentIds, setStudentIds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadError, setLoadError] = useState('');
  const request = useRef(0);
  useScopeDraft(studentIds.length > 0, saving);

  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setLoadError('');
    try {
      const [studentRes, roomRes] = await Promise.all([wardenAPI.getStudents(), wardenAPI.getAvailableRooms()]);
      if (current !== request.current) return;

      const waiting = (studentRes.data.data || []).filter(student =>
        !student.tbl_RoomAllotments?.some(allotment => allotment.is_active));
      const available = (roomRes.data.data || []).map(room => {
        const occupied = Number(room.occupancy_count) || 0;
        const capacity = Number(room.RoomType?.capacity) || 0;
        return { ...room, occupied, capacity, spacesLeft: Math.max(0, capacity - occupied) };
      });
      const waitingIds = new Set(waiting.map(student => student.userId));
      setStudents(waiting);
      setRooms(available);
      setStudentIds(previous => previous.filter(id => waitingIds.has(id)));
    } catch {
      if (current === request.current) setLoadError('Could not load the room allotment board.');
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => { request.current++; };
  }, [refresh]);

  const room = rooms.find(item => item.id === roomId);
  const roomLabel = room ? `Room ${room.room_number}` : '';
  const query = search.trim().toLowerCase();
  const visibleStudents = students.filter(student => [student.userName, student.roll_number].join(' ').toLowerCase().includes(query));
  const selectedCount = studentIds.length;
  const canSelect = Boolean(room?.spacesLeft) && !loading && !loadError && !saving;
  const canAssign = canSelect && selectedCount > 0 && selectedCount <= room.spacesLeft;
  const percent = room?.capacity ? Math.min(100, Math.round(room.occupied / room.capacity * 100)) : 0;

  function selectRoom(value) {
    setRoomId(value);
    setStudentIds([]);
  }

  function toggleStudent(id) {
    setStudentIds(previous => previous.includes(id) ? previous.filter(value => value !== id)
      : previous.length < room.spacesLeft ? [...previous, id] : previous);
  }

  async function confirmAllotment() {
    if (!canAssign) return;
    setSaving(true);
    try {
      const results = await Promise.allSettled(studentIds.map(id => wardenAPI.allotRoom({ student_id: id, room_id: roomId })));
      const failed = studentIds.filter((_, index) => results[index].status === 'rejected');
      const saved = selectedCount - failed.length;
      if (saved === selectedCount) {
        message.success(saved === 1 ? 'Student assigned to the room.' : `${saved} students assigned to the room.`);
        setRoomId(null);
      } else if (saved) {
        message.warning(`Assigned ${saved} of ${selectedCount} students. Review the remaining selection.`);
      } else {
        message.error(results[0].reason?.response?.data?.message || 'Could not save the allotment.');
      }
      setStudentIds(failed);
      setConfirming(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  const roomOptions = rooms.map(item => ({
    value: item.id,
    disabled: item.spacesLeft <= 0,
    label: <span className="allotment-room-option">
      <span><DoorOpen size={16} aria-hidden="true" />Room {item.room_number}</span>
      <span className={`allotment-slot-badge${item.spacesLeft ? '' : ' is-full'}`}>
        {item.spacesLeft ? `${item.spacesLeft} ${item.spacesLeft === 1 ? 'slot' : 'slots'} available` : 'Full'}
      </span>
    </span>,
  }));

  return (
    <div className="module-page room-allotment-page">
      <WorkspaceContextHeader title="Room Allotment Board" headingAs="h1"
        description={hostelName ? `Select a room and assign students in ${hostelName}.` : 'Select a room and assign students.'}
        actions={<Button icon={<RefreshCw size={16} />} onClick={refresh} loading={loading} disabled={saving}>Refresh List</Button>} />

      {loadError && <Alert type="error" showIcon title={loadError} className="allotment-load-error" />}
      <div className="allotment-board">
        <div className="allotment-workflow">
          <section className="allotment-panel allotment-panel-body" aria-labelledby="allotment-room-heading">
            <h2 id="allotment-room-heading"><span className="allotment-step" aria-hidden="true">1</span>Room Selection</h2>
            <label className="allotment-label" htmlFor="allotment-target">Select target room</label>
            <Select id="allotment-target" aria-label="Target room" className="allotment-target"
              placeholder="Select a room" value={room?.id} onChange={selectRoom} options={roomOptions}
              disabled={loading || saving || Boolean(loadError)} loading={loading} notFoundContent="No rooms available" />
            {room && <div className="allotment-capacity">
              <div className="allotment-capacity-bar">
                <div><span>Room capacity status</span><strong>{percent}%</strong></div>
                <Progress aria-label="Room capacity status" percent={percent} showInfo={false} size={['100%', 6]} strokeColor="#3265ed" railColor="#dfe7f4" />
              </div>
              <dl><div><dt>Occupied</dt><dd>{room.occupied}</dd></div><div><dt>Total</dt><dd>{room.capacity}</dd></div></dl>
            </div>}
          </section>

          <section className="allotment-panel" aria-labelledby="allotment-students-heading">
            <div className="allotment-panel-body">
              <div className="allotment-students-heading">
                <h2 id="allotment-students-heading"><span className="allotment-step" aria-hidden="true">2</span>Assign Student Members</h2>
                <span className="allotment-count">{selectedCount} selected</span>
              </div>
              <Input aria-label="Search students for allotment" prefix={<Search size={15} aria-hidden="true" />}
                placeholder="Filter by name or roll number" value={search} onChange={event => setSearch(event.target.value)} allowClear />
              <p className="allotment-helper">{room
                ? room.spacesLeft ? `Select up to ${room.spacesLeft} ${room.spacesLeft === 1 ? 'student' : 'students'} for ${roomLabel}.` : `${roomLabel} is full.`
                : 'Select a room to start assigning students.'}</p>
              {loading && !students.length ? <Skeleton active paragraph={{ rows: 3 }} />
                : visibleStudents.length ? <div className="allotment-student-grid">
                  {visibleStudents.map(student => {
                    const checked = studentIds.includes(student.userId);
                    return <Checkbox key={student.userId} className="allotment-student" checked={checked}
                      disabled={!canSelect || (!checked && selectedCount >= room.spacesLeft)} onChange={() => toggleStudent(student.userId)}>
                      <span>{student.userName}</span><small>{student.roll_number || 'No roll number'}</small>
                    </Checkbox>;
                  })}
                </div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={query ? 'No students match your search.' : 'No students are waiting for a room.'} />}
            </div>
            <footer className="allotment-footer">
              <span role="status">{selectedCount} {selectedCount === 1 ? 'student' : 'students'} selected</span>
              <Button permissionAction="create" type="primary" icon={<ArrowRight size={16} />} disabled={!canAssign}
                onClick={() => setConfirming(true)}>{room ? `Assign to ${roomLabel}` : 'Assign students'}</Button>
            </footer>
          </section>
        </div>

        <aside className="allotment-panel allotment-waiting" aria-labelledby="allotment-waiting-heading">
          <h2 id="allotment-waiting-heading"><Users size={18} aria-hidden="true" />Waiting List</h2>
          <div className="allotment-panel-body">
            <div className="allotment-waiting-count"><span>Students without rooms</span><strong>{loading && !students.length || loadError ? '—' : students.length}</strong></div>
            {loading && !students.length ? <Skeleton active paragraph={{ rows: 3 }} />
              : students.length ? <ul className="allotment-waiting-list" aria-label="Students without rooms" tabIndex={0}>
                {students.map(student => <li key={student.userId}><span>{student.userName}</span><small>{student.roll_number}</small></li>)}
              </ul> : !loadError && <p className="allotment-helper">No students are waiting for a room.</p>}
          </div>
        </aside>
      </div>

      <Modal title="Confirm Room Allotment" open={confirming} centered width={680}
        onCancel={() => !saving && setConfirming(false)} mask={{ closable: !saving }} closable={!saving} keyboard={!saving}
        footer={<>
          <Button disabled={saving} onClick={() => setConfirming(false)}>Cancel</Button>
          <Button permissionAction="create" type="primary" loading={saving} disabled={!canAssign && !saving} onClick={confirmAllotment}>Confirm &amp; Save</Button>
        </>}>
        <p>Assign {selectedCount} {selectedCount === 1 ? 'student' : 'students'} to <strong>{roomLabel}</strong>?</p>
        <ul className="allotment-confirm-students">
          {students.filter(student => studentIds.includes(student.userId)).map(student => <li key={student.userId}>{student.userName}</li>)}
        </ul>
      </Modal>
    </div>
  );
}

export default RoomAllotment;
