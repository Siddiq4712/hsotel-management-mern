const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const session = require('express-session');
const passport = require('./config/passport');

const { sequelize, User } = require('./models');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const wardenRoutes = require('./routes/warden');
const studentRoutes = require('./routes/student');
const messRoutes = require('./routes/mess');
const { verifyEmailConnection } = require('./utils/emailUtils');
const attendanceRoutes = require('./routes/attendanceRoutes');

const app = express();

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(express.json());

/* =======================
   SESSION & PASSPORT
======================= */
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false // true only if HTTPS
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

/* =======================
   ROUTES
======================= */
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/warden', wardenRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/mess', messRoutes);
app.use('/api/attendance', attendanceRoutes);

/* =======================
   CREATE DEFAULT ADMIN
======================= */
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ where: { role: 'admin' } });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        is_active: true
      });

      console.log('✅ Default admin created (admin / admin123)');
    }
  } catch (error) {
    console.error('❌ Admin creation error:', error);
  }
};

/* =======================
   DATABASE SYNC (SAFE)
======================= */
const PORT = process.env.PORT || 5000;

// TEMPORARILY use force: true to recreate all tables
sequelize.sync({ force: false }).then(() => {
  console.log('Database synced - All tables recreated');
  createDefaultAdmin();

  verifyEmailConnection().then(isConnected => {
  if (isConnected) {
    console.log('✅ Email service is ready');
  } else {
    console.warn('⚠️ Email service is not configured properly. Notifications may not work.');
  }
});
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
