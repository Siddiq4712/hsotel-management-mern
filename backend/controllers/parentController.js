import {
  User, ParentStudent, Enrollment, HostelRoom, RoomAllotment,
  Attendance, StudentFee, MessBill, Leave, Outpass, Complaint,
  HostelNotice, InAppNotification, Hostel
} from '../models/index.js';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';

// Helper to verify parent-student link
const verifyLink = async (parentId, studentId) => {
  const link = await ParentStudent.findOne({
    where: { parent_id: parentId, student_id: studentId }
  });
  return !!link;
};

export const getLinkedStudents = async (req, res) => {
  try {
    const parentId = req.user.userId;
    const links = await ParentStudent.findAll({
      where: { parent_id: parentId },
      include: [{
        model: User,
        as: 'Student',
        attributes: ['userId', 'userName', 'roll_number', 'profile_picture', 'hostel_id'],
        include: [{ model: Hostel, attributes: ['name'] }]
      }]
    });

    const students = links.map(l => l.Student).filter(Boolean);
    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Get linked students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getStudentDashboard = async (req, res) => {
  try {
    const parentId = req.user.userId;
    const studentId = parseInt(req.params.studentId, 10);

    const isLinked = await verifyLink(parentId, studentId);
    if (!isLinked) {
      return res.status(403).json({ success: false, message: 'Access denied: Student is not linked to this parent account' });
    }

    // Fetch Student Info & Hostel/Enrollment
    const student = await User.findByPk(studentId, {
      attributes: ['userId', 'userName', 'roll_number', 'userMail', 'profile_picture', 'hostel_id'],
      include: [{ model: Hostel, attributes: ['name'] }]
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Room info
    const allotment = await RoomAllotment.findOne({
      where: { student_id: studentId, is_active: true },
      include: [{ model: HostelRoom, attributes: ['room_number', 'floor'] }]
    });

    // Attendance summary (P vs A vs OD)
    const attendanceStats = await Attendance.findAll({
      where: { student_id: studentId },
      attributes: ['status'],
      raw: true
    });

    const attendanceSummary = {
      present: attendanceStats.filter(a => a.status === 'P').length,
      absent: attendanceStats.filter(a => a.status === 'A').length,
      od: attendanceStats.filter(a => a.status === 'OD').length,
      total: attendanceStats.length
    };

    // Hostel Fee Status
    const fees = await StudentFee.findAll({
      where: { student_id: studentId },
      order: [['createdAt', 'DESC']]
    });

    // Mess Bill Status
    const messBills = await MessBill.findAll({
      where: { student_id: studentId },
      order: [['createdAt', 'DESC']]
    });

    // Leave History
    const leaves = await Leave.findAll({
      where: { student_id: studentId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Outpass History
    const outpasses = await Outpass.findAll({
      where: { student_id: studentId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Complaint Status
    const complaints = await Complaint.findAll({
      where: { student_id: studentId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Notices
    const notices = await HostelNotice.findAll({
      where: {
        [Op.or]: [
          { hostel_id: student.hostel_id },
          { hostel_id: null }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        student,
        room: allotment?.HostelRoom || null,
        attendanceSummary,
        fees,
        messBills,
        leaves,
        outpasses,
        complaints,
        notices
      }
    });
  } catch (error) {
    console.error('Get student dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const parentId = req.user.userId;
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ success: false, message: 'Username and email are required' });
    }

    const user = await User.findByPk(parentId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check unique email/username
    const existing = await User.findOne({
      where: {
        [Op.or]: [{ userName: username }, { userMail: email }],
        userId: { [Op.ne]: parentId }
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Username or email already in use' });
    }

    await user.update({
      userName: username,
      userMail: email
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.userId,
        username: user.userName,
        email: user.userMail
      }
    });
  } catch (error) {
    console.error('Update parent profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getParentNotifications = async (req, res) => {
  try {
    const parentId = req.user.userId;
    const notifications = await InAppNotification.findAll({
      where: { user_id: parentId },
      order: [['createdAt', 'DESC']],
      limit: 30
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Get parent notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const parentId = req.user.userId;
    const { id } = req.params;

    const notif = await InAppNotification.findOne({ where: { id, user_id: parentId } });
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notif.update({ status: 'read' });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
