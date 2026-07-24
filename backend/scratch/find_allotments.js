import sequelize from '../config/database.js';
import { initAssociations, RoomAllotment, HostelRoom, User } from '../models/index.js';

const run = async () => {
  try {
    initAssociations();
    const activeAllotments = await RoomAllotment.findAll({
      where: { is_active: true },
      include: [{ model: HostelRoom, attributes: ['room_number', 'floor'] }],
      limit: 5
    });

    console.log('Active Allotments found:', activeAllotments.length);
    for (const all of activeAllotments) {
      console.log(`Student ID: ${all.student_id}, Room:`, all.HostelRoom?.room_number);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
};

run();
