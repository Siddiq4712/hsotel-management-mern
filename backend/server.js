const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { sequelize, User } = require('./models');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const wardenRoutes = require('./routes/warden');
const studentRoutes = require('./routes/student');
const messRoutes = require('./routes/mess');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/warden', wardenRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/mess', messRoutes);

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await User.create({
        username: 'admin',
        email: 'admin@example.com', // Add required email field
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Default admin user created: admin/admin123');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Database sync and server start
const PORT = process.env.PORT || 5000;

// TEMPORARILY use force: true to recreate all tables
sequelize.sync().then(() => {
  console.log('Database synced - All tables recreated');
  createDefaultAdmin();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to sync database:', err);
});
