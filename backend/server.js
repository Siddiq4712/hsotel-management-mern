import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { Op } from 'sequelize';

import session from 'express-session';
import passport from './config/passport.js';
import sequelize from './config/database.js';
import { User, Role, initAssociations } from './models/index.js';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import wardenRoutes from './routes/warden.js';
import studentRoutes from './routes/student.js';
import messRoutes from './routes/mess.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import outpassRoutes from './routes/outpass.js';
import parentRoutes from './routes/parent.js';
import chatRoutes from './routes/chat.js';

import { verifyEmailConnection } from './utils/emailUtils.js';

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
      secure: false // set true only in HTTPS
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
app.use('/api/outpass', outpassRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/chat', chatRoutes);

/* =======================
   CREATE DEFAULT ADMIN
======================= */
const createDefaultAdmin = async () => {
  try {
    const requiredRoles = ['Admin', 'Warden', 'Student', 'Mess', 'Parent', 'Security'];
    for (const name of requiredRoles) {
      const existing = await Role.findOne({
        where: { roleName: { [Op.in]: [name, name.toLowerCase()] } }
      });
      if (!existing) {
        await Role.create({ roleName: name, status: 'Active' });
        console.log(`✅ Created '${name}' role`);
      }
    }

    const adminRole = await Role.findOne({
      where: { roleName: { [Op.in]: ['Admin', 'admin'] } }
    });

    const adminExists = await User.findOne({
      where: { roleId: adminRole.roleId }
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await User.create({
        userName: 'admin',
        userMail: 'admin@example.com',
        password: hashedPassword,
        roleId: adminRole.roleId,
        status: 'Active'
      });

      console.log('✅ Default admin created (admin / admin123)');
    }
  } catch (error) {
    console.error('❌ Admin/Roles seeding error:', error);
  }
};

/* =======================
   DATABASE SYNC (FIXED)
======================= */
const PORT = process.env.PORT || 5001;

// Initialize associations FIRST
initAssociations();

sequelize
  .sync()
  //.sync({alter : true})
  .then(async () => {
    console.log('✅ Database synced successfully');

    // Email check (optional)
    try {
      await verifyEmailConnection();
      console.log('📧 Email service connected');
    } catch (e) {
      console.error('📧 Email service check failed');
    }

    await createDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database sync failed:', err);
  });
