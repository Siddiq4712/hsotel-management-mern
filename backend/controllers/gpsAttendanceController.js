import { Op } from 'sequelize';
import { GPSAttendance, GPSAttendanceSession } from '../models/index.js';
import { getTimeZoneDateString } from '../utils/dateUtils.js';

const getLocalDateString = () => getTimeZoneDateString();

// Helper function remains local to the file
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = v => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const markGpsAttendance = async (req, res) => {
  try {
    const { latitude, longitude, device_id } = req.body;
    const user_id = req.user?.userId || req.user?.id;
    const hostel_id = req.user?.hostel_id;

    if (!user_id) return res.status(401).json({ message: 'User not authenticated' });
    if (!hostel_id) return res.status(400).json({ message: 'Hostel binding missing on your account.' });
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required.' });
    }
    if (!device_id) return res.status(400).json({ message: 'Device ID is required.' });

    const sessionType = String(req.body.session || 'EVENING').toUpperCase();
    const now = new Date();
    const today = getLocalDateString();

    const activeSession = await GPSAttendanceSession.findOne({
      where: {
        hostel_id,
        session: sessionType,
        attendance_date: today,
        is_active: true,
        start_time: { [Op.lte]: now },
        end_time: { [Op.gte]: now }
      },
      order: [['start_time', 'DESC']]
    });

    if (!activeSession) {
      return res.status(404).json({ message: 'No active attendance session' });
    }

    const distance = getDistance(
      activeSession.geofence_lat,
      activeSession.geofence_lng,
      Number(latitude),
      Number(longitude)
    );

    const exists = await GPSAttendance.findOne({
      where: {
        user_id,
        hostel_id,
        attendance_date: today,
        session: sessionType
      }
    });

    const within = distance <= activeSession.geofence_radius_m;

    if (exists) {
      if (within && exists.status !== 'P') {
        exists.status = 'P';
        exists.latitude = Number(latitude);
        exists.longitude = Number(longitude);
        exists.distance = distance;
        exists.marked_at = now;
        exists.device_id = device_id;
        await exists.save();
      }

      const statusMessage =
        exists.status === 'P'
          ? 'Attendance marked present'
          : 'Attendance marked absent';

      return res.json({
        message: statusMessage,
        status: exists.status,
        distance,
        record: exists
      });
    }

    const record = await GPSAttendance.create({
      user_id,
      hostel_id,
      attendance_date: today,
      session: sessionType,
      latitude: Number(latitude),
      longitude: Number(longitude),
      distance,
      status: within ? 'P' : 'A',
      device_id
    });

    const message = within
      ? 'Attendance marked present'
      : 'Outside geofence, marked absent';

    res.json({ message, status: record.status, distance, record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTodaySummary = async (req, res) => {
  const today = getLocalDateString();

  try {
    const totalAttendance = await GPSAttendance.count({
      where: { attendance_date: today }
    });

    res.json({
      date: today,
      total_attendance: totalAttendance,
      message: "Today's GPS attendance summary"
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
