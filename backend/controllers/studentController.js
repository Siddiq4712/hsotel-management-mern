// controllers/studentController.js
const { 
  User, HostelRoom, RoomType, MessBill, MessCharge,
  Leave, Complaint, Transaction, Attendance, Token,
  HostelFacilityRegister, HostelFacility, HostelFacilityType, Hostel
} = require('../models');
const { Op } = require('sequelize');

//const { Op } = require('sequelize');

// PROFILE MANAGEMENT
const getProfile = async (req, res) => {
  try {
    const student = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: RoomAllotment,
          as: 'RoomAllotments',
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
          attributes: ['id', 'name', 'address', 'contact_number']
        }
      ]
    });

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    
    const student = await User.findByPk(req.user.id);
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Check if username/email already exists for other users
    if (username && username !== student.username) {
      const existingUser = await User.findOne({
        where: { username, id: { [Op.ne]: req.user.id } }
      });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username already exists' 
        });
      }
    }

    if (email && email !== student.email) {
      const existingUser = await User.findOne({
        where: { email, id: { [Op.ne]: req.user.id } }
      });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already exists' 
        });
      }
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    await student.update(updateData);

    const updatedStudent = await User.findByPk(req.user.id, {
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

// MESS BILLS MANAGEMENT
const getMessBills = async (req, res) => {
  try {
    const student_id = req.user.id;
    const { status, year, month } = req.query;

    let whereClause = { student_id };
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (year) {
      whereClause.year = year;
    }
    
    if (month) {
      whereClause.month = month;
    }

    const bills = await MessBill.findAll({
      where: whereClause,
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    res.json({ success: true, data: bills });
  } catch (error) {
    console.error('Mess bills fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMessBillById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const bill = await MessBill.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      }
    });
    
    if (!bill) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bill not found' 
      });
    }

    res.json({ success: true, data: bill });
  } catch (error) {
    console.error('Mess bill fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMyMessCharges = async (req, res) => {
  try {
    const student_id = req.user.id;
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

// LEAVE MANAGEMENT - Complete CRUD
const applyLeave = async (req, res) => {
  try {
    const { leave_type, from_date, to_date, reason } = req.body;

    if (!leave_type || !from_date || !to_date || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Validate dates
    if (new Date(from_date) > new Date(to_date)) {
      return res.status(400).json({ 
        success: false, 
        message: 'From date cannot be after to date' 
      });
    }

    const leave = await Leave.create({
      student_id: req.user.id,
      leave_type,
      from_date,
      to_date,
      reason,
      status: 'pending'
    });

    // Fetch the created leave with associations
    const createdLeave = await Leave.findByPk(leave.id, {
      include: [
        {
          model: User,
          as: 'Student',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    res.status(201).json({ 
      success: true, 
      data: createdLeave,
      message: 'Leave application submitted successfully' 
    });
  } catch (error) {
    console.error('Leave application error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMyLeaves = async (req, res) => {
  try {
    const { status, from_date, to_date } = req.query;
    
    let whereClause = { student_id: req.user.id };
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (from_date && to_date) {
      whereClause.createdAt = {
        [Op.between]: [from_date, to_date]
      };
    }

    const leaves = await Leave.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'ApprovedBy',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Leaves fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getLeaveById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const leave = await Leave.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      },
      include: [
        {
          model: User,
          as: 'ApprovedBy',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });
    
    if (!leave) {
      return res.status(404).json({ 
        success: false, 
        message: 'Leave request not found' 
      });
    }

    res.json({ success: true, data: leave });
  } catch (error) {
    console.error('Leave fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { leave_type, from_date, to_date, reason } = req.body;

    const leave = await Leave.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      }
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
        message: 'Cannot update processed leave request' 
      });
    }

    const updateData = {};
    if (leave_type) updateData.leave_type = leave_type;
    if (from_date) updateData.from_date = from_date;
    if (to_date) updateData.to_date = to_date;
    if (reason) updateData.reason = reason;

    // Validate dates if provided
    const newFromDate = from_date || leave.from_date;
    const newToDate = to_date || leave.to_date;
    
    if (new Date(newFromDate) > new Date(newToDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'From date cannot be after to date' 
      });
    }

    await leave.update(updateData);

    const updatedLeave = await Leave.findByPk(id, {
      include: [
        {
          model: User,
          as: 'ApprovedBy',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      data: updatedLeave,
      message: 'Leave request updated successfully' 
    });
  } catch (error) {
    console.error('Leave update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await Leave.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      }
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
        message: 'Cannot delete processed leave request' 
      });
    }

    await leave.destroy();
    
    res.json({ 
      success: true, 
      message: 'Leave request deleted successfully' 
    });
  } catch (error) {
    console.error('Leave deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// COMPLAINT MANAGEMENT - Complete CRUD
const createComplaint = async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;

    if (!subject || !description || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject, description, and category are required' 
      });
    }

    const complaint = await Complaint.create({
      student_id: req.user.id,
      subject,
      description,
      category,
      priority: priority || 'medium',
      status: 'submitted'
    });

    // Fetch the created complaint with associations
    const createdComplaint = await Complaint.findByPk(complaint.id, {
      include: [
        {
          model: User,
          as: 'Student',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    res.status(201).json({ 
      success: true, 
      data: createdComplaint,
      message: 'Complaint submitted successfully' 
    });
  } catch (error) {
    console.error('Complaint creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    const { status, category, priority, from_date, to_date } = req.query;
    
    let whereClause = { student_id: req.user.id };
    
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
          as: 'AssignedTo',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: complaints });
  } catch (error) {
    console.error('Complaints fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const complaint = await Complaint.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      },
      include: [
        {
          model: User,
          as: 'AssignedTo',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });
    
    if (!complaint) {
      return res.status(404).json({ 
        success: false, 
        message: 'Complaint not found' 
      });
    }

    res.json({ success: true, data: complaint });
  } catch (error) {
    console.error('Complaint fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, description, category, priority } = req.body;

    const complaint = await Complaint.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      }
    });
    
    if (!complaint) {
      return res.status(404).json({ 
        success: false, 
        message: 'Complaint not found' 
      });
    }

    if (complaint.status !== 'submitted') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot update complaint that is being processed' 
      });
    }

    const updateData = {};
    if (subject) updateData.subject = subject;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (priority) updateData.priority = priority;

    await complaint.update(updateData);

    const updatedComplaint = await Complaint.findByPk(id, {
      include: [
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

const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      }
    });
    
    if (!complaint) {
      return res.status(404).json({ 
        success: false, 
        message: 'Complaint not found' 
      });
    }

    if (complaint.status !== 'submitted') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete complaint that is being processed' 
      });
    }

    await complaint.destroy();
    
    res.json({ 
      success: true, 
      message: 'Complaint deleted successfully' 
    });
  } catch (error) {
    console.error('Complaint deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// TRANSACTION HISTORY
const getTransactions = async (req, res) => {
  try {
    const { transaction_type, status, from_date, to_date } = req.query;
    
    let whereClause = { student_id: req.user.id };
    
    if (transaction_type && transaction_type !== 'all') {
      whereClause.transaction_type = transaction_type;
    }
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (from_date && to_date) {
      whereClause.createdAt = {
        [Op.between]: [from_date, to_date]
      };
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'ProcessedBy',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      },
      include: [
        {
          model: User,
          as: 'ProcessedBy',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ATTENDANCE HISTORY
const getMyAttendance = async (req, res) => {
  try {
    const { from_date, to_date, status } = req.query;
    
    let whereClause = { student_id: req.user.id };
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (from_date && to_date) {
      whereClause.date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'MarkedBy',
          attributes: ['id', 'username']
        }
      ],
      order: [['date', 'DESC']]
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Attendance fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// FACILITY USAGE - Complete CRUD
const getFacilities = async (req, res) => {
  try {
    // Create where clause
    let whereClause = { 
      hostel_id: req.user.hostel_id,
      status: 'active'
    };
    
    // Add other query parameters if needed
    
    const facilities = await HostelFacility.findAll({
      where: whereClause,
      include: [
        {
          model: HostelFacilityType,
          // CHANGE THIS LINE: Change to 'HostelFacilityType'
          as: 'HostelFacilityType',  // THIS IS THE IMPORTANT CHANGE
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']]
    });
    
    res.json({ success: true, data: facilities });
  } catch (error) {
    console.error('Facilities fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};



const useFacility = async (req, res) => {
  try {
    const { facility_id, duration_minutes, remarks } = req.body;

    if (!facility_id || !duration_minutes) {
      return res.status(400).json({ 
        success: false, 
        message: 'Facility and duration are required' 
      });
    }

    // First check if facility exists without any conditions
    const facilityExists = await HostelFacility.findByPk(facility_id);
    if (!facilityExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Facility not found' 
      });
    }
    
    // Then verify facility belongs to student's hostel
    const facility = await HostelFacility.findOne({
      where: { 
        id: facility_id,
        hostel_id: req.user.hostel_id,
        status: 'active'
      }
    });

    if (!facility) {
      return res.status(400).json({ 
        success: false, 
        message: 'Facility not available for your hostel' 
      });
    }

    // Calculate cost
    const cost = (facility.cost_per_use * (duration_minutes / 60)) || facility.cost_per_use || 0;

    const facilityUsage = await HostelFacilityRegister.create({
      facility_id,
      student_id: req.user.id,
      duration_minutes,
      cost: cost.toFixed(2),
      remarks
    });

    const usageWithDetails = await HostelFacilityRegister.findByPk(facilityUsage.id, {
      include: [
        {
          model: HostelFacility,
          as: 'facility',
          attributes: ['id', 'name'],
          include: [
            {
              model: HostelFacilityType,
              as: 'HostelFacilityType',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    res.status(201).json({ 
      success: true, 
      data: usageWithDetails,
      message: 'Facility usage recorded successfully'
    });
  } catch (error) {
    console.error('Facility usage error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
const getMyFacilityUsage = async (req, res) => {
  try {
    let whereClause = { student_id: req.user.id };
    
    // Add other query filters
    const { facility_id, from_date, to_date } = req.query;
    
    if (facility_id && facility_id !== 'all') {
      whereClause.facility_id = facility_id;
    }
    
    if (from_date && to_date) {
      whereClause.usage_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const usage = await HostelFacilityRegister.findAll({
      where: whereClause,
      include: [
        {
          model: HostelFacility,
          // CHANGE THIS LINE: Change 'model' to 'HostelFacility'
          as: 'facility',  // THIS IS THE IMPORTANT CHANGE
          attributes: ['id', 'name'],
          include: [
            {
              model: HostelFacilityType,
              // CHANGE THIS LINE: Change to 'HostelFacilityType'
              as: 'HostelFacilityType',  // THIS IS THE IMPORTANT CHANGE
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['usage_date', 'DESC']]
    });

    res.json({ success: true, data: usage });
  } catch (error) {
    console.error('Facility usage fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getFacilityUsageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const usage = await HostelFacilityRegister.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      },
      include: [
        {
          model: HostelFacility,
          as: 'facility',
          attributes: ['id', 'name'],
          include: [
            {
              model: HostelFacilityType,
              as: 'HostelFacilityType',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
    
    if (!usage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Facility usage record not found' 
      });
    }

    res.json({ success: true, data: usage });
  } catch (error) {
    console.error('Facility usage fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateFacilityUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration_minutes, remarks } = req.body;

    const usage = await HostelFacilityRegister.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      }
    });
    
    if (!usage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Facility usage record not found' 
      });
    }

    // Check if usage record is recent (within last 24 hours)
    const timeDiff = new Date() - new Date(usage.usage_date);
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot update usage record older than 24 hours' 
      });
    }

    const updateData = {};
    if (duration_minutes) {
      // Recalculate cost if duration changes
      const facility = await HostelFacility.findByPk(usage.facility_id);
      const newCost = (facility.cost_per_use * (duration_minutes / 60)) || facility.cost_per_use || 0;
      updateData.duration_minutes = duration_minutes;
      updateData.cost = newCost.toFixed(2);
    }
    if (remarks !== undefined) updateData.remarks = remarks;

    await usage.update(updateData);

    const updatedUsage = await HostelFacilityRegister.findByPk(id, {
      include: [
        {
          model: HostelFacility,
          as: 'facility',
          attributes: ['id', 'name'],
          include: [
            {
              model: HostelFacilityType,
              as: 'HostelFacilityType',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    res.json({ 
      success: true, 
      data: updatedUsage,
      message: 'Facility usage updated successfully' 
    });
  } catch (error) {
    console.error('Facility usage update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteFacilityUsage = async (req, res) => {
  try {
    const { id } = req.params;

    const usage = await HostelFacilityRegister.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      }
    });
    
    if (!usage) {
      return res.status(404).json({ 
        success: false, 
        message: 'Facility usage record not found' 
      });
    }

    // Check if usage record is recent (within last 24 hours)
    const timeDiff = new Date() - new Date(usage.usage_date);
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete usage record older than 24 hours' 
      });
    }

    await usage.destroy();
    
    res.json({ 
      success: true, 
      message: 'Facility usage record deleted successfully' 
    });
  } catch (error) {
    console.error('Facility usage deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// MEAL TOKENS - Complete CRUD
const getMyTokens = async (req, res) => {
  try {
    const { meal_type, status, from_date, to_date } = req.query;
    
    let whereClause = { student_id: req.user.id };
    
    if (meal_type && meal_type !== 'all') {
      whereClause.meal_type = meal_type;
    }
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (from_date && to_date) {
      whereClause.token_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    const tokens = await Token.findAll({
      where: whereClause,
      order: [['token_date', 'DESC']]
    });

    res.json({ success: true, data: tokens });
  } catch (error) {
    console.error('Tokens fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getTokenById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const token = await Token.findOne({
      where: { 
        id, 
        student_id: req.user.id 
      }
    });
    
    if (!token) {
      return res.status(404).json({ 
        success: false, 
        message: 'Token not found' 
      });
    }

    res.json({ success: true, data: token });
  } catch (error) {
    console.error('Token fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DASHBOARD STATISTICS
const getDashboardStats = async (req, res) => {
  try {
    const student_id = req.user.id;

    // Get basic counts
    const totalLeaves = await Leave.count({ where: { student_id } });
    const pendingLeaves = await Leave.count({ 
      where: { student_id, status: 'pending' } 
    });
    const totalComplaints = await Complaint.count({ where: { student_id } });
    const pendingComplaints = await Complaint.count({ 
      where: { student_id, status: ['submitted', 'in_progress'] } 
    });
    const totalTransactions = await Transaction.count({ where: { student_id } });
    const facilityUsageCount = await HostelFacilityRegister.count({ where: { student_id } });

    // Get recent activities
    const recentLeaves = await Leave.findAll({
      where: { student_id },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    const recentComplaints = await Complaint.findAll({
      where: { student_id },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get pending bills
    const pendingBills = await MessBill.count({
      where: { student_id, status: 'pending' }
    });

    res.json({
      success: true,
      data: {
        totalLeaves,
        pendingLeaves,
        totalComplaints,
        pendingComplaints,
        totalTransactions,
        facilityUsageCount,
        pendingBills,
        recentLeaves,
        recentComplaints
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  // Profile Management
  getProfile,
  updateProfile,
  
  // Mess Bills Management
  getMessBills,
  getMessBillById,
  getMyMessCharges,
  
  // Leave Management - Complete CRUD
  applyLeave,
  getMyLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
  
  // Complaint Management - Complete CRUD
  createComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  
  // Transaction History
  getTransactions,
  getTransactionById,
  
  // Attendance
  getMyAttendance,
  
  // Facility Usage - Complete CRUD
  getFacilities,
  useFacility,
  getMyFacilityUsage,
  getFacilityUsageById,
  updateFacilityUsage,
  deleteFacilityUsage,
  
  // Meal Tokens
  getMyTokens,
  getTokenById,
  
  // Dashboard
  getDashboardStats
};
