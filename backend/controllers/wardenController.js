import { resolveStudentBatch, assertCanMove, listBatches, matchBatch } from '../services/batchAllocation.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import moment from 'moment';
import { getHistoricalBilling } from '../utils/historicalBilling.js';
import { 
  User, Enrollment, RoomAllotment, HostelRoom, RoomType, Session,
  Attendance, GPSAttendance, Leave, Complaint, Suspension, Holiday, Fee, MessBill, Hostel, RoomRequest,
  DayReductionRequest, Rebate, DailyRateLog, HostelLayout, AdditionalCollection, AdditionalCollectionType, Role, sequelize,
  Outpass
} from '../models/index.js';
import { fetchStudentsFromERP } from '../services/erpStudentService.js';

const getHostelId = (user) => {
  const hId = user?.hostelId || user?.hostel_id;
  return (hId && hId !== 0) ? hId : null;
};

const getStudentRoleIds = async (transaction = null) => {
  const roleRows = await Role.findAll({
    where: {
      [Op.or]: [
        { roleName: { [Op.like]: 'student' } },
        { roleName: { [Op.like]: 'lapc' } }
      ]
    },
    attributes: ['roleId'],
    transaction: transaction || undefined
  });
  return roleRows.map((r) => Number(r.roleId)).filter((id) => Number.isFinite(id));
};

// ==========================================
// STUDENT ENROLLMENT
// ==========================================
// 1. ENROLL STUDENT: This creates the login credentials in tbl_users
export const enrollStudent = async (req, res) => {
   const transaction = await sequelize.transaction();
   try {
      const { 
         userName: userNameRaw,
         username,
         email, 
         requires_bed, 
         paid_initial_emi,
         college,
         roll_number,
         password,
         create_with_default_password,
         student_type,
         studentType,
         type
      } = req.body;
      const userName = userNameRaw || username;

      const rawType = String(student_type || studentType || type || 'hosteller').trim().toLowerCase();
      if (rawType && rawType !== 'hosteller') {
         throw new Error("Only students with type 'hosteller' can be stored in the database.");
      }
      
      const normalizedRollNumber = String(roll_number || '').trim();
      const defaultDomain = String(college || 'nec').toLowerCase() === 'lapc' ? 'lapc.edu.in' : 'nec.edu.in';
      const generatedEmail = normalizedRollNumber ? `${normalizedRollNumber}@${defaultDomain}` : '';
      const normalizedEmail = String(email || generatedEmail).trim().toLowerCase();

      if (!userName) throw new Error("Student name is required.");
      if (!normalizedEmail) throw new Error("Email is required (or provide roll number for auto-email).");
      if (!normalizedRollNumber) throw new Error("Roll number is required.");

      // ERP admission year is authoritative; roll numbers never determine the batch.
      const matchedBatch = await resolveStudentBatch(req.body.erp_batch_year ?? req.body.batch, req.user, transaction);
      const resolvedSessionId = matchedBatch.id;
      const hostel_id = matchedBatch.hostel_id;

      // DYNAMIC ROLE RETRIEVAL: Find 'student' role ID
      const studentRole = await Role.findOne({ 
         where: { roleName: { [Op.like]: 'student' } },
         transaction 
      });
      if (!studentRole) throw new Error("Role 'student' not defined in roles table.");

      const studentRoleIds = await getStudentRoleIds(transaction);
      if (studentRoleIds.length === 0) throw new Error("Student/LAPC roles not defined in roles table.");

      let student = await User.findOne({ 
         where: { [Op.or]: [{ userMail: normalizedEmail }, { roll_number: normalizedRollNumber }] },
         transaction
      });

      if (student) {
         await assertCanMove(student.userId, hostel_id, transaction);
         if (!studentRoleIds.includes(Number(student.roleId))) {
            throw new Error('This email/roll belongs to a non-student account. Use a different email/roll number.');
         }
         await student.update({ 
            hostel_id: hostel_id, 
            roleId: studentRole.roleId, // Use dynamic ID
            status: true,
            roll_number: normalizedRollNumber
         }, { transaction });
      } else {
         const salt = await bcrypt.genSalt(10);
         const defaultPassword =
            create_with_default_password === false && password
               ? password
               : (password || '12345678');
         const hashedPassword = await bcrypt.hash(defaultPassword, salt);

         student = await User.create({
            userName,
            userMail: normalizedEmail,
            password: hashedPassword,
            roleId: studentRole.roleId, // Use dynamic ID
            hostel_id: hostel_id,
            roll_number: normalizedRollNumber,
            status: true 
         }, { transaction });
      }

      // Check if enrollment exists and update or create
      let existingEnrollment = await Enrollment.findOne({
         where: {
            student_id: student.userId
         },
         transaction
      });

      if (!existingEnrollment) {
         await Enrollment.create({
            student_id: student.userId,
            hostel_id,
            session_id: resolvedSessionId,
            erp_batch_year: matchedBatch.erp_batch_year,
            requires_bed: !!requires_bed,
            college: college || 'nec',
            roll_number: normalizedRollNumber,
            status: 'active'
         }, { transaction });
      } else {
         await existingEnrollment.update({
            hostel_id,
            session_id: resolvedSessionId,
            erp_batch_year: matchedBatch.erp_batch_year,
            requires_bed: !!requires_bed,
            college: college || 'nec',
            roll_number: normalizedRollNumber,
            status: 'active'
         }, { transaction });
      }

      await transaction.commit();
      res.status(201).json({ success: true, message: 'Student registered successfully' });
   } catch (error) {
      if (transaction) await transaction.rollback();
      res.status(400).json({ success: false, message: error.message });
   }
};

// Student roster: saved enrollments by default; explicitly requested ERP candidates are batch-scoped.
export const getStudents = async (req, res) => {
   try {
      const warden_hostel_id = getHostelId(req.user);
      const enrollmentYear = req.query.enrollment_year?.toString().trim();
      const authHeader = req.headers.authorization;
      const hostellersOnly = req.query.all !== 'true';

      // Local enrollments are the normal roster. ERP candidates are explicit and batch-scoped.
      const erpStudents = req.query.source === 'erp' ? await fetchStudentsFromERP({
         authHeader,
         hostellersOnly,
         enrollmentYear: enrollmentYear || null
      }) : [];

      if (req.query.source === 'erp') {
         const batches = await listBatches();
         const scopedStudents = erpStudents.flatMap(student => {
            try {
               const batch = matchBatch(student.erp_batch_year ?? student.batch, batches);
               if (Number(batch.hostel_id) !== Number(warden_hostel_id)) return [];
               return [{ ...student, batch_name: batch.name, assigned_hostel: batch.hostel_name }];
            } catch { return []; } // Full ERP preview reports unmatched years separately.
         });
         return res.status(200).json({
            success: true,
            data: scopedStudents
         });
      }

      // Saved local enrollments provide stable user IDs and the current batch/hostel roster.
      const studentRoleIds = await getStudentRoleIds();

      const enrollmentInclude = {
         model: Enrollment,
         as: 'tbl_Enrollment',
         where: { status: 'active', ...(warden_hostel_id ? { hostel_id: warden_hostel_id } : {}) },
         required: true,
         include: [
            {
              model: Session,
              attributes: ['name'],
              where: enrollmentYear ? { name: enrollmentYear } : undefined,
              required: Boolean(enrollmentYear)
            }
         ]
      };


      const studentsWithModels = await User.findAll({
         where: { 
            ...(warden_hostel_id ? { hostel_id: warden_hostel_id } : {}),
            status: true,
            roleId: { [Op.in]: studentRoleIds } 
         },
         attributes: { exclude: ['password'] },
         include: [
            enrollmentInclude,
            {
                model: RoomAllotment,
                as: 'tbl_RoomAllotments',
                where: { is_active: true },
                required: false,
                include: [{ model: HostelRoom, attributes: ['id', 'room_number'] }]
            }
         ],
         order: [['userName', 'ASC']] 
      });

      const formattedData = studentsWithModels.map(s => {
         const plain = s.get({ plain: true });
         const activeRoom = plain.tbl_RoomAllotments && plain.tbl_RoomAllotments.length > 0 
            ? plain.tbl_RoomAllotments[0].HostelRoom 
            : null;
         const enrollmentSessionName = plain.tbl_Enrollment?.[0]?.Session?.name || null;

         return {
            ...plain,
            id: plain.userId, 
            userId: plain.userId,
            username: plain.userName,
            registerNumber: plain.roll_number,
            session: enrollmentSessionName || 'N/A',
            enrollment_year: enrollmentSessionName,
            session_id: plain.tbl_Enrollment?.[0]?.session_id || null,
            erp_batch_year: plain.tbl_Enrollment?.[0]?.erp_batch_year ?? null,
            college: plain.tbl_Enrollment?.[0]?.college || 'N/A',
            room_number: activeRoom ? activeRoom.room_number : null
         };
      });

      // Send the response
      return res.status(200).json({
         success: true,
         data: formattedData
      });

   } catch (error) {
      console.error('Warden GetStudents Error:', error);
      res.status(500).json({ success: false, message: error.message });
   }
};

// backend/controllers/wardenController.js

export const bulkEnrollStudents = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { students = [], college: defaultCollege } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      throw new Error("No student records provided for bulk enrollment.");
    }

    // Get Student Role ID dynamically
    const studentRole = await Role.findOne({ 
       where: { roleName: { [Op.like]: 'student' } },
       transaction 
    });
    if (!studentRole) throw new Error("Role 'student' not defined in roles table.");

    const studentRoleIds = await getStudentRoleIds(transaction);
    if (studentRoleIds.length === 0) throw new Error("Student/LAPC roles not defined in roles table.");

    const results = { successful: 0, skipped: 0, errors: [] };
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('12345678', salt);

    for (const studentData of students) {
      try {
        await sequelize.transaction({ transaction }, async transaction => {
          const rawType = String(studentData.student_type || studentData.studentType || studentData.type || 'hosteller').trim().toLowerCase();
          if (rawType && rawType !== 'hosteller') {
            results.skipped++;
            return;
          }

          const rawName = studentData.userName || studentData.name || '';
          const studentName = rawName.trim().toUpperCase();
          const normalizedRollNumber = String(studentData.roll_number || studentData.roll || '').trim();
          const studentCollege = String(studentData.college || defaultCollege || 'nec').trim().toLowerCase();
          const defaultDomain = studentCollege === 'lapc' ? 'lapc.edu.in' : 'nec.edu.in';
          const generatedEmail = normalizedRollNumber ? `${normalizedRollNumber}@${defaultDomain}`.toLowerCase() : '';
          const normalizedEmail = String(studentData.email || studentData.userMail || generatedEmail).trim().toLowerCase();
          const matchedBatch = await resolveStudentBatch(studentData.erp_batch_year ?? studentData.batch, req.user, transaction);
          const resolvedSessionId = matchedBatch.id;
          const hostel_id = matchedBatch.hostel_id;
          const requiresBed = Boolean(studentData.requires_bed);

          if (!studentName) {
            throw new Error(`Student name is required for roll ${normalizedRollNumber || 'unknown'}`);
          }
          if (!normalizedRollNumber) {
            throw new Error(`Roll number is required for student ${studentName}`);
          }

          // 1. Create/Update User (Login Credentials)
          let user = await User.findOne({
            where: { [Op.or]: [{ roll_number: normalizedRollNumber }, { userMail: normalizedEmail }] },
            transaction
          });

          if (!user) {
            const studentPass = studentData.password ? await bcrypt.hash(studentData.password, salt) : defaultPassword;
            user = await User.create({
              userName: studentName,
              userMail: normalizedEmail,
              password: studentPass,
              roleId: studentRole.roleId,
              hostel_id,
              roll_number: normalizedRollNumber,
              status: true
            }, { transaction });
          } else if (!studentRoleIds.includes(Number(user.roleId))) {
            throw new Error(`Existing account for ${normalizedRollNumber} is not a student account`);
          } else {
            await assertCanMove(user.userId, hostel_id, transaction);
            await user.update({
              hostel_id,
              roleId: studentRole.roleId,
              status: true,
              roll_number: normalizedRollNumber
            }, { transaction });
          }

          // 2. Create/Update Enrollment Record (The Batch/Session link)
          let existingEnrollment = await Enrollment.findOne({
            where: { student_id: user.userId },
            transaction
          });

          if (!existingEnrollment) {
            await Enrollment.create({
              student_id: user.userId,
              hostel_id,
              session_id: resolvedSessionId,
              erp_batch_year: matchedBatch.erp_batch_year,
              roll_number: normalizedRollNumber,
              college: studentCollege || 'nec',
              requires_bed: requiresBed,
              status: 'active'
            }, { transaction });
            results.successful++;
          } else {
            await existingEnrollment.update({
              hostel_id,
              session_id: resolvedSessionId,
              erp_batch_year: matchedBatch.erp_batch_year,
              requires_bed: requiresBed,
              college: studentCollege || 'nec',
              roll_number: normalizedRollNumber,
              status: 'active'
            }, { transaction });
            results.successful++;
          }
        });
      } catch (err) {
        results.errors.push({ name: studentData.userName || studentData.name || studentData.roll_number, error: err.message });
      }
    }

    await transaction.commit();
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ATTENDANCE SUMMARY
// ==========================================
export const getAttendanceSummary = async (req, res) => {
  try {
    const date = req.query.date;
    const hostel_id = getHostelId(req.user);

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const totalStudents = await User.count({
      where: { roleId: { [Op.in]: await getStudentRoleIds() }, hostel_id, status: 'Active' }
    });

    const presentCount = await Attendance.count({
      where: { date, status: 'P', hostel_id }
    });

    res.json({
      success: true,
      data: {
        date,
        totalStudents,
        present: presentCount,
        absent: Math.max(0, totalStudents - presentCount)
      }
    });
  } catch (error) {
    console.error('Attendance summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ROOM MANAGEMENT
// ==========================================
export const getAvailableRooms = async (req, res) => {
   try {
      const hostel_id = getHostelId(req.user);
      
      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const rooms = await HostelRoom.findAll({
         where: {
            hostel_id,
            is_active: true,
            [Op.where]: sequelize.where(
               sequelize.col('occupancy_count'),
               Op.lt,
               sequelize.col('RoomType.capacity')
            )
         },
         include: [{
            model: RoomType,
            attributes: ['name', 'capacity'],
            required: true
         }],
         order: [
            [sequelize.literal('`HostelRoom`.`occupancy_count` > 0'), 'DESC'], // Use direct column reference for literal
            ['room_number', 'ASC']
         ]
      });
      res.json({ success: true, data: rooms });
   } catch (error) {
      console.error('Error fetching rooms for allotment:', error);
      res.status(500).json({ success: false, message: 'Server error: ' + error.message });
   }
};

export const allotRoom = async (req, res) => {
   const transaction = await sequelize.transaction();
   try {
      const { student_id, room_id } = req.body;
      const hostel_id = getHostelId(req.user);
      
      if (!hostel_id) {
        throw new Error('Hostel binding missing.');
      }

      const student = await User.findOne({ 
         where: { userId: student_id, hostel_id, roleId: { [Op.in]: await getStudentRoleIds() }, status: 'Active' }
      });
      if (!student) throw new Error('Student not found in this hostel.');
      
      const existingAllotment = await RoomAllotment.findOne({ 
         where: { student_id, is_active: true } 
      });
      if (existingAllotment) throw new Error('Student already has an active room allotment.');
      
      const room = await HostelRoom.findOne({
         where: { id: room_id, hostel_id },
         include: [{ model: RoomType, attributes: ['capacity'] }],
         transaction,
         lock: true
      });
      if (!room) throw new Error('Room not found or does not belong to this hostel.');
      if (room.occupancy_count >= room.RoomType.capacity) {
         throw new Error('This room is already at full capacity.');
      }
      
      await RoomAllotment.create({ student_id, room_id, is_active: true }, { transaction });
      await room.increment('occupancy_count', { by: 1, transaction });
      
      await transaction.commit();
      res.status(201).json({ success: true, message: 'Room allotted successfully.' });
   } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('Error in room allotment:', error);
      res.status(400).json({ success: false, message: error.message });
   }
};

export const getRoomOccupants = async (req, res) => {
   try {
      const { id } = req.params;

      const roomAllotments = await RoomAllotment.findAll({
         where: { 
            room_id: id, 
            is_active: true 
         },
         include: [
            {
               model: User,
               as: 'AllotmentStudent',
               attributes: ['userId', 'userName', 'userMail', 'profile_picture', 'roll_number']
            }
         ]
      });

      const occupants = roomAllotments.map(allotment => allotment.AllotmentStudent);

      res.json({ 
         success: true, 
         data: occupants 
      });
   } catch (error) {
      console.error('Error fetching room occupants:', error);
      res.status(500).json({ 
         success: false, 
         message: 'Server error: ' + error.message 
      });
   }
};

export const fetchAvailableRooms = async () => {
   // This function appears to be client-side code, not a backend controller.
   // Assuming `wardenAPI` and `setRoomsLoading`/`setAvailableRooms`/`setMessage` are defined in the frontend context.
   // If this is intended to be run in Node.js, these external dependencies would need to be mocked or replaced.
   try {
      // Assuming setRoomsLoading is defined in the calling context
      // setRoomsLoading(true); 
      // const response = await wardenAPI.getAvailableRooms();
      // console.log('Available rooms from API:', response.data.data);
      
      // const roomsData = response.data.data || [];
      
      // const roomsWithOccupants = await Promise.all(
      //    roomsData.map(async (room) => {
      //       try {
      //          const occupantsResponse = await wardenAPI.getRoomOccupants(room.id);
      //          const occupants = occupantsResponse.data.data || [];
               
      //          const capacity = room.RoomType?.capacity || 0;
      //          const occupantCount = occupants.length;
               
      //          return {
      //             ...room,
      //             current_occupants: occupantCount,
      //             spacesLeft: Math.max(0, capacity - occupantCount),
      //             occupants
      //          };
      //       } catch (error) {
      //          console.error(`Error fetching occupants for room ${room.id}:`, error);
      //          return {
      //             ...room,
      //             current_occupants: room.occupancy_count || 0,
      //             spacesLeft: Math.max(0, (room.RoomType?.capacity || 0) - (room.occupancy_count || 0)),
      //             occupants: []
      //          };
      //       }
      //    })
      // );

      // console.log('Rooms with occupants data:', roomsWithOccupants);
      // setAvailableRooms(roomsWithOccupants);
      console.warn("fetchAvailableRooms is a client-side function and cannot be executed on the server.");
   } catch (error) {
      console.error('Error fetching available rooms:', error);
      // Assuming setMessage is defined in the calling context
      // setMessage({ 
      //    type: 'error', 
      //    text: 'Failed to fetch available rooms. Please try again.' 
      // });
   } finally {
      // Assuming setRoomsLoading is defined in the calling context
      // setRoomsLoading(false);
   }
};

// ==========================================
// ROOM TYPE MANAGEMENT
// ==========================================
export const createRoomTypeWarden = async (req, res) => {
  try {
    const { name, capacity, description } = req.body;
    const hostel_id = getHostelId(req.user);

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    if (!name || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Name and capacity are required'
      });
    }

    const exists = await RoomType.findOne({ where: { name, hostel_id } });
    if (exists) {
      return res.json({ success: true, data: exists });
    }

    const roomType = await RoomType.create({
      name,
      capacity,
      description,
      hostel_id
    });

    return res.status(201).json({
      success: true,
      data: roomType,
      message: 'Room type created successfully'
    });

  } catch (error) {
    console.error('Warden room type creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

export const getLayout = async (req, res) => {
  try {
    const hostel_id = getHostelId(req.user);
    
    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const layout = await HostelLayout.findOne({
      where: { hostel_id }
    });
    res.json({ success: true, data: layout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const saveLayout = async (req, res) => {
  try {
    const hostel_id = getHostelId(req.user);
    
    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const body = { ...req.body, hostel_id };

    let row = await HostelLayout.findOne({ where: { hostel_id } });

    if (row) {
      await row.update(body);
    } else {
      row = await HostelLayout.create(body);
    }

    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRoomTypesWarden = async (req, res) => {
  try {
    const hostel_id = getHostelId(req.user);
    const { search } = req.query;

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    let whereClause = { hostel_id };

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const roomTypes = await RoomType.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: roomTypes });
  } catch (error) {
    console.error('Warden room types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateRoomTypeWarden = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity, description } = req.body;
    const hostel_id = getHostelId(req.user);

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const roomType = await RoomType.findOne({ where: { id, hostel_id } });
    if (!roomType) {
      return res.status(404).json({
        success: false,
        message: 'Room type not found'
      });
    }

    await roomType.update({
      name,
      capacity,
      description
    });

    res.json({
      success: true,
      data: roomType,
      message: 'Room type updated successfully'
    });
  } catch (error) {
    console.error('Warden room type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteRoomTypeWarden = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel_id = getHostelId(req.user);

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const roomType = await RoomType.findOne({ where: { id, hostel_id } });
    if (!roomType) {
      return res.status(404).json({
        success: false,
        message: 'Room type not found'
      });
    }

    const roomsCount = await HostelRoom.count({
      where: { room_type_id: id, hostel_id, is_active: true }
    });

    if (roomsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room type. It is being used by existing rooms.'
      });
    }

    try {
      await roomType.destroy();
    } catch (error) {
      if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(400).json({
          success: false,
          message: "Cannot delete this room type because rooms still reference it. Remove or reassign those rooms first.",
        });
      }
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Room type deleted successfully'
    });
  } catch (error) {
    console.error('Warden room type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==========================================
// ROOM CRUD (WARDEN)
// ==========================================
export const createRoomWarden = async (req, res) => {
  try {
    const { room_type_id, room_number, floor, layout_slot, is_active } = req.body;
    const hostel_id = getHostelId(req.user);

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    if (!room_type_id || !room_number) {
      return res.status(400).json({
        success: false,
        message: 'Room type and room number are required'
      });
    }
    
    if (layout_slot) {
      const conflict = await HostelRoom.findOne({
        where: { hostel_id, layout_slot }
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: 'Another room already occupies this layout slot',
        });
      }
    }

    const existingRoom = await HostelRoom.findOne({
      where: { hostel_id, room_number }
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Room number already exists in this hostel'
      });
    }

    const roomType = await RoomType.findOne({ where: { id: room_type_id, hostel_id } });
    if (!roomType) {
      return res.status(404).json({
        success: false,
        message: 'Invalid room type for this hostel'
      });
    }

    const room = await HostelRoom.create({
      hostel_id,
      room_type_id,
      room_number,
      floor,
      layout_slot,
      is_active: is_active ?? true,
    });

    const roomWithDetails = await HostelRoom.findByPk(room.id, {
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: RoomType, attributes: ['id', 'name', 'capacity'] }
      ]
    });

    res.status(201).json({
      success: true,
      data: roomWithDetails,
      message: 'Room created successfully'
    });
  } catch (error) {
    console.error('Warden room creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getRoomsWarden = async (req, res) => {
  try {
    const hostel_id = getHostelId(req.user);
    const { room_type_id, search, is_occupied } = req.query;

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    let whereClause = { hostel_id };

    if (search) {
      whereClause.room_number = { [Op.like]: `%${search}%` };
    }

    const rooms = await HostelRoom.findAll({
      where: whereClause,
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: RoomType, attributes: ['id', 'name', 'capacity'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Warden rooms fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateRoomWarden = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_type_id, room_number, floor, layout_slot, is_active } = req.body;
    const hostel_id = getHostelId(req.user);

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const room = await HostelRoom.findOne({ where: { id, hostel_id } });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Reactivate if inactive
    if (!room.is_active) {
      await room.update({ is_active: true });
    }

    if (room_type_id) {
      const roomType = await RoomType.findOne({ where: { id: room_type_id, hostel_id } });
      if (!roomType) {
        return res.status(404).json({
          success: false,
          message: 'Invalid room type for this hostel'
        });
      }
    }

    if (room_number && room_number !== room.room_number) {
      const existingRoom = await HostelRoom.findOne({
        where: { hostel_id, room_number }
      });
      if (existingRoom) {
        return res.status(400).json({
          success: false,
          message: 'Room number already exists in this hostel'
        });
      }
    }
    
    if (layout_slot) {
      const conflict = await HostelRoom.findOne({
        where: {
          hostel_id,
          layout_slot,
          id: { [Op.ne]: id },
        },
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: 'Another room already occupies this layout slot',
        });
      }
    }

    await room.update({
      room_type_id,
      room_number,
      floor,
      layout_slot,
      is_active: is_active ?? room.is_active,
    });

    const updatedRoom = await HostelRoom.findByPk(id, {
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: RoomType, attributes: ['id', 'name', 'capacity'] }
      ]
    });

    res.json({
      success: true,
      data: updatedRoom,
      message: 'Room updated successfully'
    });
  } catch (error) {
    console.error('Warden room update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteRoomWarden = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel_id = getHostelId(req.user);

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const room = await HostelRoom.findOne({ where: { id, hostel_id } });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.is_occupied) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete occupied room'
      });
    }

    await room.update({ is_active: false });

    res.json({
      success: true,
      message: 'Room deactivated successfully'
    });
  } catch (error) {
    console.error('Warden room deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==========================================
// DASHBOARD STATISTICS
// ==========================================
export const getDashboardStats = async (req, res) => {
   try {
      const hostel_id = getHostelId(req.user);
      
      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      // Resolve configured Student/LAPC roles rather than assuming a numeric role ID.
      const totalStudents = await User.count({ 
         where: { roleId: { [Op.in]: await getStudentRoleIds() }, hostel_id, status: 'Active' }
      });

      // Room Occupancy Stats
      const totalCapacityResult = await HostelRoom.findOne({
         attributes: [[sequelize.fn('SUM', sequelize.col('RoomType.capacity')), 'totalCapacity']],
         include: [{ model: RoomType, attributes: [], required: true }],
         where: { hostel_id, is_active: true },
         raw: true
      });
      const totalCapacity = totalCapacityResult ? Number(totalCapacityResult.totalCapacity) : 0;
      const occupiedBeds = await HostelRoom.sum('occupancy_count', { where: { hostel_id, is_active: true } }) || 0;
      const availableBeds = totalCapacity - occupiedBeds;

      // Leave Request Stats for Chart
      const leaveCounts = await Leave.findAll({
         attributes: ['status', [sequelize.fn('COUNT', sequelize.col('Leave.id')), 'count']],
         include: [{
            model: User,
            as: 'Student',
            where: { hostel_id },
            attributes: [],
            required: true
         }],
         group: ['status'],
         raw: true
      });
      const leaveStatus = leaveCounts.reduce((acc, curr) => {
         acc[curr.status] = parseInt(curr.count) || 0;
         return acc;
      }, { pending: 0, approved: 0, rejected: 0 });
      const totalLeaves = leaveCounts.reduce((sum, curr) => sum + (parseInt(curr.count) || 0), 0);

      // Complaint Status Stats for Chart
      const complaintCounts = await Complaint.findAll({
         attributes: ['status', [sequelize.fn('COUNT', sequelize.col('Complaint.id')), 'count']],
         include: [{
            model: User,
            as: 'Student',
            where: { hostel_id },
            attributes: [],
            required: true
         }],
         group: ['status'],
         raw: true
      });
      const complaintStatus = complaintCounts.reduce((acc, curr) => {
         acc[curr.status] = parseInt(curr.count) || 0;
         return acc;
      }, { submitted: 0, in_progress: 0, resolved: 0, closed: 0 });
      const totalComplaints = complaintCounts.reduce((sum, curr) => sum + (parseInt(curr.count) || 0), 0);

      // Quick Actions
      const pendingLeaves = leaveStatus.pending || 0;
      const pendingComplaints = (complaintStatus.submitted || 0) + (complaintStatus.in_progress || 0);

      const recentLeaves = await Leave.findAll({
         where: { 
            createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
         },
         include: [{ 
            model: User, 
            as: 'Student', 
            where: { hostel_id },
            attributes: ['userId', 'userName'], 
            required: true 
         }],
         order: [['createdAt', 'DESC']],
         limit: 5
      });
      
      const recentComplaints = await Complaint.findAll({
         where: { 
            createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
         },
         include: [{ 
            model: User, 
            as: 'Student', 
            where: { hostel_id },
            attributes: ['userId', 'userName'], 
            required: true 
         }],
         order: [['createdAt', 'DESC']],
         limit: 5
      });

      // Today's Attendance Stats for Chart
      const today = new Date().toISOString().split('T')[0];

      const attendanceCounts = await Attendance.findAll({
         attributes: ['status', [sequelize.fn('COUNT', sequelize.col('Attendance.id')), 'count']],
         where: {
            date: today,
            hostel_id
         },
         include: [{
            model: User,
            as: 'Student',
            where: { hostel_id },
            attributes: [],
            required: true
         }],
         group: ['status'],
         raw: true
      });

      const attendanceStatus = attendanceCounts.reduce((acc, curr) => {
         acc[curr.status] = parseInt(curr.count) || 0;
         return acc;
      }, { P: 0, A: 0, OD: 0 });

      const totalTodayAttendance = attendanceCounts.reduce((sum, curr) => sum + (parseInt(curr.count) || 0), 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const pendingOutpasses = await Outpass.count({ where: { hostel_id, status: 'pending' } });
      const outsideOutpasses = await Outpass.count({ where: { hostel_id, status: 'outside' } });
      const completedTodayOutpasses = await Outpass.count({
        where: {
          hostel_id,
          status: { [Op.in]: ['completed', 'late_return'] },
          return_time: { [Op.gte]: todayStart }
        }
      });
      const lateReturnOutpasses = await Outpass.count({ where: { hostel_id, status: 'late_return' } });

      res.json({
         success: true,
         data: {
            totalStudents,
            totalCapacity,
            occupiedBeds,
            availableBeds: Math.max(0, availableBeds),
            
            pendingLeaves,
            totalLeaves,
            leaveStatus,

            pendingComplaints,
            totalComplaints,
            complaintStatus,

            recentLeaves,
            recentComplaints,

            attendanceStatus,
            totalTodayAttendance,

            outpasses: {
              pending: pendingOutpasses,
              outside: outsideOutpasses,
              completedToday: completedTodayOutpasses,
              lateReturn: lateReturnOutpasses
            }
         }
      });
   } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ success: false, message: 'Server error: ' + error.message });
   }
};

// ==========================================
// BULK MONTH-END MANDAYS
// ==========================================
export const bulkMonthEndMandays = async (req, res) => res.status(410).json({ success: false, message: 'Manual month-end reductions are retired. Submit a documented reduction request for warden or admin approval.' });

// ==========================================
// MONTHLY ATTENDANCE
// ==========================================
export const getMonthlyAttendance = async (req, res) => {
  try {
    const hostel_id = getHostelId(req.user);
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const totalStudents = await User.count({ 
      where: { roleId: { [Op.in]: await getStudentRoleIds() }, hostel_id, status: 'Active' }
    });
    
    if (totalStudents === 0) {
      return res.json({ success: true, data: [] });
    }

    // Fetch holidays in the period to calculate operational days per month
    const holidays = await Holiday.findAll({
      where: {
        hostel_id,
        date: { [Op.gte]: threeMonthsAgo }
      },
      raw: true
    });

    // Group holiday counts by year-month
    const holidayCounts = {};
    holidays.forEach(holiday => {
      const date = new Date(holiday.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;
      holidayCounts[key] = (holidayCounts[key] || 0) + 1;
    });

    // Retrieve attendance counts per month
    const monthlyAttendanceRaw = await Attendance.findAll({
      attributes: [
        [sequelize.fn('YEAR', sequelize.col('date')), 'year'],
        [sequelize.fn('MONTH', sequelize.col('date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('totalManDays')), 'totalPresentDays']
      ],
      where: {
        date: { [Op.gte]: threeMonthsAgo },
        hostel_id,
        totalManDays: { [Op.ne]: null } 
      },
      include: [{ model: User, as: 'Student', where: { hostel_id }, attributes: [], required: true }],
      group: ['year', 'month'],
      order: [['year', 'ASC'], ['month', 'ASC']],
      raw: true
    });

    const result = monthlyAttendanceRaw.map(record => {
      const daysInMonth = new Date(record.year, record.month, 0).getDate();
      const holidayKey = `${record.year}-${record.month}`;
      const holidayCount = holidayCounts[holidayKey] || 0;
      const operationalDays = daysInMonth - holidayCount;
      const maxPossibleMandays = totalStudents * operationalDays;
      const monthName = new Date(record.year, record.month - 1, 1).toLocaleString('default', { month: 'short' });
       
      const presentMandays = Number(record.totalPresentDays) || 0;
       
      const presentPercentage = maxPossibleMandays > 0 
        ? Math.round((presentMandays / maxPossibleMandays) * 100)
        : 0;
       
      const absentPercentage = 100 - presentPercentage;

      return {
        month: monthName, 
        present: presentPercentage,
        absent: absentPercentage,
        operationalDays,
        presentMandays
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Monthly attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const getMonthlyComplaints = async (req, res) => {
   try {
      const hostel_id = getHostelId(req.user);
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const monthlyComplaintsRaw = await Complaint.findAll({
         attributes: [
            [sequelize.fn('YEAR', sequelize.col('createdAt')), 'year'],
            [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
            [sequelize.fn('COUNT', sequelize.col('Complaint.id')), 'total']
         ],
         where: {
            createdAt: { [Op.gte]: threeMonthsAgo }
         },
         include: [{ model: User, as: 'Student', where: { hostel_id }, attributes: [], required: true }],
         group: ['year', 'month'],
         order: [['year', 'ASC'], ['month', 'ASC']],
         raw: true
      });

      const result = monthlyComplaintsRaw.map(record => {
         const monthName = new Date(record.year, record.month - 1, 1).toLocaleString('default', { month: 'short' });
         return {
            month: monthName,
            total: Number(record.total) || 0
         };
      });

      res.json({ success: true, data: result });
   } catch (error) {
      console.error('Monthly complaints error:', error);
      res.status(500).json({ success: false, message: 'Server error: ' + error.message });
   }
};

// ==========================================
// SESSIONS
// ==========================================
export const getSessions = async (req, res) => {
  try { res.json({ success: true, data: (await listBatches()).filter(batch => batch.is_active) }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// ==========================================
// ATTENDANCE MANAGEMENT
// ==========================================
export { markAttendance } from './attendanceController.js';

export { updateAttendance } from './attendanceController.js';

export { bulkMarkAttendance } from './attendanceController.js';

export { getAttendance } from './attendanceController.js';

// ==========================================
// LEAVE MANAGEMENT
// ==========================================
export const getLeaveRequests = async (req, res) => {
   try {
      const { status, from_date, to_date } = req.query;
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      let whereClause = {};
      if (status && status !== 'all') {
         whereClause.status = status;
      }
      if (from_date && to_date) {
         whereClause.createdAt = {
            [Op.between]: [from_date, to_date]
         };
      }

      const leaveRequests = await Leave.findAll({
         where: whereClause,
         include: [
            {
               model: User,
               as: 'Student',
               where: { hostel_id },
               attributes: ['userId', 'userName', 'userMail']
            },
            {
               model: User,
               as: 'ApprovedBy',
               attributes: ['userId', 'userName'],
               required: false
            }
         ],
         order: [
            ['status', 'ASC'],
            ['createdAt', 'DESC']
         ]
      });

      res.json({ success: true, data: leaveRequests });
   } catch (error) {
      console.error('Leave requests fetch error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

export const getPendingLeaves = async (req, res) => {
   try {
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const leaves = await Leave.findAll({
         where: { status: 'pending' },
         include: [
            {
               model: User,
               as: 'Student',
               attributes: ['userId', 'userName', 'userMail', 'hostel_id'],
               where: { hostel_id }
            }
         ],
         order: [['createdAt', 'ASC']]
      });

      res.json({ success: true, data: leaves });
   } catch (error) {
      console.error('Pending leaves fetch error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

export const approveLeave = async (req, res) => {
   try {
      const { id } = req.params;
      const { status, remarks } = req.body;
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      if (!['approved', 'rejected'].includes(status)) {
         return res.status(400).json({ 
            success: false, 
            message: 'Invalid status. Must be approved or rejected' 
         });
      }

      const leave = await Leave.findOne({
         where: { id },
         include: [
            {
               model: User,
               as: 'Student',
               where: { hostel_id }
            }
         ]
      });

      if (!leave) {
         return res.status(404).json({ 
            success: false, 
            message: 'Leave request not found' 
         });
      }

      if (leave.status !== 'pending') {
         return res.status(400).json({ 
            success: false, 
            message: 'Leave request has already been processed' 
         });
      }

      await leave.update({
         status,
         approved_by: req.user.userId,
         approved_date: new Date(),
         remarks
      });

      const updatedLeave = await Leave.findByPk(id, {
         include: [
            {
               model: User,
               as: 'Student',
               attributes: ['userId', 'userName', 'userMail']
            },
            {
               model: User,
               as: 'ApprovedBy',
               attributes: ['userId', 'userName']
            }
         ]
      });

      res.json({ 
         success: true, 
         data: updatedLeave,
         message: `Leave request ${status} successfully` 
      });
   } catch (error) {
      console.error('Leave approval error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

// ==========================================
// COMPLAINT MANAGEMENT
// ==========================================
export const getComplaints = async (req, res) => {
   try {
      const { status, category, priority, from_date, to_date } = req.query;
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      let whereClause = {};
      if (status && status !== 'all') {
         whereClause.status = status;
      }
      if (category && category !== 'all') {
         whereClause.category = category;
      }
      if (priority && priority !== 'all') {
         whereClause.priority = priority;
      }
      if (from_date && to_date) {
         whereClause.createdAt = {
            [Op.between]: [from_date, to_date]
         };
      }

      const complaints = await Complaint.findAll({
         where: whereClause,
         include: [
            {
               model: User,
               as: 'Student',
               where: { hostel_id },
               attributes: ['userId', 'userName', 'userMail']
            },
            {
               model: User,
               as: 'AssignedTo',
               attributes: ['userId', 'userName'],
               required: false
            }
         ],
         order: [
            ['priority', 'DESC'],
            ['createdAt', 'DESC']
         ]
      });

      res.json({ success: true, data: complaints });
   } catch (error) {
      console.error('Complaints fetch error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

export const getPendingComplaints = async (req, res) => {
   try {
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const complaints = await Complaint.findAll({
         where: { 
            status: ['submitted', 'in_progress']
         },
         include: [
            {
               model: User,
               as: 'Student',
               attributes: ['userId', 'userName', 'userMail', 'hostel_id'],
               where: { hostel_id }
            },
            {
               model: User,
               as: 'AssignedTo',
               attributes: ['userId', 'userName'],
               required: false
            }
         ],
         order: [
            ['priority', 'DESC'],
            ['createdAt', 'ASC']
         ]
      });

      res.json({ success: true, data: complaints });
   } catch (error) {
      console.error('Pending complaints fetch error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

export const updateComplaint = async (req, res) => {
   try {
      const { id } = req.params;
      const { status, resolution, assigned_to } = req.body;
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const complaint = await Complaint.findOne({
         where: { id },
         include: [
            {
               model: User,
               as: 'Student',
               where: { hostel_id }
            }
         ]
      });

      if (!complaint) {
         return res.status(404).json({ 
            success: false, 
            message: 'Complaint not found' 
         });
      }

      const updateData = { status };
      
      if (assigned_to) {
         updateData.assigned_to = assigned_to;
      }
      
      if (status === 'resolved' && resolution) {
         updateData.resolution = resolution;
         updateData.resolved_date = new Date();
      }

      await complaint.update(updateData);

      const updatedComplaint = await Complaint.findByPk(id, {
         include: [
            {
               model: User,
               as: 'Student',
               attributes: ['userId', 'userName', 'userMail']
            },
            {
               model: User,
               as: 'AssignedTo',
               attributes: ['userId', 'userName'],
               required: false
            }
         ]
      });

      res.json({ 
         success: true, 
         data: updatedComplaint,
         message: 'Complaint updated successfully' 
      });
   } catch (error) {
      console.error('Complaint update error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

// ==========================================
// SUSPENSION MANAGEMENT
// ==========================================
export const createSuspension = async (req, res) => {
   try {
      const { student_id, reason, start_date, end_date, remarks } = req.body;
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const student = await User.findOne({
         where: { userId: student_id, roleId: { [Op.in]: await getStudentRoleIds() }, hostel_id, status: 'Active' }
      });

      if (!student) {
         return res.status(400).json({ 
            success: false, 
            message: 'Student not found in this hostel' 
         });
      }

      const suspension = await Suspension.create({
         student_id,
         reason,
         start_date,
         end_date,
         issued_by: req.user.userId,
         remarks
      });

      res.status(201).json({ 
         success: true, 
         data: suspension,
         message: 'Suspension created successfully'
      });
   } catch (error) {
      console.error('Suspension creation error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

export const getSuspensions = async (req, res) => {
  try {
    const hostel_id = getHostelId(req.user);

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const suspensions = await Suspension.findAll({
      include: [
        {
          model: User,
          as: 'Student',
          where: { hostel_id },
          attributes: ['userId', 'userName', 'roll_number']
        },
        {
          model: User,
          as: 'IssuedBy',
          attributes: ['userId', 'userName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: suspensions });
  } catch (error) {
    console.error('Suspensions fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateSuspension = async (req, res) => {
   try {
      const { id } = req.params;
      const { status, remarks } = req.body;
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const suspension = await Suspension.findOne({
         where: { id },
         include: [{
            model: User,
            as: 'Student',
            where: { hostel_id }
         }]
      });

      if (!suspension) {
         return res.status(404).json({ 
            success: false, 
            message: 'Suspension not found' 
         });
      }

      await suspension.update({
         status,
         remarks
      });

      res.json({ 
         success: true, 
         data: suspension,
         message: 'Suspension updated successfully'
      });
   } catch (error) {
      console.error('Suspension update error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

// ==========================================
// HOLIDAY MANAGEMENT
// ==========================================
export const createHoliday = async (req, res) => {
   try {
      const { name, date, type, description } = req.body;
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const holiday = await Holiday.create({
         hostel_id,
         name,
         date,
         type,
         description
      });

      res.status(201).json({ 
         success: true, 
         data: holiday,
         message: 'Holiday created successfully'
      });
   } catch (error) {
      console.error('Holiday creation error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

export const getHolidays = async (req, res) => {
   try {
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const holidays = await Holiday.findAll({
         where: { hostel_id },
         order: [['date', 'ASC']]
      });

      res.json({ success: true, data: holidays });
   } catch (error) {
      console.error('Holidays fetch error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

export const updateHoliday = async (req, res) => {
   try {
      const { id } = req.params;
      const { name, date, type, description } = req.body;
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const holiday = await Holiday.findOne({
         where: { id, hostel_id }
      });

      if (!holiday) {
         return res.status(404).json({ 
            success: false, 
            message: 'Holiday not found' 
         });
      }

      await holiday.update({
         name,
         date,
         type,
         description
      });

      res.json({ 
         success: true, 
         data: holiday,
         message: 'Holiday updated successfully'
      });
   } catch (error) {
      console.error('Holiday update error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

export const deleteHoliday = async (req, res) => {
   try {
      const { id } = req.params;
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const holiday = await Holiday.findOne({
         where: { id, hostel_id }
      });

      if (!holiday) {
         return res.status(404).json({ 
            success: false, 
            message: 'Holiday not found' 
         });
      }

      await holiday.destroy();
      res.json({ 
         success: true, 
         message: 'Holiday deleted successfully' 
      });
   } catch (error) {
      console.error('Holiday deletion error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

// ==========================================
// ADDITIONAL COLLECTIONS
// ==========================================
export const createAdditionalCollection = async (req, res) => {
   try {
      const { student_id, collection_type_id, amount, reason } = req.body;
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const student = await User.findOne({
         where: { userId: student_id, roleId: { [Op.in]: await getStudentRoleIds() }, hostel_id, status: 'Active' }
      });

      if (!student) {
         return res.status(400).json({ 
            success: false, 
            message: 'Student not found in this hostel' 
         });
      }

      const collection = await AdditionalCollection.create({
         student_id,
         collection_type_id,
         amount,
         reason,
         collected_by: req.user.userId
      });

      res.status(201).json({ 
         success: true, 
         data: collection,
         message: 'Additional collection created successfully'
      });
   } catch (error) {
      console.error('Additional collection creation error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};


export const getAdditionalCollections = async (req, res) => {
   try {
      const hostel_id = getHostelId(req.user);

      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      const collections = await AdditionalCollection.findAll({
         include: [
            {
               model: User,
               as: 'CollectionStudent',
               where: { hostel_id },
               attributes: ['userId', 'userName']
            },
            {
               model: AdditionalCollectionType,
               attributes: ['id', 'name']
            },
            {
               model: User,
               as: 'CollectedBy',
               attributes: ['userId', 'userName']
            }
         ],
         order: [['collection_date', 'DESC']]
      });

      res.json({ success: true, data: collections });
   } catch (error) {
      console.error('Additional collections fetch error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
   }
};

// ==========================================
// MESS BILL MANAGEMENT
// ==========================================
export { generateMessBills } from './messController.js';

export const getMessBills = async (req, res) => {
   try {
      const { month, year } = req.query;
      const hostel_id = getHostelId(req.user);
      
      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      if (!month || !year) {
         return res.status(400).json({ 
            success: false, 
            message: 'Month and year are required' 
         });
      }
      
      const bills = await MessBill.findAll({
         where: { 
            hostel_id,
            month,
            year
         },
         include: [{
            model: User,
            as: 'MessBillStudent',
            attributes: ['userId', 'userName', 'userMail'],
            required: false
         }],
         order: [['status', 'ASC'], ['createdAt', 'DESC']]
      });

      let hostelName = '';
      if (hostel_id) {
        const hostel = await Hostel.findByPk(hostel_id);
        if (hostel) hostelName = hostel.name;
      }

      const erpStudents = await fetchStudentsFromERP({
        authHeader: req.headers.authorization,
        hostelName,
        hostellersOnly: false
      });

      const erpMap = new Map();
      (erpStudents || []).forEach(s => {
        erpMap.set(String(s.id), s);
        erpMap.set(String(s.userId), s);
        if (s.roll_number) erpMap.set(String(s.roll_number).trim().toUpperCase(), s);
      });

      const enrichedBills = bills.map(b => {
        const plain = b.get({ plain: true });
        if (!plain.MessBillStudent || !plain.MessBillStudent.userName) {
          const erpStudent = erpMap.get(String(plain.student_id));
          if (erpStudent) {
            plain.MessBillStudent = {
              userId: erpStudent.id,
              userName: erpStudent.userName || erpStudent.username,
              userMail: erpStudent.userMail || erpStudent.email,
              roll_number: erpStudent.roll_number || erpStudent.registerNumber
            };
          }
        }
        return plain;
      });
      
      const totalBills = enrichedBills.length;
      const totalAmount = enrichedBills.reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const pendingBills = enrichedBills.filter(bill => bill.status === 'pending').length;
      const pendingAmount = enrichedBills
         .filter(bill => bill.status === 'pending')
         .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      const paidBills = enrichedBills.filter(bill => bill.status === 'paid').length;
      const paidAmount = enrichedBills
         .filter(bill => bill.status === 'paid')
         .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
      
      res.json({
         success: true,
         data: {
            month,
            year,
            totalBills,
            totalAmount,
            pendingBills,
            pendingAmount,
            paidBills,
            paidAmount,
            bills: enrichedBills
         }
      });
      
   } catch (error) {
      console.error('Mess bills fetch error:', error);
      res.status(500).json({ 
         success: false, 
         message: 'Server error: ' + error.message 
      });
   }
};

export const updateMessBillStatus = async (req, res) => {
   try {
      const { id } = req.params;
      const { status, payment_date } = req.body;
      const hostel_id = getHostelId(req.user);
      
      if (!hostel_id) {
        return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
      }

      if (!status || !['pending', 'paid', 'overdue'].includes(status)) {
         return res.status(400).json({ 
            success: false, 
            message: 'Valid status is required (pending, paid, or overdue)' 
         });
      }
      
      const bill = await MessBill.findOne({
         where: { 
            id,
            hostel_id
         },
         include: [{
            model: User,
            as: 'MessBillStudent',
            attributes: ['userId', 'userName', 'userMail']
         }]
      });
      
      if (!bill) {
         return res.status(404).json({ 
            success: false, 
            message: 'Mess bill not found' 
         });
      }
      
      await bill.update({
         status,
         payment_date: status === 'paid' ? (payment_date || new Date()) : null
      });
      
      res.json({
         success: true,
         data: bill,
         message: `Mess bill status updated to ${status}`
      });
      
   } catch (error) {
      console.error('Mess bill status update error:', error);
      res.status(500).json({ 
         success: false, 
         message: 'Server error: ' + error.message 
      });
   }
};

export const fetchDailyCosts = async (month, year) => {
   // This function appears to be client-side code, not a backend controller.
   // Assuming `messAPI` and `setCalculatingCosts`/`setDailyCosts`/`setSummary`/`message` are defined in the frontend context.
   // If this is intended to be run in Node.js, these external dependencies would need to be mocked or replaced.
   try {
      // Assuming setCalculatingCosts is defined in the calling context
      // setCalculatingCosts(true);
      // const startDate = moment({ year, month: month - 1, day: 1 }).format('YYYY-MM-DD');
      // const endDate = moment({ year, month: month - 1, day: 1 }).endOf('month').format('YYYY-MM-DD');
      
      // const response = await messAPI.getMenuSchedule({ start_date: startDate, end_date: endDate });
      
      // const servedMenus = response.data.data.filter(schedule => schedule.status === 'served');
      
      // const dailyCostsMap = {};
      
      // const daysInMonth = moment({ year, month: month - 1 }).daysInMonth();
      // for (let day = 1; day <= daysInMonth; day++) {
      //    const dateString = moment({ year, month: month - 1, day }).format('YYYY-MM-DD');
      //    dailyCostsMap[dateString] = {
      //       total: 0,
      //       meals: []
      //    };
      // }
      
      // servedMenus.forEach(menu => {
      //    const dateString = moment(menu.scheduled_date).format('YYYY-MM-DD');
      //    const costPerServing = parseFloat(menu.cost_per_serving || 0);
         
      //    if (dailyCostsMap[dateString]) {
      //       dailyCostsMap[dateString].total += costPerServing;
      //       dailyCostsMap[dateString].meals.push({
      //          meal_time: menu.meal_time,
      //          cost: costPerServing,
      //          menu_name: menu.Menu?.name || 'Unknown menu'
      //       });
      //    }
      // });
      
      // const dailyCostsArray = Object.keys(dailyCostsMap).map(date => ({
      //    date,
      //    total_cost: dailyCostsMap[date].total,
      //    meals: dailyCostsMap[date].meals
      // })).sort((a, b) => moment(a.date).diff(moment(b.date)));
      
      // setDailyCosts(dailyCostsArray);
      
      // const daysWithMeals = dailyCostsArray.filter(day => day.total_cost > 0).length;
      // const totalMonthCost = dailyCostsArray.reduce((sum, item) => sum + item.total_cost, 0);
      // const averageDailyCost = daysWithMeals > 0 ? totalMonthCost / daysWithMeals : 0;
      
      // setSummary(prevSummary => ({
      //    ...prevSummary,
      //    averageDailyCost,
      //    daysWithMeals,
      //    totalMonthCost
      // }));
      
      console.warn("fetchDailyCosts is a client-side function and cannot be executed on the server.");
   } catch (error) {
      console.error('Error fetching daily costs:', error);
      // Assuming message is defined in the calling context
      // message.error('Failed to calculate daily costs');
   } finally {
      // Assuming setCalculatingCosts is defined in the calling context
      // setCalculatingCosts(false);
   }
};

// ==========================================
// ROOM REQUESTS
// ==========================================
export const getRoomRequestsWarden = async (req, res) => {
  try {
    const hostel_id = getHostelId(req.user);
    const { status } = req.query;

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const whereClause = { hostel_id };
    if (status && status !== "all") whereClause.status = status;

    const requests = await RoomRequest.findAll({
      where: whereClause,
      order: [
        ["status", "ASC"],
        ["requested_at", "DESC"],
      ],
      include: [
        {
          model: User,
          as: "Student",
          attributes: ["userId", "userName", "userMail", "roll_number", "profile_picture"],
        },
        {
          model: HostelRoom,
          as: "Room",
          attributes: ["id", "room_number", "occupancy_count"],
          include: [
            {
              model: RoomType,
              attributes: ["name", "capacity"],
            },
          ],
        },
        {
          model: User,
          as: "ProcessedBy",
          attributes: ["userId", "userName"],
          required: false,
        },
      ],
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Room request fetch error:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
};

export const decideRoomRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const hostel_id = getHostelId(req.user);
    const { id } = req.params;
    const { decision, remarks } = req.body;

    if (!hostel_id) {
      throw new Error('Hostel binding missing.');
    }

    if (!["approved", "rejected", "cancelled"].includes(decision)) {
      throw new Error("Invalid decision. Use approved, rejected, or cancelled.");
    }

    const request = await RoomRequest.findOne({
      where: { id, hostel_id },
      lock: transaction.LOCK.UPDATE,
      transaction,
      include: [
        {
          model: HostelRoom,
          as: "Room",
          include: [{ model: RoomType, attributes: ["capacity"] }],
        },
      ],
    });

    if (!request) throw new Error("Request not found for this hostel.");
    if (request.status !== "pending") throw new Error("Request has already been processed.");

    if (decision === "approved") {
      const { room_id, student_id } = request;
      const room = request.Room;
      if (!room) throw new Error("Room no longer exists.");

      const capacity = room.RoomType?.capacity ?? 0;

      const activeAllotments = await RoomAllotment.count({
        where: { room_id, is_active: true },
        transaction,
      });

      if (activeAllotments >= capacity) throw new Error("Cannot approve. Room is already full.");

      const existingAllotment = await RoomAllotment.findOne({
        where: { student_id, is_active: true },
        transaction,
      });
      if (existingAllotment) throw new Error("Student already has an active allotment.");

      await RoomAllotment.create(
        {
          student_id,
          room_id,
          allotment_date: new Date(),
          is_active: true,
        },
        { transaction },
      );

      await HostelRoom.increment(
        { occupancy_count: 1 },
        { where: { id: room_id }, transaction },
      );

      await request.update(
        {
          status: "approved",
          processed_at: new Date(),
          approved_by: req.user.userId,
          remarks,
        },
        { transaction },
      );
    } else {
      await request.update(
        {
          status: decision,
          processed_at: new Date(),
          approved_by: req.user.userId,
          remarks,
        },
        { transaction },
      );
    }

    await transaction.commit();
    res.json({ success: true, message: `Request ${decision}.`, data: request });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Room request decision error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// DAY REDUCTION REQUESTS
// ==========================================
export { listReductions as getDayReductionRequestsForWarden } from './reductionController.js';

export { decideReduction as updateDayReductionRequestStatusByWarden } from './reductionController.js';

// ==========================================
// REBATES
// ==========================================
export const getRebates = async (req, res) => {
  try {
    const hostel_id = getHostelId(req.user);
    const { status } = req.query;
    
    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    let whereClause = {};
    if (status && status !== 'all') whereClause.status = status;

    const rebates = await Rebate.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'RebateStudent',
        where: { hostel_id },
        attributes: ['userId', 'userName', 'roll_number']
      }],
      order: [['createdAt', 'DESC']]
    });

    const processedRebates = [];

    for (const rebate of rebates) {
      const start = moment(rebate.from_date).startOf('day');
      const end = moment(rebate.to_date).startOf('day');
      
      let totalCalculatedAmount = 0;
      let monthlySplit = [];
      let current = moment(start);

      while (current.isSameOrBefore(end)) {
        const month = current.month() + 1;
        const year = current.year();

        const rateLog = await DailyRateLog.findOne({
          where: { hostel_id, month, year }
        });

        const dailyRate = rateLog ? parseFloat(rateLog.daily_rate) : 0;
        totalCalculatedAmount += dailyRate;

        const monthKey = current.format('MMMM YYYY');
        let monthEntry = monthlySplit.find(m => m.label === monthKey);

        if (monthEntry) {
          monthEntry.daysCount += 1;
          monthEntry.subTotal += dailyRate;
        } else {
          monthlySplit.push({ 
            label: monthKey, 
            daysCount: 1, 
            ratePerDay: dailyRate.toFixed(2),
            subTotal: dailyRate,
            isAudited: !!rateLog 
          });
        }
        current.add(1, 'day');
      }

      processedRebates.push({
        ...rebate.toJSON(),
        calculationDetail: {
          total: totalCalculatedAmount.toFixed(2),
          totalDays: moment(end).diff(start, 'days') + 1,
          monthlySplit
        }
      });
    }

    res.json({ success: true, data: processedRebates });
  } catch (error) {
    console.error('Rebates fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRebateStatus = async (req, res) => res.status(410).json({ message: 'Legacy rebate decisions are read-only. Use the documented mess reduction workflow.' });

export const getLatestDailyRate = async (req, res) => {
  try {
    const hostel_id = getHostelId(req.user);

    if (!hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel binding missing.' });
    }

    const latest = await DailyRateLog.findOne({
      where: { hostel_id },
      order: [['year', 'DESC'], ['month', 'DESC']]
    });
    res.json({ success: true, data: latest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CHATBOT SUMMARY (INDIVIDUAL STUDENT)
// ==========================================
export const getStudentSummaryForWarden = async (req, res) => {
  try {
    const { student_id } = req.params;
    const hostel_id = getHostelId(req.user);

    if (!hostel_id || !student_id) {
      return res.status(400).json({ success: false, message: 'Hostel ID or Student ID missing.' });
    }

    const studentRoleIds = await getStudentRoleIds();
    const student = await User.findOne({
      where: { userId: student_id, hostel_id, roleId: { [Op.in]: studentRoleIds } }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // 1. Attendance (Current Month)
    const totalDays = await Attendance.count({
      where: { 
        student_id, 
        hostel_id,
        [Op.and]: [
          sequelize.where(sequelize.fn('MONTH', sequelize.col('date')), currentMonth),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), currentYear)
        ]
      }
    });

    const presentDays = await Attendance.count({
      where: { 
        student_id, 
        hostel_id,
        status: 'P',
        [Op.and]: [
          sequelize.where(sequelize.fn('MONTH', sequelize.col('date')), currentMonth),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), currentYear)
        ]
      }
    });

    // 2. Complaints
    const totalComplaints = await Complaint.count({ where: { student_id, hostel_id } });
    const pendingComplaints = await Complaint.count({ where: { student_id, hostel_id, status: 'Pending' } });
    
    // 3. Leaves / Outpasses
    const totalLeaves = await Leave.count({ where: { student_id, hostel_id } });
    const pendingLeaves = await Leave.count({ where: { student_id, hostel_id, status: 'Pending' } });

    // 4. Room
    const activeRoomAllotment = await RoomAllotment.findOne({
      where: { student_id, is_active: true },
      include: [{ model: HostelRoom, attributes: ['room_number', 'block'] }]
    });

    const roomDetails = activeRoomAllotment?.HostelRoom 
      ? `${activeRoomAllotment.HostelRoom.block ? activeRoomAllotment.HostelRoom.block + '-' : ''}${activeRoomAllotment.HostelRoom.room_number}`
      : 'Not Allotted';

    res.json({
      success: true,
      data: {
        attendance: { presentDays, totalDays },
        complaints: { totalComplaints, pendingComplaints },
        leaves: { totalLeaves, pendingLeaves },
        room: roomDetails,
      }
    });
  } catch (error) {
    console.error('Warden GetStudentSummary Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Compares live ERP hosteller records against local DB enrollments
 * and reports whether there are new or modified records.
 */
export const getErpSyncStatus = async (req, res) => {
  try {
    const warden_hostel_id = getHostelId(req.user);
    if (!warden_hostel_id) {
      return res.status(400).json({ success: false, message: 'Hostel ID not found.' });
    }

    let hostelName = '';
    const hostel = await Hostel.findByPk(warden_hostel_id);
    if (hostel) hostelName = hostel.name;

    // 1. Fetch live hosteller students from ERP API
    const erpStudents = await fetchStudentsFromERP({
      authHeader: req.headers.authorization,
      hostellersOnly: true
    });

    if (!erpStudents || erpStudents.length === 0) {
      return res.json({
        success: true,
        data: {
          hasDifferences: false,
          totalDifferences: 0,
          newCount: 0,
          updatedCount: 0,
          newStudents: [],
          updatedStudents: [],
          totalErpCount: 0,
          totalDbCount: 0
        }
      });
    }

    // 2. Fetch local students enrolled in this hostel
    const localEnrollments = await Enrollment.findAll({
      where: {
        hostel_id: warden_hostel_id,
        status: 'active'
      },
      include: [
        {
          model: User,
          as: 'Student',
          attributes: ['userId', 'userName', 'roll_number', 'userMail', 'status'],
          required: false
        },
        {
          model: Session,
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    // Create lookup maps by roll number and email
    const localByRoll = new Map();
    const localByEmail = new Map();

    localEnrollments.forEach(enroll => {
      const plain = enroll.get({ plain: true });
      const roll = (plain.roll_number || plain.Student?.roll_number || '').trim().toUpperCase();
      const email = (plain.Student?.userMail || '').trim().toLowerCase();
      if (roll) localByRoll.set(roll, { enroll: plain, user: plain.Student, session: plain.Session });
      if (email) localByEmail.set(email, { enroll: plain, user: plain.Student, session: plain.Session });
    });

    const newStudents = [];
    const updatedStudents = [];
    const allocationConflicts = [];
    const configuredBatches = await listBatches();
    const hostelsById = new Map((await Hostel.findAll()).map(hostel => [hostel.id, hostel]));

    erpStudents.forEach(erp => {
      const erpRoll = String(erp.roll_number || erp.registerNumber || '').trim().toUpperCase();
      const erpEmail = String(erp.email || erp.userMail || '').trim().toLowerCase();
      const erpName = String(erp.userName || erp.username || '').trim();
      const erpCollege = String(erp.college || 'NEC').trim().toUpperCase();
      let matchedBatch;
      try {
        matchedBatch = matchBatch(erp.erp_batch_year ?? erp.batch, configuredBatches);
        if (req.user.role !== 'admin' && matchedBatch.hostel_id !== Number(warden_hostel_id)) return;
        const targetHostel = hostelsById.get(matchedBatch.hostel_id);
        if (!targetHostel?.is_active) throw new Error('The assigned hostel is inactive.');
      } catch (error) {
        allocationConflicts.push({ id: erp.id || erpRoll, name: erpName, roll_number: erpRoll, reason: error.message });
        return;
      }
      const erpBatch = matchedBatch.name;

      const existing = (erpRoll ? localByRoll.get(erpRoll) : null) || (erpEmail ? localByEmail.get(erpEmail) : null);

      if (!existing || !existing.user) {
        newStudents.push({
          id: erp.id,
          name: erpName,
          roll_number: erpRoll,
          email: erpEmail,
          college: erpCollege,
          gender: erp.gender,
          department: erp.course || erp.session,
          batch: erpBatch,
          erp_batch_year: matchedBatch.erp_batch_year,
          assigned_hostel: matchedBatch.hostel_name
        });
      } else {
        const dbName = String(existing.user.userName || '').trim();
        const dbRoll = String(existing.user.roll_number || existing.enroll.roll_number || '').trim().toUpperCase();
        const dbCollege = String(existing.enroll.college || 'NEC').trim().toUpperCase();
        const dbBatch = String(existing.session?.name || existing.enroll.Session?.name || '').trim();

        const nameDiffers = erpName.toLowerCase() !== dbName.toLowerCase();
        const rollDiffers = erpRoll && dbRoll && erpRoll !== dbRoll;
        const collegeDiffers = erpCollege !== dbCollege;
        const batchDiffers = erpBatch !== dbBatch || Number(existing.enroll.erp_batch_year) !== Number(matchedBatch.erp_batch_year);

        if (nameDiffers || rollDiffers || collegeDiffers || batchDiffers) {
          updatedStudents.push({
            id: erp.id,
            roll_number: erpRoll,
            oldName: dbName,
            newName: erpName,
            oldCollege: dbCollege,
            newCollege: erpCollege,
            oldBatch: dbBatch,
            newBatch: erpBatch,
            erp_batch_year: matchedBatch.erp_batch_year,
            assigned_hostel: matchedBatch.hostel_name,
            diffSummary: [
              nameDiffers ? `Name: "${dbName}" → "${erpName}"` : null,
              collegeDiffers ? `College: "${dbCollege}" → "${erpCollege}"` : null,
              batchDiffers ? `Batch: "${dbBatch}" → "${erpBatch}"` : null
            ].filter(Boolean).join(', ')
          });
        }
      }
    });

    const totalDifferences = newStudents.length + updatedStudents.length + allocationConflicts.length;

    res.json({
      success: true,
      data: {
        hasDifferences: totalDifferences > 0,
        totalDifferences,
        newCount: newStudents.length,
        updatedCount: updatedStudents.length,
        newStudents,
        updatedStudents,
        allocationConflicts,
        totalErpCount: erpStudents.length,
        totalDbCount: localEnrollments.length
      }
    });
  } catch (error) {
    console.error('getErpSyncStatus Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Automatically syncs hosteller records from ERP API into tbl_users & tbl_Enrollment,
 * matching ERP admission years to configured batches and hostels.
 */
export const syncErpRecords = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const warden_hostel_id = getHostelId(req.user);
    if (!warden_hostel_id) throw new Error("Hostel ID not found.");

    let hostelName = '';
    const hostel = await Hostel.findByPk(warden_hostel_id, { transaction });
    if (hostel) hostelName = hostel.name;

    // 1. Fetch live hostellers from ERP
    const erpStudents = await fetchStudentsFromERP({
      authHeader: req.headers.authorization,
      hostellersOnly: true
    });

    if (!erpStudents || erpStudents.length === 0) {
      await transaction.rollback();
      return res.json({ success: true, message: 'No hosteller students found in ERP to sync.', added: 0, updated: 0 });
    }

    // 2. Get student Role
    const studentRole = await Role.findOne({
      where: { roleName: { [Op.like]: 'student' } },
      transaction
    });
    if (!studentRole) throw new Error("Role 'student' not found in roles table.");

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('12345678', salt);

    const studentRoleIds = await getStudentRoleIds(transaction);
    const configuredBatches = await listBatches(transaction);
    let addedCount = 0;
    let updatedCount = 0;

    for (const erp of erpStudents) {
      const rawName = erp.userName || erp.username || erp.name || '';
      const studentName = rawName.trim().toUpperCase();
      const normalizedRollNumber = String(erp.roll_number || erp.registerNumber || '').trim();
      const studentCollege = String(erp.college || 'nec').trim().toLowerCase();
      const defaultDomain = studentCollege === 'lapc' ? 'lapc.edu.in' : 'nec.edu.in';
      const generatedEmail = normalizedRollNumber ? `${normalizedRollNumber}@${defaultDomain}`.toLowerCase() : '';
      const normalizedEmail = String(erp.email || erp.userMail || generatedEmail).trim().toLowerCase();

      if (!studentName || !normalizedRollNumber) continue;

      // Resolve batch and hostel using the configured ERP batch year.
      const configured = matchBatch(erp.erp_batch_year ?? erp.batch, configuredBatches);
      if (req.user.role !== 'admin' && configured.hostel_id !== Number(warden_hostel_id)) continue;
      const matchedBatch = await resolveStudentBatch(erp.erp_batch_year ?? erp.batch, req.user, transaction);
      const resolvedSessionId = matchedBatch.id;
      const assignedHostel = matchedBatch.hostel_id;

      // Find or create User
      let user = await User.findOne({
        where: {
          [Op.or]: [
            { roll_number: normalizedRollNumber },
            ...(normalizedEmail ? [{ userMail: normalizedEmail }] : [])
          ]
        },
        transaction
      });

      if (!user) {
        user = await User.create({
          userName: studentName,
          userMail: normalizedEmail,
          password: defaultPassword,
          roleId: studentRole.roleId,
          hostel_id: assignedHostel,
          roll_number: normalizedRollNumber,
          status: true
        }, { transaction });
        addedCount++;
      } else {
        if (!studentRoleIds.includes(Number(user.roleId))) throw new Error(`Roll ${normalizedRollNumber} belongs to a non-student account.`);
        await assertCanMove(user.userId, assignedHostel, transaction);
        await user.update({
          userName: studentName,
          hostel_id: assignedHostel,
          roleId: studentRole.roleId,
          roll_number: normalizedRollNumber,
          status: true
        }, { transaction });
      }

      // Find or create Enrollment
      let existingEnrollment = await Enrollment.findOne({
        where: {
          student_id: user.userId
        },
        transaction
      });

      if (!existingEnrollment) {
        await Enrollment.create({
          student_id: user.userId,
          hostel_id: assignedHostel,
          session_id: resolvedSessionId,
          erp_batch_year: matchedBatch.erp_batch_year,
          roll_number: normalizedRollNumber,
          college: studentCollege === 'lapc' ? 'lapc' : 'nec',
          requires_bed: true,
          status: 'active'
        }, { transaction });
      } else {
        await existingEnrollment.update({
          hostel_id: assignedHostel,
          session_id: resolvedSessionId,
          erp_batch_year: matchedBatch.erp_batch_year,
          roll_number: normalizedRollNumber,
          college: studentCollege === 'lapc' ? 'lapc' : 'nec',
          status: 'active'
        }, { transaction });
        updatedCount++;
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Sync complete! Added ${addedCount} new students and updated ${updatedCount} existing enrollment records.`,
      data: {
        added: addedCount,
        updated: updatedCount,
        totalSynced: erpStudents.length
      }
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('syncErpRecords Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
