export function generateRoomNumbers({ prefix = '', start_number, end_number, number_width = 0 }) {
  if (typeof prefix !== 'string' || prefix.trim().length > 64 || /[\x00-\x1f\x7f]/.test(prefix)) {
    throw new Error('Prefix must be text of at most 64 characters without control characters.');
  }
  const integer = (value, label) => {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean' || !/^\d+$/.test(String(value))) {
      throw new Error(`${label} must be a non-negative whole number.`);
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number)) throw new Error(`${label} is too large.`);
    return number;
  };
  const start = integer(start_number, 'Start number');
  const end = integer(end_number, 'End number');
  const width = integer(number_width, 'Number width');
  if (end < start) throw new Error('End number must be greater than or equal to start number.');
  if (end - start + 1 > 500) throw new Error('Create at most 500 rooms per submission.');
  if (width > 10) throw new Error('Number width must be between 0 and 10.');
  return Array.from({ length: end - start + 1 }, (_, index) => `${prefix.trim()}${String(start + index).padStart(width, '0')}`);
}

export function resolveRoomHostel(body, user, isAdmin) {
  const id = Number(isAdmin ? body.hostel_id : (user?.hostelId || user?.hostel_id));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(isAdmin ? 'Select a valid hostel.' : 'No hostel is assigned to this warden.');
  return id;
}

export async function prepareBulkRooms(body, hostelId, models, transaction) {
  const numbers = generateRoomNumbers(body);
  const floor = Number(body.floor);
  if (body.floor === '' || body.floor == null || !Number.isInteger(floor) || floor < 0 || typeof body.floor === 'boolean') {
    throw new Error('Floor must be a non-negative whole number.');
  }
  const hostel = await models.Hostel.findByPk(hostelId, {
    transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {})
  });
  if (!hostel) throw new Error('Hostel does not exist.');
  const typeId = Number(body.room_type_id);
  if (!Number.isSafeInteger(typeId) || typeId <= 0) throw new Error('Select a valid room type.');
  const type = await models.RoomType.findOne({ where: { id: typeId, hostel_id: hostelId, is_active: true }, transaction });
  if (!type) throw new Error('Room type does not belong to this hostel.');
  // Deleted rooms are inactive and can be created again; only active rooms are duplicates.
  const existing = await models.HostelRoom.findAll({ where: { hostel_id: hostelId, is_active: true }, attributes: ['room_number'], transaction });
  const occupiedNames = new Set(existing.map(room => String(room.room_number).trim().toLowerCase()));
  const rooms = numbers.map(room_number => ({ room_number, exists: occupiedNames.has(room_number.toLowerCase()) }));
  return { hostel_id: hostelId, hostel_name: hostel.name, room_type_id: typeId, room_type_name: type.name,
    capacity: type.capacity, floor, rooms, total: rooms.length,
    to_create: rooms.filter(room => !room.exists).length, skipped: rooms.filter(room => room.exists).length };
}

export async function saveBulkRooms(body, hostelId, models) {
  return models.sequelize.transaction(async transaction => {
    const preview = await prepareBulkRooms(body, hostelId, models, transaction);
    const records = preview.rooms.filter(room => !room.exists).map(({ room_number }) => ({
      hostel_id: hostelId, room_type_id: preview.room_type_id, floor: preview.floor,
      room_number, is_active: true, occupancy_count: 0, is_occupied: false
    }));
    if (records.length) {
      const inactive = await models.HostelRoom.findAll({
        where: { hostel_id: hostelId, is_active: false },
        order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE
      });
      const deletedByNumber = new Map();
      for (const room of inactive) {
        const key = String(room.room_number).trim().toLowerCase();
        if (!deletedByNumber.has(key)) deletedByNumber.set(key, room);
      }
      const newRecords = [];
      for (const record of records) {
        const deleted = deletedByNumber.get(record.room_number.toLowerCase());
        if (!deleted) {
          newRecords.push(record);
          continue;
        }
        const occupants = await models.RoomAllotment.count({
          where: { room_id: deleted.id, is_active: true }, transaction
        });
        if (occupants > 0 || Number(deleted.occupancy_count) > 0 || deleted.is_occupied) {
          throw new Error(`Deleted room ${record.room_number} still has occupants. Resolve its allotments before recreating it.`);
        }
        // Keep the room ID and past allotments, but use the newly selected settings.
        await deleted.update({ ...record, layout_slot: null }, { transaction });
      }
      if (newRecords.length) await models.HostelRoom.bulkCreate(newRecords, { transaction, validate: true });
    }
    return { ...preview, created: records.length };
  });
}

export async function deleteSelectedRooms(body, hostelId, models) {
  const ids = body.room_ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || ids.some(id => !Number.isSafeInteger(Number(id)) || Number(id) <= 0 || typeof id === 'boolean')) {
    throw new Error('Select between 1 and 500 valid rooms to delete.');
  }
  const uniqueIds = [...new Set(ids.map(Number))];
  return models.sequelize.transaction(async transaction => {
    await models.Hostel.findByPk(hostelId, { transaction, lock: transaction.LOCK.UPDATE });
    const rooms = [];
    // A stable lock order also prevents simultaneous deletions from deadlocking.
    for (const id of uniqueIds.sort((a, b) => a - b)) {
      const room = await models.HostelRoom.findOne({ where: { id, hostel_id: hostelId, is_active: true }, transaction, lock: transaction.LOCK.UPDATE });
      if (!room) throw new Error('A selected room was removed or does not belong to this hostel. Refresh the list.');
      const occupants = await models.RoomAllotment.count({ where: { room_id: id, is_active: true }, transaction });
      if (occupants > 0 || Number(room.occupancy_count) > 0 || room.is_occupied) {
        throw new Error(`Room ${room.room_number} has occupants and cannot be deleted.`);
      }
      rooms.push(room);
    }
    for (const room of rooms) await room.update({ is_active: false }, { transaction });
    return { deleted: rooms.length };
  });
}
