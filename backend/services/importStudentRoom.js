// Runs inside the student's enrollment transaction so a failed room match rolls back the row.
export async function importStudentRoom({ studentId, hostelId, roomNumber, transaction, HostelRoom, RoomType, RoomAllotment }) {
  const number = String(roomNumber ?? '').trim();
  if (!number) return;

  const room = await HostelRoom.findOne({
    where: { hostel_id: hostelId, room_number: number, is_active: true },
    include: [{ model: RoomType, attributes: ['capacity'] }],
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  if (!room) throw new Error(`Room ${number} is not an active room in the assigned hostel.`);

  const existing = await RoomAllotment.findOne({
    where: { student_id: studentId, is_active: true }, transaction
  });
  if (existing) {
    if (Number(existing.room_id) === Number(room.id)) return;
    throw new Error('Student already has a different active room allotment. Change it through room management.');
  }

  const capacity = Number(room.RoomType?.capacity);
  const occupants = await RoomAllotment.count({ where: { room_id: room.id, is_active: true }, transaction });
  if (!(capacity > 0) || Math.max(occupants, Number(room.occupancy_count) || 0) >= capacity) {
    throw new Error(`Room ${number} has no available capacity.`);
  }
  await RoomAllotment.create({ student_id: studentId, room_id: room.id, is_active: true }, { transaction });
  await room.update({ occupancy_count: occupants + 1 }, { transaction });
}
