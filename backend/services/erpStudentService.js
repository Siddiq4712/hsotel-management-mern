import { RoomAllotment, HostelRoom } from '../models/index.js';

const ERP_API_URL = process.env.ERP_STUDENTS_API_URL || 'https://erp.nec.edu.in/institute_management_system/students';

/**
 * Fetches students directly from the ERP API without inserting into local database.
 * Filters by hostel gender: "gents" -> male students, "ladies" -> female students.
 * Includes all students without restricting to any specific department/course like CSE.
 * Merges local room allotment information in-memory.
 */
export const fetchStudentsFromERP = async ({ 
  authHeader, 
  hostellersOnly = true, 
  hostelName = '', 
  enrollmentYear = null 
} = {}) => {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(ERP_API_URL, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      console.warn(`[ERP Student Service] Remote ERP API responded with status ${response.status}`);
      return [];
    }

    const json = await response.json();
    const rawStudents = Array.isArray(json) ? json : (json.data || []);

    // 1. Filter hosteller students if requested
    let filtered = rawStudents;
    if (hostellersOnly) {
      filtered = rawStudents.filter((s) => {
        const type = s.student_type || s.studentType || '';
        return type.trim().toLowerCase() === 'hosteller';
      });
    }

    // 2. Gender filtering based on hostel name:
    // If hostel name contains "gent" or "gents" -> Male students only
    // Otherwise -> Ladies hostel -> Female students only
    if (hostelName) {
      const lowerHostel = hostelName.toLowerCase();
      const isGentsHostel = lowerHostel.includes('gent') || lowerHostel.includes('boy') || lowerHostel.includes('men');

      if (isGentsHostel) {
        filtered = filtered.filter((s) => {
          const g = String(s.gender || s.Gender || s.sex || s.student_gender || '').trim().toLowerCase();
          return g === 'male' || g === 'm' || g.startsWith('m');
        });
      } else {
        // Does not contain gents/gent -> Ladies hostel -> Female students only
        filtered = filtered.filter((s) => {
          const g = String(s.gender || s.Gender || s.sex || s.student_gender || '').trim().toLowerCase();
          return g === 'female' || g === 'f' || g.startsWith('f');
        });
      }
    }

    // Optional year/course filtering only if explicitly provided (otherwise shows all departments)
    if (enrollmentYear && enrollmentYear !== 'all') {
      const yearFilter = enrollmentYear.trim().toLowerCase();
      filtered = filtered.filter((s) => {
        const course = (s.course || s.department || s.session || '').toLowerCase();
        return course.includes(yearFilter);
      });
    }

    // 3. Fetch active room allotments in-memory to augment room info
    let activeAllotments = [];
    try {
      activeAllotments = await RoomAllotment.findAll({
        where: { is_active: true },
        include: [{ model: HostelRoom, attributes: ['id', 'room_number'] }]
      });
    } catch (dbErr) {
      console.warn('[ERP Student Service] Could not fetch room allotments:', dbErr.message);
    }

    const allotmentMap = new Map();
    activeAllotments.forEach((a) => {
      const plain = a.get({ plain: true });
      const room = plain.HostelRoom || plain.tbl_HostelRoom;
      if (plain.student_id) allotmentMap.set(String(plain.student_id), room);
      if (plain.roll_number) allotmentMap.set(String(plain.roll_number).trim().toUpperCase(), room);
    });

    // 4. Format students to match application schema across all departments
    const formattedStudents = filtered.map((s) => {
      const roll = String(s.registerNumber || s.roll_number || s.roll || '').trim();
      const name = String(s.username || s.userName || s.name || '').trim();
      const email = String(s.email || s.userMail || '').trim();
      const course = String(s.course || s.department || s.session || 'N/A').trim();
      const gender = String(s.gender || s.Gender || s.sex || s.student_gender || 'N/A').trim();
      const studentId = s.id || s.userId || roll;

      const activeRoom = allotmentMap.get(String(studentId)) || allotmentMap.get(roll.toUpperCase()) || null;
      const batchName = String(s.batch || s.batch_year || s.academic_year || s.academicYear || s.batchYear || s.session || course || '').trim();

      return {
        id: studentId,
        userId: studentId,
        userName: name,
        username: name,
        roll_number: roll,
        registerNumber: roll,
        userMail: email,
        email: email,
        session: course,
        course: course,
        batch: batchName,
        batch_year: String(s.batch_year || s.batch || '').trim(),
        enrollment_year: course,
        gender: gender,
        session_id: s.session_id || null,
        college: s.college || 'NEC',
        student_type: s.student_type || s.studentType || 'Hosteller',
        studentType: s.student_type || s.studentType || 'Hosteller',
        room_number: activeRoom ? activeRoom.room_number : null,
        tbl_RoomAllotments: activeRoom ? [
          {
            is_active: true,
            HostelRoom: activeRoom,
            tbl_HostelRoom: activeRoom
          }
        ] : [],
        raw: s
      };
    });

    return formattedStudents;
  } catch (error) {
    console.error('[ERP Student Service] Error connecting to ERP API:', error.message);
    return [];
  }
};
