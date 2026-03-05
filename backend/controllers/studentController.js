import { 
  User, HostelRoom, RoomType, MessBill, DailyMessCharge, MenuSchedule, MessDailyExpense, ExpenseType,
  Leave, Complaint, Transaction, Attendance, Token, Rebate,
  HostelFacilityRegister, HostelFacility, HostelFacilityType, Hostel, HostelLayout, RoomRequest,
  SpecialFoodItem, FoodOrder, FoodOrderItem, RoomAllotment, DailyConsumption, IncomeType, AdditionalIncome, StudentFee,
  DayReductionRequest
} from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import moment from 'moment';

// Custom rounding function: <= 0.20 rounds down, > 0.20 rounds up
function customRounding(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return 0;

  const integerPart = Math.floor(num);
  const fractionalPart = num - integerPart;

  if (fractionalPart <= 0.20) {
    return integerPart;
  } else {
    return Math.ceil(num);
  }
}

/* ---------- PROFILE MANAGEMENT ---------- */

export const getProfile = async (req, res) => {
  try {
    const student = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: RoomAllotment,
          as: 'tbl_RoomAllotments', 
          where: { is_active: true },
          required: false,
          include: [
            {
              model: HostelRoom,
              as: 'HostelRoom',
              include: [{ 
                model: RoomType,
                as: 'RoomType'
              }]
            }
          ]
        },
        {
          model: Hostel,
          as: 'Hostel',
          attributes: ['id', 'name', 'address', 'contact_number', 'annual_fee_amount', 'show_fee_reminder']
        }
      ]
    });

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const getRoommates = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const studentAllotment = await RoomAllotment.findOne({
      where: { 
        student_id: studentId, 
        is_active: true 
      },
      include: [
        {
          model: HostelRoom,
          as: 'HostelRoom'
        }
      ]
    });

    if (!studentAllotment || !studentAllotment.HostelRoom) {
      return res.json({ success: true, data: [] });
    }

    const roomId = studentAllotment.HostelRoom.id;

    const roomAllotments = await RoomAllotment.findAll({
      where: { 
        room_id: roomId, 
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

    const roommates = roomAllotments
      .filter(allotment => allotment.AllotmentStudent.id !== studentId)
      .map(allotment => allotment.AllotmentStudent);

    res.json({ success: true, data: roommates });
  } catch (error) {
    console.error('Error fetching roommates:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const student = await User.findByPk(req.user.userId);
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (username && username !== student.userName) {
      const existingUser = await User.findOne({
        where: { userName: username, userId: { [Op.ne]: req.user.userId } }
      });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
      }
    }

    if (email && email !== student.userMail) {
      const existingUser = await User.findOne({
        where: { userMail: email, userId: { [Op.ne]: req.user.userId } }
      });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }

    const updateData = {};
    if (username) updateData.userName = username;
    if (email) updateData.userMail = email;

    await student.update(updateData);

    const updatedStudent = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({ 
      success: true, 
      data: updatedStudent,
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------- MESS BILLS MANAGEMENT ---------- */

export const getMessBills = async (req, res) => {
  try {
    const student_id = req.user.userId;
    const { status, month, year } = req.query;

    let whereClause = { student_id };
    if (status && status !== 'all') whereClause.status = status;
    if (month) whereClause.month = parseInt(month);
    if (year) whereClause.year = parseInt(year);

    const bills = await MessBill.findAll({
      where: whereClause,
      order: [['year', 'DESC'], ['month', 'DESC']],
      include: [
        {
          model: User,
          as: 'MessBillStudent',
          attributes: ['userId', 'userName'],
        },
      ],
    });

    res.json({ success: true, data: bills });
  } catch (error) {
    console.error('Mess bills fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const getMessBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await MessBill.findOne({
      where: { id, student_id: req.user.userId }
    });
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    res.json({ success: true, data: bill });
  } catch (error) {
    console.error('Mess bill fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyMessCharges = async (req, res) => {
  try {
    const student_id = req.user.userId;
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const charges = await MessCharge.findAll({
      where: {
        student_id,
        date: {
          [Op.between]: [
            `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
            `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`
          ]
        }
      },
      order: [['date', 'ASC']]
    });

    res.json({ success: true, data: charges });
  } catch (error) {
    console.error('Mess charges fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------- LEAVE MANAGEMENT ---------- */

export const applyLeave = async (req, res) => {
  try {
    const { leave_type, from_date, to_date, reason } = req.body;
    if (!leave_type || !from_date || !to_date || !reason) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (new Date(from_date) > new Date(to_date)) {
      return res.status(400).json({ success: false, message: 'From date cannot be after to date' });
    }

    const leave = await Leave.create({
      student_id: req.user.userId,
      leave_type,
      from_date,
      to_date,
      reason,
      status: 'pending'
    });

    const createdLeave = await Leave.findByPk(leave.id, {
      include: [{ model: User, as: 'Student', attributes: ['userId', 'userName', 'userMail'] }]
    });

    res.status(201).json({ success: true, data: createdLeave, message: 'Leave application submitted successfully' });
  } catch (error) {
    console.error('Leave application error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const { status, from_date, to_date } = req.query;
    let whereClause = { student_id: req.user.userId };
    if (status && status !== 'all') whereClause.status = status;
    if (from_date && to_date) whereClause.createdAt = { [Op.between]: [from_date, to_date] };

    const leaves = await Leave.findAll({
      where: whereClause,
      include: [{ model: User, as: 'ApprovedBy', attributes: ['userId', 'userName'], required: false }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Leaves fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getLeaveById = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findOne({
      where: { id, student_id: req.user.userId },
      include: [{ model: User, as: 'ApprovedBy', attributes: ['userId', 'userName'], required: false }]
    });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    res.json({ success: true, data: leave });
  } catch (error) {
    console.error('Leave fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { leave_type, from_date, to_date, reason } = req.body;
    const leave = await Leave.findOne({ where: { id, student_id: req.user.userId } });
    
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'pending') return res.status(400).json({ success: false, message: 'Cannot update processed leave' });

    const newFromDate = from_date || leave.from_date;
    const newToDate = to_date || leave.to_date;
    if (new Date(newFromDate) > new Date(newToDate)) {
      return res.status(400).json({ success: false, message: 'From date cannot be after to date' });
    }

    await leave.update({ leave_type, from_date, to_date, reason });
    const updatedLeave = await Leave.findByPk(id, {
      include: [{ model: User, as: 'ApprovedBy', attributes: ['userId', 'userName'], required: false }]
    });

    res.json({ success: true, data: updatedLeave, message: 'Leave request updated successfully' });
  } catch (error) {
    console.error('Leave update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findOne({ where: { id, student_id: req.user.userId } });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'pending') return res.status(400).json({ success: false, message: 'Cannot delete processed leave' });

    await leave.destroy();
    res.json({ success: true, message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Leave deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------- COMPLAINT MANAGEMENT ---------- */

export const createComplaint = async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;
    if (!subject || !description || !category) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const complaint = await Complaint.create({
      student_id: req.user.userId,
      subject,
      description,
      category,
      priority: priority || 'medium',
      status: 'submitted'
    });

    const createdComplaint = await Complaint.findByPk(complaint.id, {
      include: [{ model: User, as: 'Student', attributes: ['userId', 'userName', 'userMail'] }]
    });

    res.status(201).json({ success: true, data: createdComplaint, message: 'Complaint submitted successfully' });
  } catch (error) {
    console.error('Complaint creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyComplaints = async (req, res) => {
  try {
    const { status, category, priority, from_date, to_date } = req.query;
    let whereClause = { student_id: req.user.userId };
    if (status && status !== 'all') whereClause.status = status;
    if (category && category !== 'all') whereClause.category = category;
    if (priority && priority !== 'all') whereClause.priority = priority;
    if (from_date && to_date) whereClause.createdAt = { [Op.between]: [from_date, to_date] };

    const complaints = await Complaint.findAll({
      where: whereClause,
      include: [{ model: User, as: 'AssignedTo', attributes: ['userId', 'userName'], required: false }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: complaints });
  } catch (error) {
    console.error('Complaints fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findOne({
      where: { id, student_id: req.user.userId },
      include: [{ model: User, as: 'AssignedTo', attributes: ['userId', 'userName'], required: false }]
    });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, data: complaint });
  } catch (error) {
    console.error('Complaint fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, description, category, priority } = req.body;
    const complaint = await Complaint.findOne({ where: { id, student_id: req.user.userId } });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.status !== 'submitted') return res.status(400).json({ success: false, message: 'Processing complaint cannot be updated' });

    await complaint.update({ subject, description, category, priority });
    const updatedComplaint = await Complaint.findByPk(id, {
      include: [{ model: User, as: 'AssignedTo', attributes: ['userId', 'userName'], required: false }]
    });

    res.json({ success: true, data: updatedComplaint, message: 'Complaint updated' });
  } catch (error) {
    console.error('Complaint update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findOne({ where: { id, student_id: req.user.userId } });
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.status !== 'submitted') return res.status(400).json({ success: false, message: 'Processing complaint cannot be deleted' });

    await complaint.destroy();
    res.json({ success: true, message: 'Complaint deleted' });
  } catch (error) {
    console.error('Complaint deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------- TRANSACTION HISTORY ---------- */

export const getTransactions = async (req, res) => {
  try {
    const { transaction_type, status, from_date, to_date } = req.query;
    let whereClause = { student_id: req.user.userId };
    if (transaction_type && transaction_type !== 'all') whereClause.transaction_type = transaction_type;
    if (status && status !== 'all') whereClause.status = status;
    if (from_date && to_date) whereClause.createdAt = { [Op.between]: [from_date, to_date] };

    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [{ model: User, as: 'ProcessedBy', attributes: ['userId', 'userName'], required: false }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findOne({
      where: { id, student_id: req.user.userId },
      include: [{ model: User, as: 'ProcessedBy', attributes: ['userId', 'userName'], required: false }]
    });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------- ATTENDANCE ---------- */

export const getMyAttendance = async (req, res) => {
  try {
    const { from_date, to_date, status } = req.query;
    let whereClause = { student_id: req.user.userId };
    if (status && status !== 'all') whereClause.status = status;
    if (from_date && to_date) whereClause.date = { [Op.between]: [from_date, to_date] };

    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [{ model: User, as: 'MarkedBy', attributes: ['userId', 'userName'] }],
      order: [['date', 'DESC']]
    });
    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Attendance fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------- FACILITY USAGE ---------- */

export const getFacilities = async (req, res) => {
  try {
    let whereClause = { 
      hostel_id: req.user.hostel_id,
      status: 'active'
    };
    const facilities = await HostelFacility.findAll({
      where: whereClause,
      include: [{ model: HostelFacilityType, as: 'HostelFacilityType', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: facilities });
  } catch (error) {
    console.error('Facilities fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const useFacility = async (req, res) => {
  try {
    const { facility_id, duration_minutes, remarks } = req.body;
    if (!facility_id || !duration_minutes) return res.status(400).json({ success: false, message: 'Required fields missing' });

    const facility = await HostelFacility.findOne({
      where: { id: facility_id, hostel_id: req.user.hostel_id, status: 'active' }
    });
    if (!facility) return res.status(400).json({ success: false, message: 'Facility not available' });

    const cost = (facility.cost_per_use * (duration_minutes / 60)) || facility.cost_per_use || 0;
    const facilityUsage = await HostelFacilityRegister.create({
      facility_id,
      student_id: req.user.userId,
      duration_minutes,
      cost: cost.toFixed(2),
      remarks
    });

    const usageWithDetails = await HostelFacilityRegister.findByPk(facilityUsage.id, {
      include: [{ 
        model: HostelFacility, 
        as: 'facility', 
        attributes: ['id', 'name'],
        include: [{ model: HostelFacilityType, as: 'HostelFacilityType', attributes: ['id', 'name'] }]
      }]
    });

    res.status(201).json({ success: true, data: usageWithDetails, message: 'Facility usage recorded' });
  } catch (error) {
    console.error('Facility usage error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const getMyFacilityUsage = async (req, res) => {
  try {
    let whereClause = { student_id: req.user.userId };
    const { facility_id, from_date, to_date } = req.query;
    if (facility_id && facility_id !== 'all') whereClause.facility_id = facility_id;
    if (from_date && to_date) whereClause.usage_date = { [Op.between]: [from_date, to_date] };

    const usage = await HostelFacilityRegister.findAll({
      where: whereClause,
      include: [{
        model: HostelFacility,
        as: 'facility',
        attributes: ['id', 'name'],
        include: [{ model: HostelFacilityType, as: 'HostelFacilityType', attributes: ['id', 'name'] }]
      }],
      order: [['usage_date', 'DESC']]
    });
    res.json({ success: true, data: usage });
  } catch (error) {
    console.error('Facility usage fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const getFacilityUsageById = async (req, res) => {
  try {
    const { id } = req.params;
    const usage = await HostelFacilityRegister.findOne({
      where: { id, student_id: req.user.userId },
      include: [{
        model: HostelFacility,
        as: 'facility',
        attributes: ['id', 'name'],
        include: [{ model: HostelFacilityType, as: 'HostelFacilityType', attributes: ['id', 'name'] }]
      }]
    });
    if (!usage) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: usage });
  } catch (error) {
    console.error('Facility usage fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateFacilityUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration_minutes, remarks } = req.body;
    const usage = await HostelFacilityRegister.findOne({ where: { id, student_id: req.user.userId } });
    if (!usage) return res.status(404).json({ success: false, message: 'Record not found' });

    const hoursDiff = (new Date() - new Date(usage.usage_date)) / (1000 * 60 * 60);
    if (hoursDiff > 24) return res.status(400).json({ success: false, message: 'Cannot update after 24 hours' });

    const updateData = { remarks };
    if (duration_minutes) {
      const facility = await HostelFacility.findByPk(usage.facility_id);
      const newCost = (facility.cost_per_use * (duration_minutes / 60)) || facility.cost_per_use || 0;
      updateData.duration_minutes = duration_minutes;
      updateData.cost = newCost.toFixed(2);
    }

    await usage.update(updateData);
    const updatedUsage = await HostelFacilityRegister.findByPk(id, {
      include: [{
        model: HostelFacility,
        as: 'facility',
        attributes: ['id', 'name'],
        include: [{ model: HostelFacilityType, as: 'HostelFacilityType', attributes: ['id', 'name'] }]
      }]
    });
    res.json({ success: true, data: updatedUsage, message: 'Updated successfully' });
  } catch (error) {
    console.error('Facility usage update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteFacilityUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const usage = await HostelFacilityRegister.findOne({ where: { id, student_id: req.user.userId } });
    if (!usage) return res.status(404).json({ success: false, message: 'Record not found' });

    const hoursDiff = (new Date() - new Date(usage.usage_date)) / (1000 * 60 * 60);
    if (hoursDiff > 24) return res.status(400).json({ success: false, message: 'Cannot delete after 24 hours' });

    await usage.destroy();
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Facility usage deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------- MEAL TOKENS ---------- */

export const getMyTokens = async (req, res) => {
  try {
    const { meal_type, status, from_date, to_date } = req.query;
    let whereClause = { student_id: req.user.userId };
    if (meal_type && meal_type !== 'all') whereClause.meal_type = meal_type;
    if (status && status !== 'all') whereClause.status = status;
    if (from_date && to_date) whereClause.token_date = { [Op.between]: [from_date, to_date] };

    const tokens = await Token.findAll({ where: whereClause, order: [['token_date', 'DESC']] });
    res.json({ success: true, data: tokens });
  } catch (error) {
    console.error('Tokens fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getTokenById = async (req, res) => {
  try {
    const { id } = req.params;
    const token = await Token.findOne({ where: { id, student_id: req.user.userId } });
    if (!token) return res.status(404).json({ success: false, message: 'Token not found' });
    res.json({ success: true, data: token });
  } catch (error) {
    console.error('Token fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------- DASHBOARD & CHARTS ---------- */

export const getDashboardStats = async (req, res) => {
  try {
    const student_id = req.user.userId;
    const stats = {
      totalLeaves: await Leave.count({ where: { student_id } }),
      pendingLeaves: await Leave.count({ where: { student_id, status: 'pending' } }),
      totalComplaints: await Complaint.count({ where: { student_id } }),
      pendingComplaints: await Complaint.count({ where: { student_id, status: ['submitted', 'in_progress'] } }),
      totalTransactions: await Transaction.count({ where: { student_id } }),
      facilityUsageCount: await HostelFacilityRegister.count({ where: { student_id } }),
      pendingBills: await MessBill.count({ where: { student_id, status: 'pending' } }),
      recentLeaves: await Leave.findAll({ where: { student_id }, order: [['createdAt', 'DESC']], limit: 5 }),
      recentComplaints: await Complaint.findAll({ where: { student_id }, order: [['createdAt', 'DESC']], limit: 5 })
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAvailableSpecialFoodItems = async (req, res) => {
  try {
    const { category } = req.query;
    let whereClause = { is_available: true };
    if (category) whereClause.category = category;
    const items = await SpecialFoodItem.findAll({ where: whereClause, order: [['name', 'ASC']] });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching special food items:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const getSpecialFoodItemCategories = async (req, res) => {
  try {
    const categories = await SpecialFoodItem.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      where: { is_available: true },
      order: [['category', 'ASC']]
    });
    res.json({ success: true, data: categories.map(c => c.category) });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyDailyMessCharges = async (req, res) => {
  try {
    const { month, year } = req.query;
    const student_id = req.user.userId;
    const hostel_id = req.user.hostel_id;

    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year required' });

    const startDate = moment({ year, month: month - 1 }).startOf('month').toDate();
    const endDate = moment().isSame(moment({ year, month: month - 1 }), 'month')
      ? moment().endOf('day').toDate()
      : moment({ year, month: month - 1 }).endOf('month').toDate();

    const hostelManDaysData = await Attendance.findAll({
      attributes: [[sequelize.fn('SUM', sequelize.col('totalManDays')), 'manDays']],
      where: { hostel_id, date: { [Op.between]: [startDate, endDate] } },
      raw: true
    });
    const totalHostelManDays = hostelManDaysData[0] ? parseInt(hostelManDaysData[0].manDays) : 0;

    const totalFoodIngredientCost = (await DailyConsumption.sum('total_cost', { where: { hostel_id, consumption_date: { [Op.between]: [startDate, endDate] } } })) || 0;
    const totalOtherMessExpenses = (await MessDailyExpense.sum('amount', { where: { hostel_id, expense_date: { [Op.between]: [startDate, endDate] } } })) || 0;
    const grandTotalGrossExpenses = totalFoodIngredientCost + totalOtherMessExpenses;

    const cashTokenIncomeType = await IncomeType.findOne({ where: { name: 'Cash Token' } });
    const cashTokenAmount = cashTokenIncomeType ? (await AdditionalIncome.sum('amount', { where: { hostel_id, income_type_id: cashTokenIncomeType.id, received_date: { [Op.between]: [startDate, endDate] } } })) || 0 : 0;

    const sisterConcernIncomeType = await IncomeType.findOne({ where: { name: 'Sister Concern Bill' } });
    const creditTokenAmount = sisterConcernIncomeType ? (await AdditionalIncome.sum('amount', { where: { hostel_id, income_type_id: sisterConcernIncomeType.id, received_date: { [Op.between]: [startDate, endDate] } } })) || 0 : 0;

    const totalDeductions = cashTokenAmount + creditTokenAmount;
    const netMessCost = grandTotalGrossExpenses - totalDeductions;
    const monthlyCalculatedDailyRate = totalHostelManDays > 0 ? netMessCost / totalHostelManDays : 0;

    const attendanceRecords = await Attendance.findAll({
      where: { student_id, date: { [Op.between]: [startDate, endDate] } },
      attributes: ['date', 'status', 'totalManDays'],
      raw: true
    });
    const attendanceMap = new Map(attendanceRecords.map(att => [moment(att.date).format('YYYY-MM-DD'), att]));

    const dailyCharges = [];
    let currentDate = moment(startDate);
    while (currentDate.isSameOrBefore(moment().startOf('day')) && currentDate.isSameOrBefore(moment(endDate))) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const att = attendanceMap.get(dateStr) || { status: 'A', totalManDays: 0 };
      const baseMessCharge = (att.status === 'P' || att.status === 'OD') ? monthlyCalculatedDailyRate : 0;
      
      dailyCharges.push({
        id: dateStr,
        date: dateStr,
        attendance_status: att.status,
        baseMessCharge: parseFloat(baseMessCharge.toFixed(2)),
        dailyTotalCharge: parseFloat(baseMessCharge.toFixed(2))
      });
      currentDate.add(1, 'day');
    }

    res.json({
      success: true,
      data: {
        dailyCharges,
        monthlySummary: {
          monthlyCalculatedDailyRate: parseFloat(monthlyCalculatedDailyRate.toFixed(2)),
          studentTotalManDaysForMonth: attendanceRecords.reduce((sum, att) => sum + parseInt(att.totalManDays || 0), 0)
        }
      }
    });
  } catch (error) {
    console.error('Charges fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMonthlyMessExpensesChartData = async (req, res) => {
  try {
    const student_id = req.user.userId;
    const twelveMonthsAgo = moment().subtract(11, 'months').startOf('month');
    const monthlyExpenses = await MessBill.findAll({
      attributes: ['year', 'month', [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']],
      where: {
        student_id,
        [Op.or]: [
          { year: { [Op.gt]: twelveMonthsAgo.year() } },
          { year: twelveMonthsAgo.year(), month: { [Op.gte]: twelveMonthsAgo.month() + 1 } }
        ]
      },
      group: ['year', 'month'],
      order: [['year', 'ASC'], ['month', 'ASC']],
      raw: true
    });
    res.json({ success: true, data: monthlyExpenses });
  } catch (error) {
    console.error('Chart data error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMonthlyAttendanceChartData = async (req, res) => {
  try {
    const student_id = req.user.userId;
    const twelveMonthsAgo = moment().subtract(11, 'months').startOf('month');
    const monthlyAttendance = await Attendance.findAll({
      attributes: [
        [sequelize.fn('YEAR', sequelize.col('date')), 'year'],
        [sequelize.fn('MONTH', sequelize.col('date')), 'month'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'P' THEN 1 ELSE 0 END")), 'present_days'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'A' THEN 1 ELSE 0 END")), 'absent_days'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'OD' THEN 1 ELSE 0 END")), 'on_duty_days']
      ],
      where: { student_id, date: { [Op.gte]: twelveMonthsAgo.format('YYYY-MM-DD') } },
      group: [sequelize.fn('YEAR', sequelize.col('date')), sequelize.fn('MONTH', sequelize.col('date'))],
      order: [[sequelize.fn('YEAR', sequelize.col('date')), 'ASC'], [sequelize.fn('MONTH', sequelize.col('date')), 'ASC']],
      raw: true
    });
    res.json({ success: true, data: monthlyAttendance });
  } catch (error) {
    console.error('Attendance chart data error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------- LAYOUT & BOOKING ---------- */

const ensureStudentHostel = (req) => {
  const hostelId = req.user?.hostel_id;
  if (!hostelId) throw new Error("Student is not linked to a hostel.");
  return hostelId;
};

export const getStudentHostelLayout = async (req, res) => {
  try {
    const hostel_id = ensureStudentHostel(req);
    const layout = await HostelLayout.findOne({ where: { hostel_id } });
    res.json({ success: true, data: layout });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStudentRooms = async (req, res) => {
  try {
    const hostel_id = ensureStudentHostel(req);
    const rooms = await HostelRoom.findAll({
      where: { hostel_id, is_active: true },
      include: [{ model: RoomType, as: 'RoomType' }],
      order: [["room_number", "ASC"]]
    });
    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStudentRoomTypes = async (req, res) => {
  try {
    const hostel_id = ensureStudentHostel(req);
    const types = await RoomType.findAll({ where: { hostel_id }, order: [["name", "ASC"]] });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStudentRoomOccupants = async (req, res) => {
  try {
    const hostel_id = ensureStudentHostel(req);
    const { id } = req.params;
    const allotments = await RoomAllotment.findAll({
      where: { room_id: id, is_active: true },
      include: [{ model: User, as: "AllotmentStudent", attributes: ["userId", "userName", "userMail", "roll_number", "profile_picture"] }]
    });
    const occupants = allotments.map((row) => ({
      user_id: row.student_id,
      username: row.AllotmentStudent.userName,
      email: row.AllotmentStudent.userMail,
      roll_number: row.AllotmentStudent.roll_number,
      profile_picture: row.AllotmentStudent.profile_picture
    }));
    res.json({ success: true, data: occupants });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyRoomRequests = async (req, res) => {
  try {
    const requests = await RoomRequest.findAll({ where: { student_id: req.user.userId }, order: [["createdAt", "DESC"]] });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const requestRoomBooking = async (req, res) => {
  try {
    const hostel_id = ensureStudentHostel(req);
    const { room_id } = req.body;
    const student_id = req.user.userId;

    const existingAllotment = await RoomAllotment.findOne({ where: { student_id, is_active: true } });
    if (existingAllotment) return res.status(400).json({ success: false, message: "Active allotment exists" });

    const room = await HostelRoom.findOne({ where: { id: room_id, hostel_id, is_active: true } });
    if (!room) return res.status(404).json({ success: false, message: "Room unavailable" });

    const pendingRequest = await RoomRequest.findOne({ where: { student_id, status: 'pending' } });
    if (pendingRequest) return res.status(400).json({ success: false, message: "Pending request exists" });

    const request = await RoomRequest.create({ hostel_id, student_id, room_id, status: "pending", requested_at: new Date() });
    res.status(201).json({ success: true, data: request, message: "Request submitted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelRoomRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RoomRequest.findOne({ where: { id, student_id: req.user.userId } });
    if (!request || request.status !== "pending") throw new Error("Invalid cancellation");
    await request.update({ status: "cancelled" });
    res.json({ success: true, message: "Cancelled" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/* ---------- DAY REDUCTION & REBATE ---------- */

export const applyDayReduction = async (req, res) => {
  try {
    const { from_date, to_date, reason } = req.body;
    const student_id = req.user.userId;
    const hostel_id = req.user.hostel_id;
    if (!hostel_id) return res.status(400).json({ success: false, message: 'No hostel assigned' });

    const newRequest = await DayReductionRequest.create({ student_id, hostel_id, from_date, to_date, reason, status: 'pending_admin' });
    res.status(201).json({ success: true, data: newRequest, message: 'Submitted for review' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyDayReductionRequests = async (req, res) => {
  try {
    const student_id = req.user.userId;
    const requests = await DayReductionRequest.findAll({
      where: { student_id },
      include: [
        { model: User, as: 'AdminProcessor', attributes: ['userName'], required: false },
        { model: Hostel, as: 'Hostel', attributes: ['name'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const applyRebate = async (req, res) => {
  try {
    const student_id = req.user.userId;
    const { rebate_type, from_date, to_date, reason } = req.body;
    const rebate = await Rebate.create({ student_id, rebate_type, from_date, to_date, reason, amount: 0.00, status: 'pending' });
    res.status(201).json({ success: true, message: 'Submitted', data: rebate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyRebates = async (req, res) => {
  try {
    const rebates = await Rebate.findAll({ where: { student_id: req.user.userId }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: rebates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

