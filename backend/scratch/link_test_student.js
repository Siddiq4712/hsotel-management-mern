import sequelize from '../config/database.js';
import { initAssociations, ParentStudent } from '../models/index.js';

const run = async () => {
  try {
    initAssociations();
    
    // Add/Update link
    const [link, created] = await ParentStudent.findOrCreate({
      where: { parent_id: 24243154, student_id: 513 },
      defaults: { parent_id: 24243154, student_id: 513 }
    });

    console.log('Link status:', created ? 'Created new link' : 'Link already existed');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
};

run();
