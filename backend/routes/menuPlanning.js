import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { Hostel } from '../models/index.js';
import { planningHostel, planningMetadata, publishWeeklyPlan, resolvedMeals, savePlanningSettings, overrideDailyMeal, consumeDailyMeal } from '../services/weeklyMenuPlanning.js';

const router = express.Router();
router.use(auth, authorize(['mess', 'warden', 'admin']));
const endpoint = handler => async (req, res) => {
  try { res.json({ success: true, data: await handler(req) }); }
  catch (error) {
    if (!error.status) console.error('[menu-planning]', error);
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Unable to save or load menu planning. Please retry.' });
  }
};
router.get('/hostels', endpoint(req => Hostel.findAll({
  ...(req.user.role === 'admin' ? {} : { where: { id: req.user.hostel_id || 0 } }),
  attributes: ['id', 'name'], order: [['name', 'ASC']]
})));
router.get('/metadata', endpoint(planningMetadata));
router.put('/settings', endpoint(savePlanningSettings));
router.post('/plans', endpoint(publishWeeklyPlan));
router.get('/day/:date', endpoint(async req => resolvedMeals(await planningHostel(req), req.params.date)));
router.put('/day/:date/:slot', endpoint(overrideDailyMeal));
router.post('/day/:date/:slot/consumption', endpoint(consumeDailyMeal));
export default router;
