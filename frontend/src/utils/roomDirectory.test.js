import { describe, expect, it } from 'vitest';
import { filterRooms, roomHasOccupants } from './roomDirectory';
const rooms = [
  { id: 1, room_number: 'S1', floor: 0, room_type_id: 2, hostel_id: 1, occupancy_count: 0 },
  { id: 2, room_number: 'S10', floor: 1, room_type_id: 2, hostel_id: 1, occupancy_count: 1 },
  { id: 3, room_number: 'S2', floor: 0, room_type_id: 3, hostel_id: 2, is_occupied: true },
  { id: 4, room_number: 'G1', floor: null, room_type_id: 3, hostel_id: 2, occupancy_count: 0 },
  { id: 5, room_number: 'S3', floor: 0, is_active: false },
  { id: 6, room_number: 'Office', floor: 2 }
];
describe('room directory filters', () => {
  it('combines a prefix and inclusive numeric suffix range', () => {
    expect(filterRooms(rooms, { prefix: 's', from: 1, to: 2 }).map(room => room.id)).toEqual([1, 3]);
  });
  it('combines hostel, floor, type and occupancy', () => {
    expect(filterRooms(rooms, { hostel: 1, floor: 0, type: 2, occupancy: 'empty' }).map(room => room.id)).toEqual([1]);
    expect(filterRooms(rooms, { occupancy: 'occupied' }).map(room => room.id)).toEqual([3, 2]);
  });
  it('searches without case sensitivity and naturally sorts room numbers', () => {
    expect(filterRooms(rooms, { search: 's' }).map(room => room.room_number)).toEqual(['S1', 'S2', 'S10']);
  });
  it('does not treat unassigned floors as ground floor or include inactive rooms', () => {
    expect(filterRooms(rooms, { floor: 0 }).map(room => room.id)).toEqual([1, 3]);
    expect(filterRooms(rooms, {}).some(room => room.id === 5)).toBe(false);
  });
  it('checks both occupancy count and flag', () => {
    expect(roomHasOccupants(rooms[1])).toBe(true);
    expect(roomHasOccupants(rooms[2])).toBe(true);
    expect(roomHasOccupants(rooms[0])).toBe(false);
  });
});
