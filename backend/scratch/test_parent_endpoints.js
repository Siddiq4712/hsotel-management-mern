import sequelize from '../config/database.js';
import { initAssociations } from '../models/index.js';
import { getLinkedStudents, getStudentDashboard, getParentNotifications } from '../controllers/parentController.js';

const run = async () => {
  try {
    initAssociations();

    // Mock request for parent (ID: 24243154)
    const req = {
      user: { userId: 24243154 },
      params: { studentId: 513 }
    };

    // Mock response
    const mockRes = () => {
      const res = {};
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.data = data;
        return res;
      };
      return res;
    };

    console.log('--- TESTING getLinkedStudents ---');
    const res1 = mockRes();
    await getLinkedStudents(req, res1);
    console.log('Status:', res1.statusCode || 200);
    console.log('Data:', JSON.stringify(res1.data, null, 2));

    console.log('\n--- TESTING getStudentDashboard ---');
    const res2 = mockRes();
    await getStudentDashboard(req, res2);
    console.log('Status:', res2.statusCode || 200);
    if (res2.statusCode && res2.statusCode !== 200) {
      console.log('Error Data:', res2.data);
    } else {
      console.log('Dashboard Data Keys:', Object.keys(res2.data.data));
      console.log('Student Info:', res2.data.data.student);
      console.log('Room Info:', res2.data.data.room);
      console.log('Attendance Summary:', res2.data.data.attendanceSummary);
    }

    console.log('\n--- TESTING getParentNotifications ---');
    const res3 = mockRes();
    await getParentNotifications(req, res3);
    console.log('Status:', res3.statusCode || 200);
    console.log('Notifications count:', res3.data.data?.length);

  } catch (error) {
    console.error('Error running test:', error);
  } finally {
    await sequelize.close();
  }
};

run();
