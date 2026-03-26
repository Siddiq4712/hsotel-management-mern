import { Op } from 'sequelize';
import { GPSAttendanceSession, GPSAttendance, User, Role } from '../models/index.js';
import { getTimeZoneDateString } from '../utils/dateUtils.js';

const getTodayDate = () => getTimeZoneDateString();

const normalizeSessionType = (value) => {
  const v = String(value || '').trim().toUpperCase();
  if (['MORNING', 'EVENING', 'NIGHT'].includes(v)) return v;
  return 'EVENING';
};

const getStudentRoleIds = async () => {
  const roles = await Role.findAll({
    where: {
      [Op.or]: [
        { roleName: { [Op.like]: 'student' } },
        { roleName: { [Op.like]: 'lapc' } }
      ]
    },
    attributes: ['roleId']
  });

  return roles
    .map((role) => Number(role.roleId))
    .filter((roleId) => Number.isFinite(roleId));
};

const markAbsenteesForSession = async (session) => {
  const studentRoleIds = await getStudentRoleIds();
  if (!studentRoleIds.length) return;

  const students = await User.findAll({
    where: {
      roleId: { [Op.in]: studentRoleIds },
      hostel_id: session.hostel_id,
      status: { [Op.in]: ['Active', 'active'] }
    },
    attributes: ['userId']
  });

  const existingRecords = await GPSAttendance.findAll({
    where: {
      hostel_id: session.hostel_id,
      attendance_date: session.attendance_date,
      session: session.session
    },
    attributes: ['user_id']
  });

  const existingSet = new Set(existingRecords.map((r) => r.user_id));
  const absentees = students
    .filter((s) => !existingSet.has(s.userId))
    .map((s) => ({
      user_id: s.userId,
      hostel_id: session.hostel_id,
      attendance_date: session.attendance_date,
      session: session.session,
      latitude: session.geofence_lat,
      longitude: session.geofence_lng,
      distance: Number(session.geofence_radius_m) + 1,
      status: 'A',
      device_id: 'SYSTEM',
      marked_at: new Date()
    }));

  if (absentees.length) {
    await GPSAttendance.bulkCreate(absentees);
  }
};

const resolveActiveSession = async (hostel_id, sessionType) => {
  const now = new Date();
  const session = await GPSAttendanceSession.findOne({
    where: {
      hostel_id,
      session: sessionType,
      attendance_date: getTodayDate(),
      is_active: true,
      start_time: { [Op.lte]: now },
      end_time: { [Op.gte]: now }
    },
    order: [['start_time', 'DESC']]
  });

  return session;
};

export const startGpsSession = async (req, res) => {
  try {
    const hostel_id = req.user?.hostel_id;
    if (!hostel_id) {
      return res.status(400).json({ message: 'Hostel binding missing on your account.' });
    }

    const sessionType = normalizeSessionType(req.body.session);
    const durationMinutes = Number(req.body.duration_minutes || 30);
    const geofence_lat = Number(req.body.geofence_lat);
    const geofence_lng = Number(req.body.geofence_lng);
    const geofence_radius_m = Number(req.body.geofence_radius_m || 150);

    if (!Number.isFinite(geofence_lat) || !Number.isFinite(geofence_lng)) {
      return res.status(400).json({ message: 'Geofence center (lat/lng) is required.' });
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return res.status(400).json({ message: 'Duration must be greater than 0.' });
    }

    const active = await resolveActiveSession(hostel_id, sessionType);
    if (active) {
      return res.status(409).json({
        message: 'An attendance session is already active.',
        session: active
      });
    }

    const existing = await GPSAttendanceSession.findOne({
      where: {
        hostel_id,
        session: sessionType,
        attendance_date: getTodayDate()
      }
    });

    const now = new Date();
    const end_time = new Date(now.getTime() + durationMinutes * 60 * 1000);

    let session;
    if (existing) {
      // Re-open today's session instead of throwing "already created"
      existing.start_time = now;
      existing.end_time = end_time;
      existing.is_active = true;
      existing.closed_at = null;
      existing.geofence_lat = geofence_lat;
      existing.geofence_lng = geofence_lng;
      existing.geofence_radius_m = geofence_radius_m;
      existing.created_by = req.user?.userId || req.user?.id;
      await existing.save();
      session = existing;
    } else {
      session = await GPSAttendanceSession.create({
        hostel_id,
        attendance_date: getTodayDate(),
        session: sessionType,
        start_time: now,
        end_time,
        is_active: true,
        geofence_lat,
        geofence_lng,
        geofence_radius_m,
        created_by: req.user?.userId || req.user?.id
      });
    }

    return res.json({
      message: 'GPS attendance session started',
      session,
      server_time: now
    });
  } catch (error) {
    console.error('Start GPS session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getActiveGpsSession = async (req, res) => {
  try {
    const hostel_id = req.user?.hostel_id;
    if (!hostel_id) {
      return res.status(400).json({ message: 'Hostel binding missing on your account.' });
    }

    const sessionType = normalizeSessionType(req.query.session);
    const now = new Date();

    const session = await GPSAttendanceSession.findOne({
      where: {
        hostel_id,
        session: sessionType,
        attendance_date: getTodayDate(),
        is_active: true
      },
      order: [['start_time', 'DESC']]
    });

    if (session && now > session.end_time) {
      session.is_active = false;
      session.closed_at = now;
      await session.save();
      await markAbsenteesForSession(session);
    }

    if (!session || now > session.end_time) {
      return res.json({ active: false, session: null, server_time: now });
    }

    return res.json({ active: true, session, server_time: now });
  } catch (error) {
    console.error('Get GPS session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const closeGpsSession = async (req, res) => {
  try {
    const hostel_id = req.user?.hostel_id;
    const session = await GPSAttendanceSession.findByPk(req.params.id);

    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (hostel_id && session.hostel_id !== hostel_id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!session.is_active) {
      return res.json({ message: 'Session already closed', session });
    }

    session.is_active = false;
    session.closed_at = new Date();
    await session.save();

    await markAbsenteesForSession(session);

    return res.json({ message: 'Session closed', session });
  } catch (error) {
    console.error('Close GPS session error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getGpsSessionSummary = async (req, res) => {
  try {
    const hostel_id = req.user?.hostel_id;
    const session = await GPSAttendanceSession.findByPk(req.params.id);

    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (hostel_id && session.hostel_id !== hostel_id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const studentRoleIds = await getStudentRoleIds();
    if (!studentRoleIds.length) {
      return res.json({
        session,
        summary: [],
        server_time: new Date()
      });
    }

    const students = await User.findAll({
      where: {
        roleId: { [Op.in]: studentRoleIds },
        hostel_id: session.hostel_id,
        status: { [Op.in]: ['Active', 'active'] }
      },
      attributes: ['userId', 'userName', 'roll_number']
    });

    const records = await GPSAttendance.findAll({
      where: {
        hostel_id: session.hostel_id,
        attendance_date: session.attendance_date,
        session: session.session
      }
    });

    const recordMap = new Map(records.map((r) => [r.user_id, r]));
    const now = new Date();
    const isClosed = !session.is_active || now > session.end_time;

    const summary = students.map((student) => {
      const record = recordMap.get(student.userId);
      const status = record ? record.status : isClosed ? 'A' : 'PENDING';
      return {
        id: student.userId,
        userName: student.userName,
        roll_number: student.roll_number,
        status,
        marked_at: record?.marked_at || null,
        distance: record?.status === 'P' ? record?.distance ?? null : null
      };
    });

    res.json({
      session,
      summary,
      server_time: now
    });
  } catch (error) {
    console.error('GPS session summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
