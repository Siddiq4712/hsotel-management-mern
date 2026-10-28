export const roomHasOccupants = room => Boolean(room.is_occupied) || Number(room.occupancy_count) > 0;

export function filterRooms(rooms, filters) {
  return rooms.filter(room => {
    if (room.is_active === false) return false;
    const number = String(room.room_number ?? '');
    if (filters.search && !number.toLowerCase().includes(filters.search.trim().toLowerCase())) return false;
    if (filters.prefix && !number.toLowerCase().startsWith(filters.prefix.trim().toLowerCase())) return false;
    if (filters.hostel && Number(room.hostel_id) !== Number(filters.hostel)) return false;
    if (filters.floor !== undefined && (room.floor == null || Number(room.floor) !== Number(filters.floor))) return false;
    if (filters.type && Number(room.room_type_id) !== Number(filters.type)) return false;
    if (filters.occupancy === 'empty' && roomHasOccupants(room)) return false;
    if (filters.occupancy === 'occupied' && !roomHasOccupants(room)) return false;
    if (filters.from != null || filters.to != null) {
      const suffix = number.match(/(\d+)$/);
      if (!suffix) return false;
      const numeric = Number(suffix[1]);
      if (filters.from != null && numeric < filters.from) return false;
      if (filters.to != null && numeric > filters.to) return false;
    }
    return true;
  }).sort((a, b) => String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true }));
}
