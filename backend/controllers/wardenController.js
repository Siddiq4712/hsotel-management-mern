import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import moment from 'moment';
import { 
  User, Enrollment, RoomAllotment, HostelRoom, RoomType, Session, MessFeesAllot,
  Attendance, Leave, Complaint, Suspension, Holiday, Fee, MessBill, Hostel, RoomRequest,
  DayReductionRequest, Rebate, DailyRateLog, HostelLayout, AdditionalCollection, AdditionalCollectionType, sequelize
} from '../models/index.js';
export const enrollStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // Extract user information from the request body
    const { 
      username, 
      email, 
      session_id, 
      requires_bed, 
      paid_initial_emi,
      college,
      roll_number,
      // New field to support student creation without password
      create_with_default_password 
    } = req.body;
    
    const hostel_id = req.user.hostel_id;

    // Check if username or email already exists
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: username },
          { email: email || `${username}@hostel.com` }
        ]
      },
      transaction
    });

    let student;
    
    if (existingUser) {
      // If user exists but not linked to this hostel, update them
      if (existingUser.hostel_id !== hostel_id) {
        await existingUser.update({ 
          hostel_id, 
          role: 'student',
          is_active: true,
          roll_number: roll_number || existingUser.roll_number
        }, { transaction });
      }
      // Update roll_number if provided
      if (roll_number && existingUser.roll_number !== roll_number) {
        await existingUser.update({ roll_number }, { transaction });
      }
      student = existingUser;
    } else {
      // User doesn't exist, create a new user
      // Determine if we should use a default password or the provided one
      let passwordToUse;
      
      if (create_with_default_password || !req.body.password) {
        // Use default password if explicitly requested or if no password provided
        passwordToUse = '12345678';
      } else {
        // Otherwise use the password from request body
        passwordToUse = req.body.password;
      }
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(passwordToUse, salt);

      student = await User.create({
        username,
        email: email || `${username}@hostel.com`,
        password: hashedPassword,
        role: 'student',
        hostel_id,
        roll_number: roll_number || null,
        is_active: true
      }, { transaction });
    }

    // Check if roll_number already exists in enrollment
    if (roll_number) {
      const existingEnrollment = await Enrollment.findOne({
        where: { roll_number: roll_number },
        transaction
      });
      if (existingEnrollment) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Roll number already exists in enrollment' });
      }
    }

    // Create enrollment for the student
    const enrollment = await Enrollment.create({
      student_id: student.id,
      hostel_id,
      session_id,
      requires_bed: requires_bed || false,
      initial_emi_status: requires_bed ? (paid_initial_emi ? 'paid' : 'pending') : 'not_required',
      college: college || 'nec', // Default to 'nec' if not provided
      roll_number: roll_number || null,
      remaining_dues: requires_bed ? 6 : 0,
    }, { transaction });

    // If bed is required and initial EMI is paid, create fee records for the 5 EMIs
    if (requires_bed && paid_initial_emi) {
      const today = new Date();
      
      // Create 5 monthly EMI fee records
      for (let i = 0; i < 5; i++) {
        const dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        await Fee.create({
          student_id: student.id,
          enrollment_id: enrollment.id, // Link to the enrollment
          fee_type: 'emi',
          amount: 5000, // Replace with your actual EMI amount
          due_date: dueDate,
          status: i === 0 ? 'paid' : 'pending', // First month paid, rest pending
          payment_date: i === 0 ? today : null,
          emi_month: i + 1 // Track which month in the sequence (1-5)
        }, { transaction });
      }
    }

    await transaction.commit();

    // Prepare response message
    const createdWithDefaultPassword = create_with_default_password || !req.body.password;
    const responseMessage = existingUser 
      ? 'Student already exists. Enrollment created.'
      : createdWithDefaultPassword 
        ? 'Student enrolled successfully with default password (12345678)'
        : 'Student enrolled successfully';

    res.status(201).json({ 
      success: true,
      data: { 
        student: { 
          ...student.toJSON(), 
          password: undefined 
        }, 
        enrollment,
        default_password_used: !existingUser && createdWithDefaultPassword
      },
      message: responseMessage
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Student enrollment error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
export const getAttendanceSummary = async (req, res) => {
  const date = req.query.date;

  const totalStudents = await User.count({
    where: { role: 'STUDENT' }
  });

  const presentCount = await Attendance.count({
    where: { date, status: 'P' }
  });

  res.json({
    date,
    totalStudents,
    present: presentCount,
    absent: totalStudents - presentCount
  });
};
// ROOM MANAGEMENT
export const getAvailableRooms = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
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
        [sequelize.literal('`occupancy_count` > 0'), 'DESC'],
        ['room_number', 'ASC']
      ]
    });
    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching rooms for allotment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const allotRoom = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { student_id, room_id } = req.body;
    const hostel_id = req.user.hostel_id;
    const student = await User.findOne({ where: { id: student_id, hostel_id } });
    if (!student) throw new Error('Student not found in this hostel.');
    const existingAllotment = await RoomAllotment.findOne({ where: { student_id, is_active: true } });
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
    await transaction.rollback();
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
          attributes: ['id', 'username', 'email', 'profile_picture', 'roll_number']
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
  try {
    setRoomsLoading(true);
    const response = await wardenAPI.getAvailableRooms();
    console.log('Available rooms from API:', response.data.data); // Debug log
    
    // Create a placeholder array while we fetch occupant data
    const roomsData = response.data.data || [];
    
    // For each room, fetch its occupants immediately
    const roomsWithOccupants = await Promise.all(
      roomsData.map(async (room) => {
        try {
          // Here's the key change - we always fetch the latest occupant data for accurate counts
          const occupantsResponse = await wardenAPI.getRoomOccupants(room.id);
          const occupants = occupantsResponse.data.data || [];
          
          // Calculate accurate spaces and occupancy counts
          const capacity = room.RoomType?.capacity || 0;
          const occupantCount = occupants.length;
          
          // Return the room with accurate counts
          return {
            ...room,
            current_occupants: occupantCount,
            spacesLeft: Math.max(0, capacity - occupantCount), // Ensure we don't get negative spaces
            occupants // Store the full occupant data
          };
        } catch (error) {
          console.error(`Error fetching occupants for room ${room.id}:`, error);
          // Fallback to database-reported occupancy if API call fails
          return {
            ...room,
            current_occupants: room.occupancy_count || 0,
            spacesLeft: Math.max(0, (room.RoomType?.capacity || 0) - (room.occupancy_count || 0)),
            occupants: []
          };
        }
      })
    );

    console.log('Rooms with occupants data:', roomsWithOccupants); // Debug log
    setAvailableRooms(roomsWithOccupants);
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    setMessage({ 
      type: 'error', 
      text: 'Failed to fetch available rooms. Please try again.' 
    });
  } finally {
    setRoomsLoading(false);
  }
};
// In your backend routes file (e.g., routes/warden.js or app.js)

// Warden Room Type Management - Scoped to warden's hostel
export const createRoomTypeWarden = async (req, res) => {
  try {
    const { name, capacity, description } = req.body;
    const hostel_id = req.user.hostel_id;

    if (!name || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Name and capacity are required'
      });
    }

    // AUTO-RENAME IF DUPLICATE
    let baseName = name.trim();
    // let finalName = baseName;
    let counter = 1;

    const exists = await RoomType.findOne({ where: { name, hostel_id } });
if (exists) {
  return res.json({ success: true, data: exists });
}
const finalName = name;


    // Create the room type with unique name
    const roomType = await RoomType.create({
      name: finalName,
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
    const layout = await HostelLayout.findOne({
      where: { hostel_id: req.user.hostel_id }
    });
    res.json({ success: true, data: layout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const saveLayout = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
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
    const hostel_id = req.user.hostel_id;
    const { search } = req.query;

    let whereClause = { hostel_id };

    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
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
    const hostel_id = req.user.hostel_id;

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
    const hostel_id = req.user.hostel_id;

    const roomType = await RoomType.findOne({ where: { id, hostel_id } });
    if (!roomType) {
      return res.status(404).json({
        success: false,
        message: 'Room type not found'
      });
    }

    // Check if room type is being used by any rooms in this hostel
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
          message:
            "Cannot delete this room type because rooms still reference it. Remove or reassign those rooms first.",
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

// Warden Room Management - Scoped to hostel
export const createRoomWarden = async (req, res) => {
  try {
    const { room_type_id, room_number, floor, layout_slot, is_active } = req.body;
    const hostel_id = req.user.hostel_id;

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

    // Check if room number already exists in this hostel
    const existingRoom = await HostelRoom.findOne({
      where: { hostel_id, room_number }
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Room number already exists in this hostel'
      });
    }

    // Verify room_type_id belongs to this hostel
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
    const hostel_id = req.user.hostel_id;
    const { room_type_id, search, is_occupied } = req.query;

    let whereClause = { hostel_id };

    if (room_type_id && room_type_id !== 'all') {
      whereClause.room_type_id = room_type_id;
    }

    if (is_occupied !== undefined && is_occupied !== 'all') {
      whereClause.is_occupied = is_occupied === 'true';
    }

    if (search) {
      whereClause.room_number = { [Op.iLike]: `%${search}%` };
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
    const hostel_id = req.user.hostel_id;

    const room = await HostelRoom.findOne({ where: { id, hostel_id } });

if (!room) {
  return res.status(404).json({
    success: false,
    message: 'Room not found'
  });
}

// Reactivate if inactive (VERY IMPORTANT)
if (!room.is_active) {
  await room.update({ is_active: true });
}


    // Verify new room_type_id if provided
    if (room_type_id) {
      const roomType = await RoomType.findOne({ where: { id: room_type_id, hostel_id } });
      if (!roomType) {
        return res.status(404).json({
          success: false,
          message: 'Invalid room type for this hostel'
        });
      }
    }

    // Check room number uniqueness if changed
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
    const hostel_id = req.user.hostel_id;

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

// DASHBOARD STATISTICS
export const getDashboardStats = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
    
    // Total Students
    const totalStudents = await User.count({ where: { role: 'student', hostel_id, is_active: true } });

    // Room Occupancy Stats (already good, just using occupiedBeds and totalCapacity for chart)
    const totalCapacityResult = await HostelRoom.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('RoomType.capacity')), 'totalCapacity']],
        include: [{ model: RoomType, attributes: [], required: true }],
        where: { hostel_id, is_active: true },
        raw: true
    });
    const totalCapacity = totalCapacityResult ? Number(totalCapacityResult.totalCapacity) : 0;
    const occupiedBeds = await HostelRoom.sum('occupancy_count', { where: { hostel_id, is_active: true } }) || 0;
    const availableBeds = totalCapacity - occupiedBeds; // Ensure it's not negative

    // Leave Request Stats for Chart
    const leaveCounts = await Leave.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('Leave.id')), 'count']],
      where: {
        '$Student.hostel_id$': hostel_id // Access hostel_id through the associated Student model
      },
      include: [{
        model: User,
        as: 'Student',
        attributes: [], // We only need it for the WHERE clause
        required: true
      }],
      group: ['status'],
      raw: true
    });
    const leaveStatus = leaveCounts.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, { pending: 0, approved: 0, rejected: 0 });
    const totalLeaves = leaveCounts.reduce((sum, curr) => sum + curr.count, 0);

    // Complaint Status Stats for Chart
    const complaintCounts = await Complaint.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('Complaint.id')), 'count']],
      where: {
        '$Student.hostel_id$': hostel_id // Access hostel_id through the associated Student model
      },
      include: [{
        model: User,
        as: 'Student',
        attributes: [], // We only need it for the WHERE clause
        required: true
      }],
      group: ['status'],
      raw: true
    });
    const complaintStatus = complaintCounts.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, { submitted: 0, in_progress: 0, resolved: 0, closed: 0 });
    const totalComplaints = complaintCounts.reduce((sum, curr) => sum + curr.count, 0);

    // Quick Actions (existing)
    const pendingLeaves = leaveStatus.pending;
    const pendingComplaints = complaintStatus.submitted + complaintStatus.in_progress; // Pending includes submitted and in_progress

    const recentLeaves = await Leave.findAll({
      where: { 
        createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        '$Student.hostel_id$': hostel_id
      },
      include: [{ model: User, as: 'Student', attributes: ['id', 'username'], required: true }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    const recentComplaints = await Complaint.findAll({
      where: { 
        createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        '$Student.hostel_id$': hostel_id
      },
      include: [{ model: User, as: 'Student', attributes: ['id', 'username'], required: true }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // --- New: Today's Attendance Stats for Chart ---
    const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    const attendanceCounts = await Attendance.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('Attendance.id')), 'count']],
      where: {
        date: today,
        '$Student.hostel_id$': hostel_id // Ensure attendance is for students in this hostel
      },
      include: [{
        model: User,
        as: 'Student',
        attributes: [], // Only needed for filtering
        required: true
      }],
      group: ['status'],
      raw: true
    });

    const attendanceStatus = attendanceCounts.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, { P: 0, A: 0, OD: 0 }); // Initialize with all statuses

    const totalTodayAttendance = attendanceCounts.reduce((sum, curr) => sum + curr.count, 0);
    // --- End New Block ---

    res.json({
      success: true,
      data: {
        totalStudents,
        totalCapacity, // Total available bed capacity in the hostel
        occupiedBeds,
        availableBeds: Math.max(0, availableBeds), // Ensure availableBeds is not negative
        
        pendingLeaves,
        totalLeaves,
        leaveStatus,

        pendingComplaints,
        totalComplaints,
        complaintStatus,

        recentLeaves,
        recentComplaints,

        // --- Added for Attendance Chart ---
        attendanceStatus,
        totalTodayAttendance
        // --- End Added Block ---
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// --- NEW DASHBOARD FUNCTIONS ---
// Updated wardenController.js - Add this new function and update getMonthlyAttendance
// ... (existing imports and functions remain the same)

// NEW: Bulk Month-End Mandays Entry
export const bulkMonthEndMandays = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { month, year, total_operational_days, student_reductions = [] } = req.body;
    const hostel_id = req.user.hostel_id;
    const marked_by = req.user.id;

    if (!month || !year || total_operational_days === undefined) {
      throw new Error('Month, year, and total_operational_days are required');
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    if (monthNum < 1 || monthNum > 12) {
      throw new Error('Invalid month (should be 1-12)');
    }

    // Calculate month start and end dates
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);

    // Get all active students in the hostel
    const students = await User.findAll({
      where: { 
        hostel_id,
        role: 'student',
        is_active: true
      },
      attributes: ['id'],
      transaction
    });

    if (students.length === 0) {
      throw new Error('No active students found in this hostel');
    }

    // Create a map for quick lookup of reductions
    const reductionMap = {};
    student_reductions.forEach(({ student_id, reduction_days }) => {
      reductionMap[student_id] = parseInt(reduction_days) || 0;
    });

    // Delete existing attendance records for this month for all students
    await Attendance.destroy({
      where: {
        student_id: { [Op.in]: students.map(s => s.id) },
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      transaction
    });

    // Create monthly summary record for each student
    const createdRecords = [];
    for (const student of students) {
      const reduction = reductionMap[student.id] || 0;
      const mandays = Math.max(0, total_operational_days - reduction);

      const monthlyRecord = await Attendance.create({
        student_id: student.id,
        hostel_id,
        date: startDate,
        status: 'P',
        totalManDays: mandays,
        is_monthly: true,
        marked_by,
        remarks: `Monthly mandays entry: ${mandays} present out of ${total_operational_days} operational days (reduction: ${reduction})`
      }, { transaction });

      createdRecords.push(monthlyRecord);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: `Monthly mandays entry completed for ${createdRecords.length} students`,
      data: {
        month,
        year,
        total_operational_days,
        records_created: createdRecords.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Bulk month-end mandays error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// UPDATED: getMonthlyAttendance - Now calculates operational days using holidays
export const getMonthlyAttendance = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Get the total number of enrolled students for the calculation base
    const totalStudents = await User.count({ where: { role: 'student', hostel_id, is_active: true } });
    
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

    // Retrieve attendance counts per month (includes both daily and monthly records)
    const monthlyAttendanceRaw = await Attendance.findAll({
      attributes: [
        [sequelize.fn('YEAR', sequelize.col('date')), 'year'],
        [sequelize.fn('MONTH', sequelize.col('date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('totalManDays')), 'totalPresentDays']
      ],
      where: {
        date: { [Op.gte]: threeMonthsAgo },
        '$Student.hostel_id$': hostel_id,
        totalManDays: { [Op.ne]: null } 
      },
      include: [{ model: User, as: 'Student', attributes: [], required: true }],
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
        operationalDays,  // NEW: Include for frontend if needed
        presentMandays    // NEW: Include raw present mandays
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
    const hostel_id = req.user.hostel_id;
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Retrieve complaint counts per month
    const monthlyComplaintsRaw = await Complaint.findAll({
      attributes: [
        [sequelize.fn('YEAR', sequelize.col('createdAt')), 'year'],
        [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('Complaint.id')), 'total']
      ],
      where: {
        createdAt: { [Op.gte]: threeMonthsAgo },
        '$Student.hostel_id$': hostel_id
      },
      include: [{ model: User, as: 'Student', attributes: [], required: true }],
      group: ['year', 'month'],
      order: [['year', 'ASC'], ['month', 'ASC']],
      raw: true
    });

    const result = monthlyComplaintsRaw.map(record => {
      const monthName = new Date(record.year, record.month - 1, 1).toLocaleString('default', { month: 'short' });
      return {
        month: monthName, // e.g., 'Oct'
        total: Number(record.total)
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Monthly complaints error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// --- END NEW DASHBOARD FUNCTIONS ---

export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.findAll({ where: { is_active: true }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ATTENDANCE MANAGEMENT
export const markAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { student_id, date, status, from_date, to_date, reason, remarks } = req.body;
    const marked_by = req.user?.id;
    const hostel_id = req.user.hostel_id;

    // Validate inputs
    if (!student_id || !date || !status) {
      throw new Error('Missing required fields: student_id, date, and status are required');
    }
    if (!['P', 'A', 'OD'].includes(status)) {
      throw new Error('Invalid status. Must be P, A, or OD');
    }
    if (status === 'OD' && (!from_date || !to_date)) {
      throw new Error('from_date and to_date are required for OD status');
    }

    // Validate student
    const student = await User.findOne({
      where: { id: student_id, role: 'student', hostel_id, is_active: true },
      transaction
    });
    if (!student) {
      throw new Error('Student not found in this hostel');
    }

    // Validate marked_by
    if (!marked_by) {
      throw new Error('Invalid user authentication');
    }

    // Validate dates
    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    let startDate, endDate;
    if (status === 'OD') {
      startDate = new Date(from_date);
      endDate = new Date(to_date);
      if (isNaN(startDate) || isNaN(endDate)) {
        throw new Error('Invalid from_date or to_date format. Use YYYY-MM-DD');
      }
      if (startDate > endDate) {
        throw new Error('from_date cannot be later than to_date');
      }
    }

    const attendanceData = {
      student_id,
      date,
      status,
      marked_by,
      hostel_id,
      reason,
      remarks,
      from_date: status === 'OD' ? from_date : null,
      to_date: status === 'OD' ? to_date : null,
      totalManDays: status === 'A' ? 0 : 1 // MODIFIED: Set totalManDays based on status (1 for P/OD, 0 for A)
    };

    const [attendance, created] = await Attendance.findOrCreate({
      where: { student_id, date },
      defaults: attendanceData,
      transaction
    });
    if (!created) await attendance.update(attendanceData, { transaction });

    if (status === 'OD' && from_date && to_date) {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const currentDate = d.toISOString().split('T')[0];
        if (currentDate === date) continue;
        await Attendance.upsert(
          { 
            student_id, 
            date: currentDate, 
            status: 'OD', 
            from_date, 
            to_date, 
            marked_by, 
            hostel_id,
            reason, 
            remarks,
            totalManDays: 1 // MODIFIED: Set to 1 for OD range days
          },
          { transaction }
        );
      }
    }

    await transaction.commit();
    res.json({ success: true, data: attendance, message: 'Attendance marked successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Attendance marking error:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
      user: req.user
    });
    res.status(error.message.includes('not found') ? 404 : 400).json({ success: false, message: error.message });
  }
};
export const updateAttendance = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { status, reason, remarks, from_date, to_date } = req.body;
    const hostel_id = req.user.hostel_id;
    const marked_by = req.user.id;

    if (!['P', 'A', 'OD'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be P, A, or OD' });
    }

    const oldAttendance = await Attendance.findOne({
      where: { id },
      include: [{ model: User, as: 'Student', where: { hostel_id } }],
      transaction
    });

    if (!oldAttendance) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const oldStatus = oldAttendance.status;
    const student_id = oldAttendance.student_id;
    const currentDate = oldAttendance.date;

    // Prepare update data for the current record
    const updateData = {
      status,
      reason,
      remarks,
      from_date: status === 'OD' ? from_date : null,
      to_date: status === 'OD' ? to_date : null,
      marked_by,
      hostel_id,
      totalManDays: status === 'A' ? 0 : 1 // MODIFIED: Update totalManDays based on new status
    };

    // Validate dates for OD
    if (status === 'OD') {
      if (!from_date || !to_date) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'from_date and to_date are required for OD status' });
      }
      const startDate = new Date(from_date);
      const endDate = new Date(to_date);
      if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Invalid from_date or to_date' });
      }
    }

    // Handle range cleanup/creation
    if (oldStatus === 'OD' && status !== 'OD') {
      // Changing from OD to non-OD: Delete all records in old range except current (which we'll update)
      const oldStart = new Date(oldAttendance.from_date);
      const oldEnd = new Date(oldAttendance.to_date);
      for (let d = new Date(oldStart); d <= oldEnd; d.setDate(d.getDate() + 1)) {
        const rangeDate = d.toISOString().split('T')[0];
        if (rangeDate === currentDate) continue; // Skip current, update it below
        await Attendance.destroy({
          where: { student_id, date: rangeDate },
          transaction
        });
      }
    } else if (status === 'OD' && oldStatus !== 'OD') {
      // Changing to OD: Upsert the full new range (including current)
      const startDate = new Date(from_date);
      const endDate = new Date(to_date);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const rangeDate = d.toISOString().split('T')[0];
        await Attendance.upsert(
          {
            student_id,
            date: rangeDate,
            status: 'OD',
            from_date,
            to_date,
            marked_by,
            hostel_id,
            reason,
            remarks,
            totalManDays: 1 // MODIFIED: Set to 1 for new OD range
          },
          { transaction }
        );
      }
      // For the current record, use the upserted one below
    }
    // Else: No range change needed (P/A to P/A, or OD to OD - just update single)

    // Update the current record
    await oldAttendance.update(updateData, { transaction });

    await transaction.commit();

    // Refetch the updated record for response
    const updatedAttendance = await Attendance.findByPk(id, {
      include: [
        { model: User, as: 'Student', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'MarkedBy', attributes: ['id', 'username'] }
      ]
    });

    res.json({ success: true, data: updatedAttendance, message: 'Attendance updated successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Attendance update error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
export const bulkMarkAttendance = async (req, res) => {
    const { date, attendanceData } = req.body;
    const marked_by = req.user.id;
    const hostel_id = req.user.hostel_id;
    const transaction = await sequelize.transaction();
    try {
        if (!date || !Array.isArray(attendanceData)) throw new Error("Date and attendance data are required.");
        
        // Validate all students belong to the hostel
        const studentIds = attendanceData.map(record => record.student_id);
        const students = await User.findAll({
            where: { 
                id: { [Op.in]: studentIds },
                role: 'student',
                hostel_id,
                is_active: true
            },
            attributes: ['id']
        });
        if (students.length !== studentIds.length) {
            throw new Error('One or more students not found in this hostel');
        }

        for (const record of attendanceData) {
            const { student_id, status, from_date, to_date, reason, remarks } = record;

            if (!['P', 'A', 'OD'].includes(status)) {
                throw new Error(`Invalid status for student ${student_id}: ${status}`);
            }

            const upsertData = {
                student_id,
                date,
                status,
                marked_by,
                hostel_id,
                reason: status === 'OD' ? (reason || null) : null,
                remarks: status === 'OD' ? (remarks || null) : null,
                from_date: status === 'OD' ? (from_date || null) : null,
                to_date: status === 'OD' ? (to_date || null) : null,
                totalManDays: status === 'A' ? 0 : 1 // MODIFIED: Set totalManDays based on status
            };

            await Attendance.upsert(upsertData, { transaction });

            // If OD, create range entries
            if (status === 'OD' && from_date && to_date) {
                const startDate = new Date(from_date);
                const endDate = new Date(to_date);
                if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
                    throw new Error(`Invalid OD date range for student ${student_id}`);
                }
                if (!reason) {
                    throw new Error(`Reason required for OD for student ${student_id}`);
                }

                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const rangeDate = d.toISOString().split('T')[0];
                    if (rangeDate === date) continue; // Skip the current date as it's already upserted
                    await Attendance.upsert({
                        student_id,
                        date: rangeDate,
                        status: 'OD',
                        from_date,
                        to_date,
                        marked_by,
                        hostel_id,
                        reason,
                        remarks,
                        totalManDays: 1 // MODIFIED: Set to 1 for OD range days
                    }, { transaction });
                }
            }
        }
        await transaction.commit();
        res.json({ success: true, message: 'Attendance saved successfully.' });
    } catch (error) {
        await transaction.rollback();
        console.error('Bulk attendance marking error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const hostel_id = req.user.hostel_id;
    const attendance = await Attendance.findAll({
      where: { date },
      include: [{ model: User, as: 'Student', where: { hostel_id }, attributes: ['id'] }],
    });
    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Attendance fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// LEAVE MANAGEMENT - UPDATED WITH PROPER FILTERS
export const getLeaveRequests = async (req, res) => {
  try {
    const { status, from_date, to_date } = req.query;
    const hostel_id = req.user.hostel_id;

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
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'ApprovedBy',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [
        ['status', 'ASC'], // pending first
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
    const hostel_id = req.user.hostel_id;

    const leaves = await Leave.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          as: 'Student',
          attributes: ['id', 'username', 'email', 'hostel_id'],
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
    const hostel_id = req.user.hostel_id;

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
      approved_by: req.user.id,
      approved_date: new Date(),
      remarks
    });

    const updatedLeave = await Leave.findByPk(id, {
      include: [
        {
          model: User,
          as: 'Student',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'ApprovedBy',
          attributes: ['id', 'username']
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

// COMPLAINT MANAGEMENT - UPDATED WITH PROPER FILTERS
export const getComplaints = async (req, res) => {
  try {
    const { status, category, priority, from_date, to_date } = req.query;
    const hostel_id = req.user.hostel_id;

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
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'AssignedTo',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [
        ['priority', 'DESC'], // urgent first
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
    const hostel_id = req.user.hostel_id;

    const complaints = await Complaint.findAll({
      where: { 
        status: ['submitted', 'in_progress']
      },
      include: [
        {
          model: User,
          as: 'Student',
          attributes: ['id', 'username', 'email', 'hostel_id'],
          where: { hostel_id }
        },
        {
          model: User,
          as: 'AssignedTo',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [
        ['priority', 'DESC'], // urgent first
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
    const hostel_id = req.user.hostel_id;

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
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'AssignedTo',
          attributes: ['id', 'username'],
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

// SUSPENSION MANAGEMENT
export const createSuspension = async (req, res) => {
  try {
    const { student_id, reason, start_date, end_date, remarks } = req.body;
    const hostel_id = req.user.hostel_id;

    // Verify student belongs to this hostel
    const student = await User.findOne({
      where: { id: student_id, role: 'student', hostel_id, is_active: true }
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
      issued_by: req.user.id,
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
    const hostel_id = req.user.hostel_id;

    const suspensions = await Suspension.findAll({
      include: [
        {
          model: User,
          as: 'Student',
          where: { hostel_id },
          attributes: ['id', 'username', 'roll_number']
        },
        {
          model: User,
          as: 'IssuedBy',
          attributes: ['id', 'username']
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
    const hostel_id = req.user.hostel_id;

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

// HOLIDAY MANAGEMENT
export const createHoliday = async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    const hostel_id = req.user.hostel_id;

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
    const hostel_id = req.user.hostel_id;

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
    const hostel_id = req.user.hostel_id;

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
    const hostel_id = req.user.hostel_id;

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

// ADDITIONAL COLLECTIONS
export const createAdditionalCollection = async (req, res) => {
  try {
    const { student_id, collection_type_id, amount, reason } = req.body;
    const hostel_id = req.user.hostel_id;

    // Verify student belongs to this hostel
    const student = await User.findOne({
      where: { id: student_id, role: 'student', hostel_id, is_active: true }
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
      collected_by: req.user.id
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
// Helper to get session from enrollment
const getSession = (student) => {
  return student.session || 'N/A';  // FIXED: Use direct student.session instead of tbl_Enrollment[0].session
};
export const getStudents = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
    if (!hostel_id) {
      return res.status(400).json({ success: false, message: "Warden is not assigned to a hostel." });
    }

    const studentsWithModels = await User.findAll({
      where: { 
        role: 'student',
        hostel_id,
        is_active: true 
      },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: RoomAllotment,
          as: 'tbl_RoomAllotments',
          where: { is_active: true },
          required: false,
          include: [{
            model: HostelRoom,
            attributes: ['id', 'room_number'],
            include: [{
              model: RoomType,
              attributes: ['name']
            }]
          }]
        },
        {
          model: Enrollment,
          as: 'tbl_Enrollment',
          required: false,
          include: [{  // FIXED: Nest include for Session to get the name
            model: Session,
            attributes: ['name']
          }],
          attributes: ['college']  // FIXED: Removed invalid 'session'; use nested Session.name
        }
      ],
      order: [
        [{ model: RoomAllotment, as: 'tbl_RoomAllotments' }, 'HostelRoom', 'room_number', 'ASC'],  // FIXED: Use correct nested path for order
        ['username', 'ASC']
      ]
    });

    // Convert to plain objects to prevent circular reference errors
    const students = studentsWithModels.map(instance => {
      const plain = instance.get({ plain: true });
      // FIXED: Extract session name from nested Session
      plain.session = plain.tbl_Enrollment?.[0]?.Session?.name || 'N/A';
      // Existing college extraction
      plain.college = plain.tbl_Enrollment?.[0]?.college || 'N/A';
      delete plain.tbl_Enrollment; // Clean up nested enrollments
      return plain;
    });

    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
export const getAdditionalCollections = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;

    const collections = await AdditionalCollection.findAll({
      include: [
        {
          model: User,
          as: 'Student',
          where: { hostel_id },
          attributes: ['id', 'username']
        },
        {
          model: AdditionalCollectionType,
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'CollectedBy',
          attributes: ['id', 'username']
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
// Add these functions to wardenController.js

// Generate mess bills for all students in hostel, excluding those on OD
export const generateMessBills = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { month, year, amount_per_day } = req.body;
    const hostel_id = req.user.hostel_id;
    
    if (!month || !year || !amount_per_day) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Month, year and amount per day are required' 
      });
    }
    
    // Validate month and year
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (monthNum < 1 || monthNum > 12) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid month (should be 1-12)' 
      });
    }
    
    // Create the date range for the selected month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0); // Last day of the month
    
    // Get all students in the hostel
    const students = await User.findAll({
      where: { 
        hostel_id,
        role: 'student',
        is_active: true
      },
      attributes: ['id']
    });
    
    if (students.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'No active students found in this hostel'
      });
    }
    
    // Get all attendance records for this month
    const attendanceRecords = await Attendance.findAll({
      where: {
        date: {
          [Op.between]: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
        },
        student_id: {
          [Op.in]: students.map(student => student.id)
        }
      },
      transaction
    });
    
    // Create a map to track attendance for each student
    const studentAttendance = {};
    
    // Initialize the map for each student with 0 OD days
    students.forEach(student => {
      studentAttendance[student.id] = {
        odDays: 0,
        presentDays: 0
      };
    });
    
    // Count OD days for each student
    attendanceRecords.forEach(record => {
      if (record.status === 'OD') {
        studentAttendance[record.student_id].odDays++;
      } else if (record.status === 'P') {
        studentAttendance[record.student_id].presentDays++;
      }
    });
    
    // Calculate number of days in the month
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    
    // Create mess bills for each student
    const createdBills = [];
    for (const student of students) {
      // Calculate chargeable days (total days - OD days)
      const odDays = studentAttendance[student.id].odDays || 0;
      const chargeableDays = daysInMonth - odDays;
      
      // Calculate the amount
      const totalAmount = chargeableDays * amount_per_day;
      
      // Set due date as 10th of the next month
      const dueMonth = monthNum === 12 ? 1 : monthNum + 1;
      const dueYear = monthNum === 12 ? yearNum + 1 : yearNum;
      const dueDate = new Date(dueYear, dueMonth - 1, 10);
      
      // Create or update the mess bill
      const [bill, created] = await MessBill.findOrCreate({
        where: {
          student_id: student.id,
          hostel_id,
          month: monthNum,
          year: yearNum
        },
        defaults: {
          amount: totalAmount,
          status: 'pending',
          due_date: dueDate
        },
        transaction
      });
      
      // If bill already exists, update it
      if (!created) {
        await bill.update({
          amount: totalAmount,
          due_date: dueDate
        }, { transaction });
      }
      
      createdBills.push(bill);
    }
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: `Mess bills generated for ${createdBills.length} students for ${month}/${year}`,
      data: {
        billCount: createdBills.length,
        month: monthNum,
        year: yearNum
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Mess bill generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
};

// Get all mess bills for a specific month
export const getMessBills = async (req, res) => {
  try {
    const { month, year } = req.query;
    const hostel_id = req.user.hostel_id;
    
    if (!month || !year) {
      return res.status(400).json({ 
        success: false, 
        message: 'Month and year are required' 
      });
    }
    
    // Get all bills for the month
    const bills = await MessBill.findAll({
      where: { 
        hostel_id,
        month,
        year
      },
      include: [{
        model: User,
        as: 'MessBillStudent',
        attributes: ['id', 'username', 'email']
      }],
      order: [['status', 'ASC'], ['createdAt', 'DESC']]
    });
    
    // Calculate summary statistics
    const totalBills = bills.length;
    const totalAmount = bills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
    const pendingBills = bills.filter(bill => bill.status === 'pending').length;
    const pendingAmount = bills
      .filter(bill => bill.status === 'pending')
      .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
    const paidBills = bills.filter(bill => bill.status === 'paid').length;
    const paidAmount = bills
      .filter(bill => bill.status === 'paid')
      .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
    
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
        bills
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

// Update mess bill status
export const updateMessBillStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_date } = req.body;
    const hostel_id = req.user.hostel_id;
    
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
        attributes: ['id', 'username', 'email']
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
  setCalculatingCosts(true);
  try {
    // Create start and end dates for the month
    const startDate = moment({ year, month: month - 1, day: 1 }).format('YYYY-MM-DD');
    const endDate = moment({ year, month: month - 1, day: 1 }).endOf('month').format('YYYY-MM-DD');
    
    // Fetch the served menus for the month
    const response = await messAPI.getMenuSchedule({ start_date: startDate, end_date: endDate });
    
    // Filter to only get served menus
    const servedMenus = response.data.data.filter(schedule => schedule.status === 'served');
    
    // Create daily cost mapping
    const dailyCostsMap = {};
    
    // Initialize with 0 cost for each day of the month
    const daysInMonth = moment({ year, month: month - 1 }).daysInMonth();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = moment({ year, month: month - 1, day }).format('YYYY-MM-DD');
      dailyCostsMap[dateString] = {
        total: 0,
        meals: []
      };
    }
    
    // Sum up cost_per_serving for each day, accounting for multiple meals per day
    servedMenus.forEach(menu => {
      const dateString = moment(menu.scheduled_date).format('YYYY-MM-DD');
      const costPerServing = parseFloat(menu.cost_per_serving || 0);
      
      if (dailyCostsMap[dateString]) {
        dailyCostsMap[dateString].total += costPerServing;
        dailyCostsMap[dateString].meals.push({
          meal_time: menu.meal_time,
          cost: costPerServing,
          menu_name: menu.Menu?.name || 'Unknown menu'
        });
      }
    });
    
    // Convert to array for easier display
    const dailyCostsArray = Object.keys(dailyCostsMap).map(date => ({
      date,
      total_cost: dailyCostsMap[date].total,
      meals: dailyCostsMap[date].meals
    })).sort((a, b) => moment(a.date).diff(moment(b.date)));
    
    setDailyCosts(dailyCostsArray);
    
    // Calculate average daily cost (only for days with meals)
    const daysWithMeals = dailyCostsArray.filter(day => day.total_cost > 0).length;
    const totalMonthCost = dailyCostsArray.reduce((sum, item) => sum + item.total_cost, 0);
    const averageDailyCost = daysWithMeals > 0 ? totalMonthCost / daysWithMeals : 0;
    
    setSummary(prevSummary => ({
      ...prevSummary,
      averageDailyCost,
      daysWithMeals,
      totalMonthCost
    }));
    
  } catch (error) {
    console.error('Error fetching daily costs:', error);
    message.error('Failed to calculate daily costs');
  } finally {
    setCalculatingCosts(false);
  }
};
export const getRoomRequestsWarden = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
    const { status } = req.query;

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
          attributes: ["id", "username", "email", "roll_number", "profile_picture"],
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
          attributes: ["id", "username"],
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
    const hostel_id = req.user.hostel_id;
    const { id } = req.params;
    const { decision, remarks } = req.body;

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
          approved_by: req.user.id,
          remarks,
        },
        { transaction },
      );
    } else {
      await request.update(
        {
          status: decision,
          processed_at: new Date(),
          approved_by: req.user.id,
          remarks,
        },
        { transaction },
      );
    }

    await transaction.commit();
    res.json({ success: true, message: `Request ${decision}.`, data: request });
  } catch (error) {
    await transaction.rollback();
    console.error("Room request decision error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
export const getDayReductionRequestsForWarden = async (req, res) => {
  try {
    const wardenHostelId = req.user.hostel_id;
    if (!wardenHostelId) {
      return res.status(403).json({ success: false, message: 'Warden is not assigned to a hostel.' });
    }

    const { status, student_id, from_date, to_date } = req.query;

    let whereClause = {
      hostel_id: wardenHostelId // Wardens only see requests for their hostel
    };

    // Wardens primarily see requests that have been approved by admin or previously processed by themselves
    if (status && status !== 'all') {
      whereClause.status = status;
    } else {
      whereClause.status = { [Op.in]: ['approved_by_admin', 'approved_by_warden', 'rejected_by_warden'] };
    }

    if (student_id) whereClause.student_id = student_id;
    if (from_date && to_date) {
      whereClause[Op.and] = [
        { from_date: { [Op.lte]: to_date } },
        { to_date: { [Op.gte]: from_date } }
      ];
    }

    const requests = await DayReductionRequest.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'Student', attributes: ['id', 'username', 'email', 'roll_number'] },
        { model: User, as: 'AdminProcessor', attributes: ['id', 'username'], required: false },
        { model: User, as: 'WardenProcessor', attributes: ['id', 'username'], required: false },
        { model: Hostel, as: 'Hostel', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching day reduction requests for warden:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const updateDayReductionRequestStatusByWarden = async (req, res) => {
  const transaction = await sequelize.transaction(); // Use a transaction for atomicity
  try {
    const { id } = req.params;
    const { action, warden_remarks } = req.body; // 'approve' or 'reject'
    const warden_id = req.user.id;
    const wardenHostelId = req.user.hostel_id;

    const request = await DayReductionRequest.findByPk(id, { transaction });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Day reduction request not found.' });
    }

    // Ensure the warden is processing a request for their assigned hostel
    if (request.hostel_id !== wardenHostelId) {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: 'You are not authorized to process requests for this hostel.' });
    }

    // Ensure the request is in the correct state for warden review
    if (request.status !== 'approved_by_admin') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: `Request not in 'approved_by_admin' status. Current status: ${request.status}.` });
    }

    let newStatus;
    if (action === 'approve') {
      newStatus = 'approved_by_warden';
    } else if (action === 'reject') {
      newStatus = 'rejected_by_warden';
    } else {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid action. Must be "approve" or "reject".' });
    }

    await request.update({
      status: newStatus,
      warden_id,
      warden_remarks,
      // processed_at: new Date() // Add to model if tracking specific warden processing time
    }, { transaction });

    if (newStatus === 'approved_by_warden') {
      // Mark attendance as 'OD' for the requested days
      const { student_id, from_date, to_date, hostel_id } = request;
      const startDate = moment(from_date);
      const endDate = moment(to_date);

      let currentDate = moment(startDate);
      while (currentDate.isSameOrBefore(endDate)) {
        const dateString = currentDate.format('YYYY-MM-DD');

        // Check for existing attendance record for the day
        let existingAttendance = await Attendance.findOne({
          where: {
            student_id,
            hostel_id,
            date: dateString
          },
          transaction
        });

        if (existingAttendance) {
          // Update existing record if not already 'P' (present).
          // 'OD' (On Duty) should override 'A' (Absent) or 'L' (Leave), but usually not 'P'.
          if (existingAttendance.status !== 'P') { // Don't override 'P' if student was genuinely present
             await existingAttendance.update({
              status: 'OD',
              totalManDays: 1, // 'OD' counts as a man-day for mess calculation
              remarks: existingAttendance.remarks ? `${existingAttendance.remarks}; Day reduction request approved (ID: ${id})` : `Day reduction request approved (ID: ${id})`,
              marked_by: warden_id // Warden approved this change
            }, { transaction });
          }
        } else {
          // Create new attendance record if none exists for the day
          await Attendance.create({
            student_id,
            hostel_id,
            date: dateString,
            status: 'OD',
            totalManDays: 1, // 'OD' counts as a man-day for mess calculation
            remarks: `Day reduction request approved (ID: ${id})`,
            marked_by: warden_id
          }, { transaction });
        }
        currentDate.add(1, 'day');
      }
    }

    await transaction.commit(); // Commit all changes if successful
    res.json({ success: true, data: request, message: `Day reduction request ${newStatus.replace('_', ' ')} successfully.` });

  } catch (error) {
    await transaction.rollback(); // Rollback all changes if any error occurs
    console.error('Error updating day reduction request status by warden:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
export const getRebates = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
    const { status } = req.query;
    
    let whereClause = {};
    if (status && status !== 'all') whereClause.status = status;

    const rebates = await Rebate.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'RebateStudent',
        where: { hostel_id },
        attributes: ['id', 'username', 'roll_number']
      }],
      order: [['createdAt', 'DESC']]
    });

    const processedRebates = [];

    for (const rebate of rebates) {
      const start = moment(rebate.from_date).startOf('day');
      const end = moment(rebate.to_date).startOf('day');
      
      let totalCalculatedAmount = 0;
      let monthlySplit = []; // This will hold the split-up
      let current = moment(start);

      while (current.isSameOrBefore(end)) {
        const month = current.month() + 1;
        const year = current.year();

        // 1. Fetch audited rate from the log table we created earlier
        const rateLog = await DailyRateLog.findOne({
          where: { hostel_id, month, year }
        });

        // 2. Set rate (Audited or fallback 0)
        const dailyRate = rateLog ? parseFloat(rateLog.daily_rate) : 0;
        totalCalculatedAmount += dailyRate;

        // 3. Update the monthly split-up array
        const monthKey = current.format('MMMM YYYY');
        let monthEntry = monthlySplit.find(m => m.label === monthKey);

        if (monthEntry) {
          monthEntry.daysCount += 1;
          monthEntry.subTotal += dailyRate;
        } else {
          monthlySplit.push({ 
            label: monthKey, 
            daysCount: 1, 
            ratePerDay: dailyRate.toFixed(2), // The "Amount per day" for this month
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
          monthlySplit // The detailed split sent to frontend
        }
      });
    }

    res.json({ success: true, data: processedRebates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const updateRebateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, amount } = req.body; // amount is now sent from frontend
    const warden_id = req.user.id;

    const rebate = await Rebate.findByPk(id);
    if (!rebate) return res.status(404).json({ success: false, message: 'Rebate not found' });

    if (status === 'approved') {
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Please provide a valid manual amount' });
      }

      await rebate.update({
        status: 'approved',
        amount: parseFloat(amount).toFixed(2),
        approved_by: warden_id
      });

      return res.json({ success: true, message: `Rebate approved for ₹${amount}` });
    }

    // Handle Rejection
    await rebate.update({ status: 'rejected', approved_by: warden_id });
    res.json({ success: true, message: 'Rebate rejected' });

  } catch (error) {
    console.error("Update Rebate Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const getLatestDailyRate = async (req, res) => {
  try {
    const latest = await DailyRateLog.findOne({
      where: { hostel_id: req.user.hostel_id },
      order: [['year', 'DESC'], ['month', 'DESC']]
    });
    res.json({ success: true, data: latest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
