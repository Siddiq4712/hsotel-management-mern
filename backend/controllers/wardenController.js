const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { 
  sequelize, User, Enrollment, RoomAllotment, HostelRoom, RoomType, Session,
  Attendance, Leave, Complaint, Suspension, Holiday
  // Note: Models not used in this controller have been removed from this import for clarity
} = require('../models');

// STUDENT ENROLLMENT
const enrollStudent = async (req, res) => {
  try {
    const { username, password, session_id, email } = req.body;
    const hostel_id = req.user.hostel_id;

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const student = await User.create({
      username,
      email: email || `${username}@hostel.com`,
      password: hashedPassword,
      role: 'student',
      hostel_id
    });

    const enrollment = await Enrollment.create({
      student_id: student.id,
      hostel_id,
      session_id
    });

    res.status(201).json({ 
      success: true,
      data: { student: { ...student.toJSON(), password: undefined }, enrollment },
      message: 'Student enrolled successfully'
    });
  } catch (error) {
    console.error('Student enrollment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
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
            attributes: ['room_number']
          }]
        }
      ],
      order: [
        [{ model: RoomAllotment, as: 'tbl_RoomAllotments' }, HostelRoom, 'room_number', 'ASC'],
        ['username', 'ASC']
      ]
    });

    // Convert to plain objects to prevent circular reference errors
    const students = studentsWithModels.map(instance => instance.get({ plain: true }));

    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
    const { room_id } = req.params;
    const occupants = await RoomAllotment.findAll({
      where: { room_id, is_active: true },
      include: [{
        model: User,
        as: 'AllotmentStudent',
        attributes: ['id', 'username', 'email']
      }]
    });
    res.json({ success: true, data: occupants });
  } catch (error) {
    console.error('Error fetching room occupants:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DASHBOARD STATISTICS
const getDashboardStats = async (req, res) => {
  try {
    const hostel_id = req.user.hostel_id;
    const totalStudents = await User.count({ where: { role: 'student', hostel_id, is_active: true } });
    const totalRooms = await HostelRoom.count({ where: { hostel_id, is_active: true } });
    
    const totalCapacityResult = await HostelRoom.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('RoomType.capacity')), 'totalCapacity']],
        include: [{ model: RoomType, attributes: [], required: true }],
        where: { hostel_id, is_active: true },
        raw: true
    });
    const totalCapacity = totalCapacityResult ? Number(totalCapacityResult.totalCapacity) : 0;
    const occupiedBeds = await HostelRoom.sum('occupancy_count', { where: { hostel_id, is_active: true } }) || 0;
    const availableBeds = totalCapacity - occupiedBeds;

    const pendingLeaves = await Leave.count({
      where: { status: 'pending' },
      include: [{ model: User, as: 'Student', where: { hostel_id }, attributes: [] }]
    });
    const pendingComplaints = await Complaint.count({
      where: { status: ['submitted', 'in_progress'] },
      include: [{ model: User, as: 'Student', where: { hostel_id }, attributes: [] }]
    });
    const recentLeaves = await Leave.findAll({
      where: { createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      include: [{ model: User, as: 'Student', where: { hostel_id }, attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    const recentComplaints = await Complaint.findAll({
      where: { createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      include: [{ model: User, as: 'Student', where: { hostel_id }, attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    res.json({
      success: true,
      data: {
        totalStudents, totalRooms, occupiedBeds, availableBeds,
        pendingLeaves, pendingComplaints, recentLeaves, recentComplaints
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

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
    try {
        const { student_id, date, status, from_date, to_date, reason, remarks } = req.body;
        const marked_by = req.user.id;
        const attendanceData = { student_id, date, status, marked_by, reason, remarks, from_date: status === 'OD' ? from_date : null, to_date: status === 'OD' ? to_date : null };
        const [attendance, created] = await Attendance.findOrCreate({ where: { student_id, date }, defaults: attendanceData });
        if (!created) await attendance.update(attendanceData);

        if (status === 'OD' && from_date && to_date) {
            const startDate = new Date(from_date);
            const endDate = new Date(to_date);
            for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
                const currentDate = d.toISOString().split('T')[0];
                if (currentDate === date) continue;
                await Attendance.upsert({ student_id, date: currentDate, status: 'OD', from_date, to_date, marked_by, reason, remarks });
            }
        }
        res.json({ success: true, data: attendance, message: 'Attendance marked successfully' });
    } catch (error) {
        console.error('Attendance marking error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const bulkMarkAttendance = async (req, res) => {
    const { date, attendanceData } = req.body;
    const marked_by = req.user.id;
    const transaction = await sequelize.transaction();
    try {
        if (!date || !Array.isArray(attendanceData)) throw new Error("Date and attendance data are required.");
        for (const record of attendanceData) {
            await Attendance.upsert({ student_id: record.student_id, date: date, status: record.status, marked_by }, { transaction });
        }
        await transaction.commit();
        res.json({ success: true, message: 'Attendance saved successfully.' });
    } catch (error) {
        await transaction.rollback();
        console.error('Bulk attendance marking error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
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

module.exports = {
  // Student Enrollment
  enrollStudent,
  getStudents,
  // Room Management
  getAvailableRooms,
  allotRoom,
  // Dashboard
  getDashboardStats,
  getSessions,
  // Attendance Management
  markAttendance,
  getAttendance,
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
  getAdditionalCollections
};
