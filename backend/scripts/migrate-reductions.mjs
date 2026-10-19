import sequelize from '../config/database.js';
import { initAssociations, ReductionDay, ReductionDecision, MessBillingSnapshot } from '../models/index.js';
import { ensureReductionSchema } from '../services/reductionSchema.js';
try {
  await sequelize.authenticate();
  await ensureReductionSchema(sequelize);
  initAssociations();
  await ReductionDay.sync();
  await ReductionDecision.sync();
  await MessBillingSnapshot.sync();
  console.log('Reduction schema upgraded additively. Existing attendance, requests, and financial history were preserved.');
} finally { await sequelize.close(); }
