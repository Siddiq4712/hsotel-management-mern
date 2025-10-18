const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { 
  sequelize, User, Enrollment, RoomAllotment, HostelRoom, RoomType, Session,
  Attendance, Leave, Complaint, Suspension, Holiday,Fee, MessBill
  // Note: Models not used in this controller have been removed from this import for clarity
} = require('../models');

// STUDENT ENROLLMENT
// STUDENT ENROLLMENT - MODIFIED
// STUDENT ENROLLMENT - MODIFIED
const enrollStudent = async (req, res) => {
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

    // Create enrollment for the student
    const enrollment = await Enrollment.create({
      student_id: student.id,
      hostel_id,
      session_id,
      requires_bed: requires_bed || false,
      initial_emi_status: requires_bed ? (paid_initial_emi ? 'paid' : 'pending') : 'not_required',
      college: college || 'nec', // Default to 'nec' if not provided
      roll_number: roll_number || null
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

// ROOM MANAGEMENT
const getAvailableRooms = async (req, res) => {
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

const allotRoom = async (req, res) => {
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
const getRoomOccupants = async (req, res) => {
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
const fetchAvailableRooms = async () => {
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

// DASHBOARD STATISTICS
const getDashboardStats = async (req, res) => {
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

const getMonthlyAttendance = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Get the total number of enrolled students for the calculation base
    const totalStudents = await User.count({ where: { role: 'student', hostel_id, is_active: true } });
    
    if (totalStudents === 0) {
      return res.json({ success: true, data: [] });
    }

    // Retrieve attendance counts per month (Present days are counted as 1 manday, Absent as 0)
    const monthlyAttendanceRaw = await Attendance.findAll({
      attributes: [
        [sequelize.fn('YEAR', sequelize.col('date')), 'year'],
        [sequelize.fn('MONTH', sequelize.col('date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('totalManDays')), 'totalPresentDays']
      ],
      where: {
        date: { [Op.gte]: threeMonthsAgo },
        '$Student.hostel_id$': hostel_id,
        totalManDays: { [Op.ne]: null } // Only count records where totalManDays is set (P/OD)
      },
      include: [{ model: User, as: 'Student', attributes: [], required: true }],
      group: ['year', 'month'],
      order: [['year', 'ASC'], ['month', 'ASC']],
      raw: true
    });

    const result = monthlyAttendanceRaw.map(record => {
      const totalDaysInMonth = new Date(record.year, record.month, 0).getDate();
      const maxPossibleMandays = totalStudents * totalDaysInMonth;
      const monthName = new Date(record.year, record.month - 1, 1).toLocaleString('default', { month: 'short' });
      
      const presentMandays = Number(record.totalPresentDays) || 0;
      
      // Present percentage calculation: (Total Mandays Present / Max Possible Mandays) * 100
      const presentPercentage = maxPossibleMandays > 0 
        ? Math.round((presentMandays / maxPossibleMandays) * 100)
        : 0;
      
      const absentPercentage = 100 - presentPercentage;

      return {
        month: monthName, // e.g., 'Oct'
        present: presentPercentage,
        absent: absentPercentage
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Monthly attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getMonthlyComplaints = async (req, res) => {
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

const getSessions = async (req, res) => {
  try {
    const sessions = await Session.findAll({ where: { is_active: true }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ATTENDANCE MANAGEMENT
const markAttendance = async (req, res) => {
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
const updateAttendance = async (req, res) => {
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
const bulkMarkAttendance = async (req, res) => {
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

const getAttendance = async (req, res) => {
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
const getLeaveRequests = async (req, res) => {
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

const getPendingLeaves = async (req, res) => {
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

const approveLeave = async (req, res) => {
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
const getComplaints = async (req, res) => {
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

const getPendingComplaints = async (req, res) => {
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

const updateComplaint = async (req, res) => {
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
const createSuspension = async (req, res) => {
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

const getSuspensions = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;

    const suspensions = await Suspension.findAll({
      include: [
        {
          model: User,
          as: 'Student',
          where: { hostel_id },
          attributes: ['id', 'username']
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

const updateSuspension = async (req, res) => {
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
const createHoliday = async (req, res) => {
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

const getHolidays = async (req, res) => {
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

const updateHoliday = async (req, res) => {
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

const deleteHoliday = async (req, res) => {
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
const createAdditionalCollection = async (req, res) => {
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
  return student.session || 'N/A';  // FIXED: Use direct student.session instead of tbl_Enrollments[0].session
};
const getStudents = async (req, res) => {
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
          as: 'tbl_Enrollments',
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
      plain.session = plain.tbl_Enrollments?.[0]?.Session?.name || 'N/A';
      // Existing college extraction
      plain.college = plain.tbl_Enrollments?.[0]?.college || 'N/A';
      delete plain.tbl_Enrollments; // Clean up nested enrollments
      return plain;
    });

    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
const getAdditionalCollections = async (req, res) => {
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
const generateMessBills = async (req, res) => {
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
const getMessBills = async (req, res) => {
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
const updateMessBillStatus = async (req, res) => {
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
const fetchDailyCosts = async (month, year) => {
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


module.exports = {
  // Student Enrollment
  enrollStudent,
  getStudents,
  // Room Management
  getAvailableRooms,
  allotRoom,
  // Dashboard
  getDashboardStats,
  getMonthlyAttendance, // <-- ADDED
  getMonthlyComplaints, // <-- ADDED
  getSessions,
  // Attendance Management
  markAttendance,
  getAttendance,
  bulkMarkAttendance,
  updateAttendance,
  // Leave Management - Updated
  getLeaveRequests,
  getPendingLeaves,
  approveLeave,
  // Complaint Management - Updated
  getComplaints,
  getPendingComplaints,
  updateComplaint,
  // Suspension Management
  createSuspension,
  getSuspensions,
  updateSuspension,
  // Holiday Management
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
  // Additional Collections
  createAdditionalCollection,
  getAdditionalCollections,
  //mess bill management
  generateMessBills,
  getMessBills,
  updateMessBillStatus,

  fetchDailyCosts,
  getRoomOccupants
};