export async function archiveRoomTemplate(id, hostelId, models) {
  return models.sequelize.transaction(async transaction => {
    await models.Hostel.findByPk(hostelId, { transaction, lock: transaction.LOCK.UPDATE });
    const template = await models.RoomType.findOne({
      where: { id, hostel_id: hostelId, is_active: true }, transaction, lock: transaction.LOCK.UPDATE
    });
    if (!template) throw Object.assign(new Error('Room template not found'), { status: 404 });
    const activeRooms = await models.HostelRoom.count({
      where: { room_type_id: id, is_active: true }, transaction
    });
    if (activeRooms) throw Object.assign(new Error('Cannot delete this template because active rooms still use it.'), { status: 400 });
    // Keep the row for inactive rooms and historical allotments that reference it.
    await template.update({ is_active: false }, { transaction });
  });
}
