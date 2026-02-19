import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

import session from 'express-session';
import passport from './config/passport.js'; // Added .js
import sequelize from './config/database.js'; // Default export from your converted config
import { User } from './models/index.js'; // Added /index.js

import authRoutes from './routes/auth.js'; // Added .js
import adminRoutes from './routes/admin.js'; // Added .js
import wardenRoutes from './routes/warden.js'; // Added .js
import studentRoutes from './routes/student.js'; // Added .js
import messRoutes from './routes/mess.js'; // Added .js
import { verifyEmailConnection } from './utils/emailUtils.js'; // Added .js
import attendanceRoutes from './routes/attendanceRoutes.js'; // Added .js

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

<<<<<<< HEAD
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
=======
sequelize
  .sync() // 🔥 SAFE: DOES NOT DROP DATA
  .then(async () => {
    console.log('✅ Database synced safely');
    
    // Optional: Verify email connection on startup
    try {
        await verifyEmailConnection();
    } catch (e) {
        console.error("📧 Email service check failed");
    }

    await createDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database sync failed:', err);
  });
>>>>>>> e2af4daeac8831689e7fe329f0c073485304e41a
