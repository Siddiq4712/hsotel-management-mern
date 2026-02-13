const Attendance = require('../models/index');
const User = require('../models/index');
const Hostel = require('../models/index');

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = v => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

exports.markGpsAttendance = async (req, res) => {
  const { user_id, latitude, longitude, device_id } = req.body;

  const user = await User.findByPk(user_id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Device binding (student)
  if (!user.device_id) {
    user.device_id = device_id;
    await user.save();
  } else if (user.device_id !== device_id) {
    return res.status(403).json({ message: 'Device mismatch' });
  }

  const hostel = await Hostel.findOne({ where: { is_active: true } });
  const distance = getDistance(
    hostel.latitude,
    hostel.longitude,
    latitude,
    longitude
  );

  if (distance > 100) {
    return res.status(403).json({ message: 'Outside hostel (100m)' });
  }

  const today = new Date().toISOString().slice(0, 10);

  const exists = await Attendance.findOne({
    where: { student_id: user_id, date: today }
  });

  if (exists) {
    return res.status(409).json({ message: 'Already marked today' });
  }

  await Attendance.create({
    student_id: user_id,
    date: today,
    status: 'P',
    marked_by: user_id
  });

  res.json({ message: 'Attendance marked successfully' });
};

exports.getTodaySummary = async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  
  try {
    const totalAttendance = await Attendance.count({
      where: { date: today }
    });
    
    res.json({ 
      date: today,
      total_attendance: totalAttendance,
      message: 'Today\'s attendance summary'
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
