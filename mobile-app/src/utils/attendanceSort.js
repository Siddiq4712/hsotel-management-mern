const roomNumber = student => String(student.room_number ?? '').trim();
const compareNames = (a, b) => String(a.userName || a.username || '').localeCompare(String(b.userName || b.username || ''));

// Sort a copy so the original roster and student-keyed attendance drafts stay intact.
export function sortAttendanceStudents(students, sortBy) {
  const ordered = [...students];
  if (sortBy === 'name') return ordered.sort(compareNames);
  return ordered.sort((a, b) => {
    const roomA = roomNumber(a), roomB = roomNumber(b);
    if (!roomA || !roomB) return roomA ? -1 : roomB ? 1 : compareNames(a, b);
    const comparison = roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
    return (sortBy === 'room_desc' ? -comparison : comparison) || compareNames(a, b);
  });
}
