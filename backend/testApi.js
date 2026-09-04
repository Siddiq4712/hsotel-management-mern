import { getDashboardStats } from './controllers/wardenController.js';
import { sequelize } from './models/index.js';

async function test() {
  const req = { user: { hostelId: 1 } };
  const res = {
    status: (code) => { console.log('Status:', code); return res; },
    json: (data) => { console.log('JSON:', JSON.stringify(data).substring(0, 500)); return res; }
  };
  
  try {
    await getDashboardStats(req, res);
  } catch (err) {
    console.error('Crash:', err);
  } finally {
    sequelize.close();
  }
}

test();
