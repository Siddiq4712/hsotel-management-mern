import { Outpass, User, Hostel, ParentStudent, InAppNotification, Role } from '../models/index.js';
import { Op } from 'sequelize';
import crypto from 'crypto';

// Helper to send in-app notifications
const sendNotification = async (userId, title, message, type) => {
  try {
    await InAppNotification.create({
      user_id: userId,
      title,
      message,
      type,
      status: 'unread'
    });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};

// Helper to notify all parents linked to a student
const notifyParents = async (studentId, title, message, type) => {
  try {
    const parentLinks = await ParentStudent.findAll({ where: { student_id: studentId } });
    for (const link of parentLinks) {
      await sendNotification(link.parent_id, title, message, type);
    }
  } catch (error) {
    console.error('Failed to notify parents:', error.message);
  }
};

// ==================================================================
// STUDENT FUNCTIONS
// ==================================================================

export const createOutpass = async (req, res) => {
  try {
    const { purpose, destination, from_date, to_date } = req.body;
    const studentId = req.user.userId;
    const hostelId = req.user.hostel_id;

    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'You must be enrolled in a hostel to request an outpass' });
    }

    if (!purpose || !destination || !from_date || !to_date) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if there is an active/pending outpass already
    const existing = await Outpass.findOne({
      where: {
        student_id: studentId,
        status: { [Op.in]: ['pending', 'approved', 'outside'] }
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending, approved, or active outpass request' });
    }

    const outpass = await Outpass.create({
      student_id: studentId,
      hostel_id: hostelId,
      purpose,
      destination,
      from_date,
      to_date,
      status: 'pending'
    });

    // Notify Warden (and student in-app)
    await sendNotification(studentId, 'Outpass Request Submitted', `Your request to leave for ${destination} is pending review.`, 'outpass');

    res.status(201).json({ success: true, data: outpass, message: 'Outpass request submitted successfully' });
  } catch (error) {
    console.error('Create outpass error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyOutpasses = async (req, res) => {
  try {
    const outpasses = await Outpass.findAll({
      where: { student_id: req.user.userId },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: outpasses });
  } catch (error) {
    console.error('Get my outpasses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCurrentOutpass = async (req, res) => {
  try {
    const outpass = await Outpass.findOne({
      where: {
        student_id: req.user.userId,
        status: { [Op.in]: ['pending', 'approved', 'outside'] }
      },
      include: [{ model: User, as: 'Student', attributes: ['userName', 'roll_number'] }]
    });
    res.json({ success: true, data: outpass });
  } catch (error) {
    console.error('Get current outpass error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const cancelOutpass = async (req, res) => {
  try {
    const { id } = req.params;
    const outpass = await Outpass.findOne({ where: { id, student_id: req.user.userId } });

    if (!outpass) {
      return res.status(404).json({ success: false, message: 'Outpass request not found' });
    }

    if (outpass.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending outpass requests can be cancelled' });
    }

    await outpass.update({ status: 'cancelled' });
    res.json({ success: true, message: 'Outpass request cancelled successfully' });
  } catch (error) {
    console.error('Cancel outpass error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================================================================
// WARDEN FUNCTIONS
// ==================================================================

export const getWardenOutpasses = async (req, res) => {
  try {
    const hostelId = req.user.hostel_id;
    const { status, search } = req.query;

    const whereClause = { hostel_id: hostelId };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const studentWhere = {};
    if (search) {
      studentWhere[Op.or] = [
        { userName: { [Op.like]: `%${search}%` } },
        { roll_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const outpasses = await Outpass.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'Student',
        attributes: ['userId', 'userName', 'roll_number', 'profile_picture'],
        where: search ? studentWhere : undefined
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: outpasses });
  } catch (error) {
    console.error('Get warden outpasses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const approveOutpass = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const wardenId = req.user.userId;

    const outpass = await Outpass.findByPk(id, {
      include: [{ model: User, as: 'Student', attributes: ['userId', 'userName'] }]
    });

    if (!outpass) {
      return res.status(404).json({ success: false, message: 'Outpass not found' });
    }

    if (outpass.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Outpass is not in pending status' });
    }

    // Generate secure unique token for QR code
    const qrToken = crypto.randomBytes(32).toString('hex');

    await outpass.update({
      status: 'approved',
      qr_token: qrToken,
      approved_by: wardenId,
      approved_date: new Date(),
      remarks
    });

    // Notify Student
    await sendNotification(outpass.student_id, 'Outpass Request Approved', 'Your outpass request has been approved. You can now present the QR code at the security gate.', 'outpass');

    // Notify Parents
    await notifyParents(outpass.student_id, 'Outpass Request Approved', `The outpass request for student ${outpass.Student?.userName} has been approved by the Warden.`, 'outpass');

    res.json({ success: true, data: outpass, message: 'Outpass request approved successfully' });
  } catch (error) {
    console.error('Approve outpass error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const rejectOutpass = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const wardenId = req.user.userId;

    const outpass = await Outpass.findByPk(id);

    if (!outpass) {
      return res.status(404).json({ success: false, message: 'Outpass not found' });
    }

    if (outpass.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Outpass is not in pending status' });
    }

    await outpass.update({
      status: 'rejected',
      approved_by: wardenId,
      approved_date: new Date(),
      remarks
    });

    // Notify Student
    await sendNotification(outpass.student_id, 'Outpass Request Rejected', `Your outpass request has been rejected. Remarks: ${remarks || 'None'}`, 'outpass');

    // Notify Parents
    await notifyParents(outpass.student_id, 'Outpass Request Rejected', `The outpass request has been rejected. Remarks: ${remarks || 'None'}`, 'outpass');

    res.json({ success: true, data: outpass, message: 'Outpass request rejected' });
  } catch (error) {
    console.error('Reject outpass error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================================================================
// SECURITY FUNCTIONS
// ==================================================================

export const scanOutpassQR = async (req, res) => {
  try {
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({ success: false, message: 'QR Token is required' });
    }

    const outpass = await Outpass.findOne({
      where: { qr_token: qrToken },
      include: [
        {
          model: User,
          as: 'Student',
          attributes: ['userId', 'userName', 'roll_number', 'profile_picture', 'hostel_id'],
          include: [{ model: Hostel, attributes: ['name'] }]
        },
        {
          model: Hostel,
          as: 'Hostel',
          attributes: ['name']
        }
      ]
    });

    if (!outpass) {
      return res.status(400).json({ success: false, message: 'Invalid QR' });
    }

    const now = new Date();

    // Check expiration (if current time is past expected return time + 24 hours or similar, or simply past to_date for validity)
    if (now > new Date(new Date(outpass.to_date).getTime() + 24 * 60 * 60 * 1000)) {
      await outpass.update({ status: 'expired' });
      return res.status(400).json({ success: false, message: 'Expired Outpass', data: outpass });
    }

    if (outpass.status === 'completed' || outpass.status === 'late_return') {
      return res.status(400).json({ success: false, message: 'Already Completed', data: outpass });
    }

    if (outpass.status === 'cancelled' || outpass.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'QR Verification Failed - Request cancelled or rejected', data: outpass });
    }

    if (outpass.status === 'approved') {
      // Record exit
      await outpass.update({
        exit_time: now,
        status: 'outside'
      });

      // Notify parents
      await notifyParents(outpass.student_id, 'Student Exited Hostel', `${outpass.Student?.userName} has checked out of the hostel.`, 'outpass');
      await sendNotification(outpass.student_id, 'Exit Recorded', 'Your exit from the hostel has been recorded.', 'outpass');

      return res.json({
        success: true,
        message: 'Exit Recorded Successfully',
        data: outpass
      });
    }

    if (outpass.status === 'outside') {
      // Record return
      const isLate = now > new Date(outpass.to_date);
      const finalStatus = isLate ? 'late_return' : 'completed';

      await outpass.update({
        return_time: now,
        status: finalStatus
      });

      // Notify parents
      const lateStr = isLate ? ' LATE' : '';
      await notifyParents(outpass.student_id, `Student Returned${lateStr}`, `${outpass.Student?.userName} has returned to the hostel.${isLate ? ' (Late Return)' : ''}`, 'outpass');
      await sendNotification(outpass.student_id, 'Return Recorded', `Your return to the hostel has been recorded.${isLate ? ' (Late Return)' : ''}`, 'outpass');

      return res.json({
        success: true,
        message: 'Return Recorded Successfully',
        data: outpass
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid Outpass Status', data: outpass });
  } catch (error) {
    console.error('Scan QR error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getTodayGateActivity = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const activities = await Outpass.findAll({
      where: {
        [Op.or]: [
          { exit_time: { [Op.gte]: todayStart } },
          { return_time: { [Op.gte]: todayStart } }
        ]
      },
      include: [{ model: User, as: 'Student', attributes: ['userName', 'roll_number', 'profile_picture'] }],
      order: [['updatedAt', 'DESC']]
    });

    res.json({ success: true, data: activities });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getStudentsCurrentlyOutside = async (req, res) => {
  try {
    const students = await Outpass.findAll({
      where: { status: 'outside' },
      include: [{ model: User, as: 'Student', attributes: ['userName', 'roll_number', 'profile_picture'] }],
      order: [['exit_time', 'ASC']]
    });

    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Get students outside error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getRecentScans = async (req, res) => {
  try {
    const scans = await Outpass.findAll({
      where: {
        status: { [Op.in]: ['outside', 'completed', 'late_return'] }
      },
      include: [{ model: User, as: 'Student', attributes: ['userName', 'roll_number', 'profile_picture'] }],
      order: [['updatedAt', 'DESC']],
      limit: 20
    });

    res.json({ success: true, data: scans });
  } catch (error) {
    console.error('Get recent scans error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================================================================
// ADMIN & DASHBOARD FUNCTIONS
// ==================================================================

export const getAllOutpasses = async (req, res) => {
  try {
    const { status, hostel_id, search } = req.query;

    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (hostel_id && hostel_id !== 'all') {
      whereClause.hostel_id = hostel_id;
    }

    const studentWhere = {};
    if (search) {
      studentWhere[Op.or] = [
        { userName: { [Op.like]: `%${search}%` } },
        { roll_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const outpasses = await Outpass.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'Student',
          attributes: ['userId', 'userName', 'roll_number', 'profile_picture'],
          where: search ? studentWhere : undefined
        },
        {
          model: Hostel,
          as: 'Hostel',
          attributes: ['name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: outpasses });
  } catch (error) {
    console.error('Get all outpasses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const toggleParentApproval = async (req, res) => {
  try {
    const { hostelId, parentApprovalRequired } = req.body;

    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel ID is required' });
    }

    const hostel = await Hostel.findByPk(hostelId);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }

    await hostel.update({ parent_approval_required: parentApprovalRequired });

    res.json({ success: true, message: `Parent approval settings updated for hostel ${hostel.name}` });
  } catch (error) {
    console.error('Toggle parent approval error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
